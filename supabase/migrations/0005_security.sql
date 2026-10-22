-- 0005: security hotfix (Phase 0 findings, rollout steps 1–2).
--
-- Principle: the server owns money and rewards. A parent's browser may read
-- its own rows, but anything that changes value (payments, PRO, coins) is
-- written by the service role, an admin, or a `security definer` function
-- that checks who is calling.
--
-- The migration is written to be re-runnable (if not exists / drop … if
-- exists / create or replace) and backward compatible with the 0001–0004
-- client: no column the app reads is removed, and every RPC keeps its name,
-- arguments, return type and error texts.

-------------------------------------------------------------------------------
-- 0. Helpers
-------------------------------------------------------------------------------

-- Same answer as before, but with an empty search_path: a security definer
-- function must never resolve names through a schema a caller can write to.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Does this child belong to the signed-in parent?
create or replace function public.owns_child(p_child text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.children c where c.id = p_child and c.parent_id = auth.uid()
  );
$$;
revoke all on function public.owns_child(text) from public;
grant execute on function public.owns_child(text) to authenticated;

-------------------------------------------------------------------------------
-- 1. Payments: parents read their own, nobody but the server or an admin writes
-------------------------------------------------------------------------------

-- 0003 let parents insert/update/delete their own payments ("for all"), so
-- the revenue an admin sees could be forged from any browser.
drop policy if exists "own payments" on public.payments;
drop policy if exists "read own payments" on public.payments;
create policy "read own payments" on public.payments
  for select to authenticated using (parent_id = auth.uid());

-- Admins may correct payments by hand; the service role (payment webhooks)
-- bypasses RLS and needs no policy.
drop policy if exists "admins write payments" on public.payments;
create policy "admins write payments" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A real provider's transaction id, unique, so a webhook retried twice
-- cannot record the same payment twice.
alter table public.payments add column if not exists provider_txn_id text;
create unique index if not exists payments_provider_txn_idx
  on public.payments (provider, provider_txn_id) where provider_txn_id is not null;

-------------------------------------------------------------------------------
-- 2. Subscriptions: still read-only for clients; state fields for the server
-------------------------------------------------------------------------------

-- Clients only ever had a select policy (0001) plus the admin policy (0003);
-- that stays. New columns let the payment server end or pause PRO without
-- deleting the row; the client treats any status other than 'active' as Free.
alter table public.subscriptions add column if not exists status text not null default 'active';
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check
  check (status in ('active', 'past_due', 'canceled', 'expired'));
alter table public.subscriptions add column if not exists provider text;
alter table public.subscriptions add column if not exists provider_ref text;

-------------------------------------------------------------------------------
-- 3. Presence: a private table instead of the public Realtime channel
-------------------------------------------------------------------------------

-- 0001–0004 clients announced child names and screens on the Realtime
-- presence channel `kiddo-online`, which anyone holding the public anon key
-- could join. Now each device upserts one row per child: no name (an admin
-- joins to `children`, which only admins and the parent can read), and the
-- server's clock sets `seen_at`.
create table if not exists public.presence_heartbeats (
  child_id text primary key references public.children (id) on delete cascade,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  screen text not null default '' check (char_length(screen) <= 120),
  seen_at timestamptz not null default now()
);
create index if not exists presence_seen_idx on public.presence_heartbeats (seen_at desc);

create or replace function public.touch_seen_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.seen_at = now();
  return new;
end;
$$;
drop trigger if exists presence_touch on public.presence_heartbeats;
create trigger presence_touch before insert or update on public.presence_heartbeats
  for each row execute function public.touch_seen_at();

alter table public.presence_heartbeats enable row level security;
drop policy if exists "own presence" on public.presence_heartbeats;
create policy "own presence" on public.presence_heartbeats
  for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid() and public.owns_child(child_id));
drop policy if exists "admins read presence" on public.presence_heartbeats;
create policy "admins read presence" on public.presence_heartbeats
  for select to authenticated using (public.is_admin());

-------------------------------------------------------------------------------
-- 4. Reward ledger: append-only, written only through record_reward()
-------------------------------------------------------------------------------

-- Every coin change with its reason and an idempotency key (`ref_id`, e.g.
-- the finished session id). Balances still live in child_state for now;
-- the ledger is the audit trail the server can trust and cap.
create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  child_id text not null references public.children (id) on delete cascade,
  parent_id uuid not null references auth.users (id) on delete cascade,
  coins integer not null check (coins between -10000 and 10000),
  reason text not null check (
    -- the same names as RewardReason in src/domain/rewards
    reason in ('task', 'daily-bonus', 'learn', 'quest', 'achievement', 'pro-gift', 'penalty',
               'purchase', 'admin')
  ),
  ref_id text not null check (char_length(ref_id) between 1 and 128),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (child_id, reason, ref_id)
);
create index if not exists reward_ledger_child_idx on public.reward_ledger (child_id, created_at desc);

alter table public.reward_ledger enable row level security;
drop policy if exists "read own rewards" on public.reward_ledger;
create policy "read own rewards" on public.reward_ledger
  for select to authenticated using (parent_id = auth.uid() or public.is_admin());
-- No insert/update/delete policy on purpose, and the privileges are taken
-- away too: the only way in is record_reward() below.
revoke insert, update, delete, truncate on public.reward_ledger from anon, authenticated;

-- Append-only even for a careless admin in the SQL editor. (Deletes stay
-- possible so that removing a child or an account cascades.)
create or replace function public.reward_ledger_no_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'reward_ledger is append-only';
end;
$$;
drop trigger if exists reward_ledger_append_only on public.reward_ledger;
create trigger reward_ledger_append_only before update on public.reward_ledger
  for each row execute function public.reward_ledger_no_update();

-- Records one reward. Idempotent: the same (child, reason, ref) returns the
-- row already stored and changes nothing. Errors (all `raise exception`):
--   not_signed_in, bad_reason, bad_ref, no_child, not_your_child, not_admin,
--   out_of_bounds, bad_sign, daily_cap.
--
-- Who may write what:
--   play rewards (task, learn, quest, daily-bonus, achievement): the child's
--     parent, positive only, capped per day;
--   purchase, penalty: the child's parent, negative only;
--   pro-gift: only the service role (payment webhook) or an admin, positive;
--   admin: only an admin, positive.
--
-- Honest limit: until child_state.coins is derived from this ledger (planned,
-- rollout step 5), the balance the app shows is still written by the device,
-- so the daily cap bounds the *ledger*, not the coins a modified client can
-- show. It is an audit trail and the base for that step, not yet a security
-- boundary for the balance.
create or replace function public.record_reward(
  p_child text,
  p_coins integer,
  p_reason text,
  p_ref text
)
returns public.reward_ledger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  -- The service role has no auth.uid(); it is recognised by its JWT role.
  v_service boolean := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', ''
  ) = 'service_role';
  v_parent uuid;
  v_row public.reward_ledger;
  v_today integer;
  -- Coins a child may earn per day from play (tasks, sessions, quests, bonuses,
  -- achievements). PRO gifts, purchases, penalties and admin grants are not capped.
  c_daily_cap constant integer := 500;
begin
  if v_uid is null and not v_service then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if p_reason is null or p_reason not in
      ('task', 'daily-bonus', 'learn', 'quest', 'achievement', 'pro-gift', 'penalty',
       'purchase', 'admin') then
    raise exception 'bad_reason' using errcode = '22023';
  end if;
  if p_ref is null or char_length(p_ref) not between 1 and 128 then
    raise exception 'bad_ref' using errcode = '22023';
  end if;
  if p_coins is null then
    raise exception 'out_of_bounds' using errcode = '22023';
  end if;

  select c.parent_id into v_parent from public.children c where c.id = p_child;
  if v_parent is null then
    raise exception 'no_child' using errcode = '22023';
  end if;

  -- The sign follows the reason: rewards add, purchases and penalties take away.
  if (p_reason in ('purchase', 'penalty') and p_coins >= 0)
     or (p_reason not in ('purchase', 'penalty') and p_coins <= 0) then
    raise exception 'bad_sign' using errcode = '22023';
  end if;

  if p_reason = 'admin' then
    if not public.is_admin() then
      raise exception 'not_admin' using errcode = '42501';
    end if;
    if p_coins > 10000 then
      raise exception 'out_of_bounds' using errcode = '22023';
    end if;
  elsif p_reason = 'pro-gift' then
    -- Comes with a payment, so only the payment server (or an admin) writes it.
    if not (v_service or public.is_admin()) then
      raise exception 'not_admin' using errcode = '42501';
    end if;
    if p_coins > 1000 then
      raise exception 'out_of_bounds' using errcode = '22023';
    end if;
  else
    if v_uid is null or v_parent <> v_uid then
      raise exception 'not_your_child' using errcode = '42501';
    end if;
    -- A sane size for one entry: a game pays tens of coins, a purchase or a
    -- penalty takes some away.
    if p_coins not between -1000 and 200 then
      raise exception 'out_of_bounds' using errcode = '22023';
    end if;
  end if;

  -- One writer per child at a time: two tabs cannot both slip under the cap,
  -- and the idempotency lookup below sees any row a parallel call committed.
  perform pg_advisory_xact_lock(hashtext('reward:' || p_child));

  -- Seen before: return it (a retried request is not an error).
  select * into v_row from public.reward_ledger l
  where l.child_id = p_child and l.reason = p_reason and l.ref_id = p_ref;
  if found then
    return v_row;
  end if;

  if p_reason in ('task', 'daily-bonus', 'learn', 'quest', 'achievement') then
    select coalesce(sum(l.coins), 0) into v_today
    from public.reward_ledger l
    where l.child_id = p_child
      and l.coins > 0
      and l.reason in ('task', 'daily-bonus', 'learn', 'quest', 'achievement')
      and l.created_at >= (date_trunc('day', now() at time zone 'Asia/Tashkent')
                           at time zone 'Asia/Tashkent');
    if v_today + p_coins > c_daily_cap then
      raise exception 'daily_cap' using errcode = 'P0001';
    end if;
  end if;

  insert into public.reward_ledger (child_id, parent_id, coins, reason, ref_id, created_by)
  values (p_child, v_parent, p_coins, p_reason, p_ref, v_uid)
  on conflict (child_id, reason, ref_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    -- Lost a race with an identical request: return the winner's row.
    select * into v_row from public.reward_ledger l
    where l.child_id = p_child and l.reason = p_reason and l.ref_id = p_ref;
  end if;
  return v_row;
end;
$$;
revoke all on function public.record_reward(text, integer, text, text) from public;
grant execute on function public.record_reward(text, integer, text, text) to authenticated, service_role;

-------------------------------------------------------------------------------
-- 5. Learning data of the new sections (learnStore), one jsonb per child
-------------------------------------------------------------------------------

create table if not exists public.child_learn (
  child_id text primary key references public.children (id) on delete cascade,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- The device keeps at most 600 answers and 200 sessions per child, far
  -- below this; the limit only stops a client from storing anything it likes.
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 524288),
  updated_at timestamptz not null default now()
);
drop trigger if exists child_learn_touch on public.child_learn;
create trigger child_learn_touch before update on public.child_learn
  for each row execute function public.touch_updated_at();

alter table public.child_learn enable row level security;
drop policy if exists "own child learn" on public.child_learn;
create policy "own child learn" on public.child_learn
  for all to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid() and public.owns_child(child_id));
drop policy if exists "admins read child learn" on public.child_learn;
create policy "admins read child learn" on public.child_learn
  for select to authenticated using (public.is_admin());

-------------------------------------------------------------------------------
-- 6. Promo codes: rate limit and retire the published codes
-------------------------------------------------------------------------------

-- KIDDO07 and BOLAJON30 stay active: they are the owner's launch codes. What
-- protects them is server-side: a code can only be redeemed by the account
-- that claimed it after watching an ad to the end (claim_promo, one claim per
-- account, 0004), and failed attempts are rate-limited below. Their
-- text is no longer published in the README; admins can retire or add codes
-- in the admin panel.

-- One row per redeem attempt; failed ones count towards the limit.
create table if not exists public.promo_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists promo_attempts_user_idx on public.promo_attempts (user_id, at desc);
alter table public.promo_attempts enable row level security;
drop policy if exists "admins read promo attempts" on public.promo_attempts;
create policy "admins read promo attempts" on public.promo_attempts
  for select to authenticated using (public.is_admin());
revoke all on public.promo_attempts from anon, authenticated;
grant select on public.promo_attempts to authenticated;

-- Why a second function: a failed attempt has to be *stored*, but
-- `raise exception` rolls back the whole request, so a function that reports
-- failure by raising can never count its own failures. redeem_promo_code()
-- reports failure in its result (and commits the attempt row);
-- redeem_promo() keeps its old contract on top of it.
--
-- A code works only for the account that claimed it (after the whole ad);
-- any other code – even a real one – answers 'invalid', so guessing reveals
-- nothing.
--
-- Returns {"ok": true, "expires_at": "<timestamptz>"} or
--         {"ok": false, "error": "invalid" | "used" | "lifetime" | "rate_limited"}.
create or replace function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_days integer;
  v_sub public.subscriptions;
  v_end timestamptz;
  v_failed integer;
  -- At most this many failed codes per account in the window below.
  c_max_failed constant integer := 5;
  c_window constant interval := interval '10 minutes';
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;

  perform pg_advisory_xact_lock(hashtext('promo:' || v_uid::text));
  select count(*) into v_failed from public.promo_attempts a
  where a.user_id = v_uid and not a.ok and a.at > now() - c_window;
  if v_failed >= c_max_failed then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  select p.days into v_days from public.promo_codes p
  where p.code = v_code
    and p.active
    and exists (
      select 1 from public.promo_claims c where c.user_id = v_uid and c.code = v_code
    );
  if v_days is null then
    insert into public.promo_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if exists (
    select 1 from public.promo_redemptions r where r.user_id = v_uid and r.code = v_code
  ) then
    insert into public.promo_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'used');
  end if;

  select * into v_sub from public.subscriptions s where s.parent_id = v_uid;
  if found and v_sub.expires_at is null and v_sub.status = 'active' then
    -- Not a guess at a code, so it does not count as a failed attempt.
    return jsonb_build_object('ok', false, 'error', 'lifetime');
  end if;

  v_end := greatest(
    case when v_sub.status = 'active' then coalesce(v_sub.expires_at, now()) else now() end,
    now()
  ) + make_interval(days => v_days);
  insert into public.subscriptions (parent_id, plan, source, expires_at, status)
  values (v_uid, coalesce(v_sub.plan, 'monthly'), 'promo', v_end, 'active')
  on conflict (parent_id) do update
    set expires_at = excluded.expires_at, source = 'promo', status = 'active',
        updated_at = now();
  insert into public.promo_redemptions (user_id, code) values (v_uid, v_code);
  insert into public.promo_attempts (user_id, ok) values (v_uid, true);
  return jsonb_build_object('ok', true, 'expires_at', v_end);
end;
$$;
revoke all on function public.redeem_promo_code(text) from public;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- The 0004 RPC. Its failures are reported by raising, which rolls back the
-- attempt row, so it could be called without limit to guess codes. It keeps
-- its signature and error texts (as a thin wrapper) but signed-in clients may
-- no longer call it: the app calls redeem_promo_code() and falls back to
-- redeem_promo() only on a server without this migration.
create or replace function public.redeem_promo(p_code text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_result jsonb := public.redeem_promo_code(p_code);
begin
  if (v_result ->> 'ok')::boolean then
    return (v_result ->> 'expires_at')::timestamptz;
  end if;
  raise exception '%', v_result ->> 'error';
end;
$$;
revoke all on function public.redeem_promo(text) from public;
revoke execute on function public.redeem_promo(text) from authenticated;

-------------------------------------------------------------------------------
-- 7. Size limits on the jsonb columns clients write
-------------------------------------------------------------------------------

-- `not valid`: checked for every new write, existing rows are left alone so
-- the migration cannot fail on old data. Run `validate constraint` later.
alter table public.children drop constraint if exists children_homework_size;
alter table public.children add constraint children_homework_size
  check (homework is null or pg_column_size(homework) < 65536) not valid;

alter table public.child_state drop constraint if exists child_state_json_size;
alter table public.child_state add constraint child_state_json_size check (
  pg_column_size(learned) < 131072
  and pg_column_size(struggles) < 131072
  and pg_column_size(wearing) < 16384
  and pg_column_size(minutes_by_day) < 131072
  and pg_column_size(pets) < 16384
) not valid;

alter table public.task_results drop constraint if exists task_results_details_size;
alter table public.task_results add constraint task_results_details_size
  check (pg_column_size(mistake_details) < 16384) not valid;

alter table public.app_settings drop constraint if exists app_settings_value_size;
alter table public.app_settings add constraint app_settings_value_size
  check (pg_column_size(value) < 65536) not valid;

-------------------------------------------------------------------------------
-- 8. No anonymous access to family data
-------------------------------------------------------------------------------

-- RLS already returns nothing to `anon`, but Supabase grants every new table
-- to anon by default. Taking the grants away means a policy mistake later
-- still cannot expose family rows to someone without an account.
-- (app_settings and ads stay readable: prices and active ads are public.)
revoke all on table
  public.children,
  public.child_state,
  public.task_results,
  public.child_events,
  public.subscriptions,
  public.payments,
  public.admins,
  public.promo_codes,
  public.promo_claims,
  public.promo_redemptions,
  public.ad_views,
  public.presence_heartbeats,
  public.reward_ledger,
  public.child_learn
from anon;

-- Supabase also grants EXECUTE on every new function to anon by default, and
-- `revoke … from public` does not take that grant away. The RPCs check
-- auth.uid() anyway; this makes "signed-in only" visible in the catalog too.
-- (is_admin() stays callable by anon: the public ads/app_settings policies use it.)
revoke execute on function public.owns_child(text) from anon;
revoke execute on function public.record_reward(text, integer, text, text) from anon;
revoke execute on function public.redeem_promo_code(text) from anon;
revoke execute on function public.redeem_promo(text) from anon;
revoke execute on function public.start_ad_view(uuid) from anon;
revoke execute on function public.claim_promo(uuid) from anon;
revoke execute on function public.my_promo_claim() from anon;
