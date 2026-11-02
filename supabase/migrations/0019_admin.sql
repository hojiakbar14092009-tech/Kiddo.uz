-- Phase 45: admin overhaul (server side).
--
--   1. Promo codes get a use limit (`max_uses`), an end (`expires_at`) and a
--      short admin note. Every path that hands out PRO from a code refuses an
--      inactive, expired or used-up code: redeem_promo_code() (0005), the
--      legacy redeem_promo() wrapper and claim_promo() (0010, the ad gives a
--      code). Rate limits, attempt counting, error texts and return shapes
--      stay as they were; two new results are added (see redeem_promo_code).
--      "Uses" of a code = the accounts that claimed it (promo_claims) or
--      redeemed it (promo_redemptions), each account counted once (a family
--      that claims and then redeems a code is one use, not two).
--      admin_promo_usage() lists the uses per code for the admin panel.
--   2. Ads get an optional schedule (`starts_at`, `ends_at`, a null bound is
--      open). Families see and can start only active ads inside it; admins
--      still read every ad.
--   3. public.voice_reviews: an admin's verdict on one recorded voice line
--      (per language and key). Admins only; anon has no access at all.
--   4. public.admin_audit: who changed what in the small admin tables
--      (promo_codes, ads, app_settings, admins, voice_reviews). Written only by
--      the security definer trigger audit_admin_change(); admins read it,
--      nobody writes it directly. It never holds anything from family tables.
--   5. admin_list() / admin_add(email) / admin_remove(user): admins manage
--      admins (the last admin cannot be removed, nobody removes themselves).
--   6. admin_retention(days): installs of the period, how many were old enough
--      to come back on day 2 / day 7, and how many did (analytics_events, 0016).
--
-- Re-runnable (if not exists / drop … if exists / create or replace).

-------------------------------------------------------------------------------
-- 1. Promo codes: use limit, end date, note
-------------------------------------------------------------------------------

alter table public.promo_codes add column if not exists max_uses integer;
alter table public.promo_codes add column if not exists expires_at timestamptz;
alter table public.promo_codes add column if not exists note text;
alter table public.promo_codes drop constraint if exists promo_codes_max_uses_check;
alter table public.promo_codes add constraint promo_codes_max_uses_check
  check (max_uses between 1 and 100000);
alter table public.promo_codes drop constraint if exists promo_codes_note_check;
alter table public.promo_codes add constraint promo_codes_note_check
  check (char_length(note) <= 80);

-- Counting a code's uses reads both tables by code: keep that an index lookup.
create index if not exists promo_claims_code_idx on public.promo_claims (code);
create index if not exists promo_redemptions_code_idx on public.promo_redemptions (code);

-- How many accounts used a code: claimed it after an ad, or redeemed it (each
-- account once). `p_except`: leave this account out. Internal helper for the
-- functions below; clients cannot call it.
create or replace function public.promo_code_uses(p_code text, p_except uuid default null)
returns bigint
language sql stable security definer set search_path = '' as $$
  select count(*) from (
    select c.user_id from public.promo_claims c where c.code = p_code
    union
    select r.user_id from public.promo_redemptions r where r.code = p_code
  ) u
  where p_except is null or u.user_id <> p_except;
$$;
revoke all on function public.promo_code_uses(text, uuid) from public;
revoke execute on function public.promo_code_uses(text, uuid) from anon, authenticated;

-- Can a code still be handed out right now (active, not ended, not used up)?
-- Internal helper as well.
create or replace function public.promo_code_open(p_code text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.promo_codes p
    where p.code = p_code
      and p.active
      and (p.expires_at is null or p.expires_at > now())
      and (p.max_uses is null or public.promo_code_uses(p.code) < p.max_uses)
  );
$$;
revoke all on function public.promo_code_open(text) from public;
revoke execute on function public.promo_code_open(text) from anon, authenticated;

-- As in 0005, plus the end date and the use limit. Order of the checks:
--   rate_limited → invalid (unknown, not claimed by this account, or inactive;
--   counted as a failed attempt) → used (this account already redeemed it;
--   counted) → expired (past expires_at; not counted, the account holds the
--   code, it is not a guess) → used_up (max_uses accounts already redeemed it;
--   not counted) → lifetime (not counted) → ok.
-- A claim reserves a use (claim_promo hands out a code only while it has
-- room), so normally the claimant can always redeem. used_up is the hard cap
-- on PRO grants: it happens when an admin lowered max_uses after codes were
-- claimed, and then the accounts that redeem first win.
--
-- Returns {"ok": true, "expires_at": "<timestamptz>"} or
--         {"ok": false, "error": "invalid" | "used" | "expired" | "used_up" |
--                                "lifetime" | "rate_limited"}.
create or replace function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(trim(coalesce(p_code, '')));
  v_promo public.promo_codes;
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

  select p.* into v_promo from public.promo_codes p
  where p.code = v_code
    and p.active
    and exists (
      select 1 from public.promo_claims c where c.user_id = v_uid and c.code = v_code
    );
  if v_promo.code is null then
    insert into public.promo_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if exists (
    select 1 from public.promo_redemptions r where r.user_id = v_uid and r.code = v_code
  ) then
    insert into public.promo_attempts (user_id, ok) values (v_uid, false);
    return jsonb_build_object('ok', false, 'error', 'used');
  end if;

  if v_promo.expires_at is not null and v_promo.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  if v_promo.max_uses is not null then
    -- one redeemer of this code at a time, so two families cannot both take the last use
    perform pg_advisory_xact_lock(hashtext('promo-code:' || v_code));
    if (select count(*) from public.promo_redemptions r
        where r.code = v_code and r.user_id <> v_uid) >= v_promo.max_uses then
      return jsonb_build_object('ok', false, 'error', 'used_up');
    end if;
  end if;

  select * into v_sub from public.subscriptions s where s.parent_id = v_uid;
  if found and v_sub.expires_at is null and v_sub.status = 'active' then
    -- Not a guess at a code, so it does not count as a failed attempt.
    return jsonb_build_object('ok', false, 'error', 'lifetime');
  end if;

  v_end := greatest(
    case when v_sub.status = 'active' then coalesce(v_sub.expires_at, now()) else now() end,
    now()
  ) + make_interval(days => v_promo.days);
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
revoke execute on function public.redeem_promo_code(text) from anon;
grant execute on function public.redeem_promo_code(text) to authenticated;

-- The 0004 RPC, unchanged from 0005: a thin wrapper that raises the error text
-- (so it gets every new check above). Still not callable by clients.
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
revoke execute on function public.redeem_promo(text) from anon, authenticated;

-- As in 0010, but hands out only a code that is active, not ended and not
-- used up (else 'no_codes', as before when no code was left).
create or replace function public.claim_promo(p_view uuid)
returns table (code text, days integer)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_view public.ad_views;
  v_duration numeric;
  v_code text;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  if not exists (
    select 1 from auth.users u where u.id = v_uid and u.email_confirmed_at is not null
  ) then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;

  if exists (select 1 from public.promo_claims c where c.user_id = v_uid) then
    raise exception 'already_claimed' using errcode = 'P0001';
  end if;

  select * into v_view from public.ad_views v
  where v.id = p_view and v.user_id = v_uid and v.completed_at is null;
  if not found then raise exception 'no_view' using errcode = '22023'; end if;

  select a.duration_s into v_duration from public.ads a where a.id = v_view.ad_id;
  -- a little slack for network delay, never more than two seconds
  if now() - v_view.started_at < make_interval(secs => greatest(coalesce(v_duration, 0) - 2, 1)) then
    raise exception 'not_finished' using errcode = 'P0001';
  end if;

  select p.code into v_code from public.promo_codes p
  where public.promo_code_open(p.code)
    and not exists (
      select 1 from public.promo_redemptions r where r.user_id = v_uid and r.code = p.code
    )
  order by random()
  limit 1;
  if v_code is null then raise exception 'no_codes' using errcode = 'P0001'; end if;

  -- the last use of a limited code goes to one account only
  perform pg_advisory_xact_lock(hashtext('promo-code:' || v_code));
  if not public.promo_code_open(v_code) then
    raise exception 'no_codes' using errcode = 'P0001';
  end if;

  update public.ad_views set completed_at = now() where id = p_view;
  insert into public.promo_claims (user_id, code) values (v_uid, v_code);
  return query select p.code, p.days from public.promo_codes p where p.code = v_code;
end $$;
revoke all on function public.claim_promo(uuid) from public;
revoke execute on function public.claim_promo(uuid) from anon;
grant execute on function public.claim_promo(uuid) to authenticated;

-- Uses of every code (same counting as above), for the admin panel.
create or replace function public.admin_promo_usage()
returns table (code text, used bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
    select p.code, public.promo_code_uses(p.code)
    from public.promo_codes p
    order by p.created_at, p.code;
end;
$$;
revoke all on function public.admin_promo_usage() from public;
revoke execute on function public.admin_promo_usage() from anon;
grant execute on function public.admin_promo_usage() to authenticated;

-------------------------------------------------------------------------------
-- 2. Ads: optional schedule
-------------------------------------------------------------------------------

alter table public.ads add column if not exists starts_at timestamptz;
alter table public.ads add column if not exists ends_at timestamptz;
alter table public.ads drop constraint if exists ads_schedule_check;
alter table public.ads add constraint ads_schedule_check
  check (starts_at is null or ends_at is null or ends_at > starts_at);

-- Is this ad up right now (active and inside its schedule)? Used by the read
-- policy and by start_ad_view, so both always agree.
create or replace function public.ad_is_live(p_active boolean, p_starts timestamptz, p_ends timestamptz)
returns boolean
language sql stable set search_path = '' as $$
  select coalesce(p_active, false)
    and (p_starts is null or p_starts <= now())
    and (p_ends is null or p_ends > now());
$$;
-- anon evaluates the read policy, so it may call this (it reads no table).
grant execute on function public.ad_is_live(boolean, timestamptz, timestamptz) to anon, authenticated;

drop policy if exists "everyone reads active ads" on public.ads;
create policy "everyone reads active ads" on public.ads
  for select using (public.ad_is_live(active, starts_at, ends_at) or public.is_admin());

-- As in 0010, but only for an ad that is live now.
create or replace function public.start_ad_view(p_ad uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  if not exists (
    select 1 from public.ads a
    where a.id = p_ad and public.ad_is_live(a.active, a.starts_at, a.ends_at)
  ) then
    raise exception 'no_ad' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('ad-view:' || v_uid::text));
  if (select count(*) from public.ad_views v
      where v.user_id = v_uid and v.started_at > now() - interval '1 hour') >= 10
     or (select count(*) from public.ad_views v
         where v.user_id = v_uid and v.started_at > now() - interval '1 day') >= 30 then
    raise exception 'too_many_views' using errcode = 'P0001';
  end if;
  insert into public.ad_views (user_id, ad_id) values (v_uid, p_ad) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.start_ad_view(uuid) from public;
revoke execute on function public.start_ad_view(uuid) from anon;
grant execute on function public.start_ad_view(uuid) to authenticated;

-------------------------------------------------------------------------------
-- 3. Voice reviews (admins only)
-------------------------------------------------------------------------------

create table if not exists public.voice_reviews (
  key text not null check (key ~ '^[a-z0-9/_.-]{1,120}$'),
  language text not null check (language in ('uz', 'ru', 'en')),
  status text not null check (status in ('approved', 'rejected')),
  note text check (char_length(note) <= 200),
  reviewed_by uuid default auth.uid() references auth.users (id) on delete set null,
  reviewed_at timestamptz not null default now(),
  primary key (language, key)
);

-- Who reviewed and when is the server's to say (an upsert keeps them current).
create or replace function public.stamp_voice_review()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.reviewed_by = coalesce(auth.uid(), new.reviewed_by);
  new.reviewed_at = now();
  return new;
end;
$$;
revoke all on function public.stamp_voice_review() from public;
revoke execute on function public.stamp_voice_review() from anon, authenticated;
drop trigger if exists voice_reviews_stamp on public.voice_reviews;
create trigger voice_reviews_stamp before insert or update on public.voice_reviews
  for each row execute function public.stamp_voice_review();

alter table public.voice_reviews enable row level security;
drop policy if exists "admins manage voice reviews" on public.voice_reviews;
create policy "admins manage voice reviews" on public.voice_reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.voice_reviews from anon;
revoke truncate on public.voice_reviews from authenticated;
grant select, insert, update, delete on public.voice_reviews to authenticated;

-------------------------------------------------------------------------------
-- 4. Admin audit log
-------------------------------------------------------------------------------

create table if not exists public.admin_audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  -- the signed-in admin; null for the service role or the SQL editor. No
  -- foreign key on purpose: the history stays when an admin account goes.
  admin_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  target text not null,
  target_key text,
  summary jsonb
);
create index if not exists admin_audit_at_idx on public.admin_audit (at desc);

alter table public.admin_audit enable row level security;
drop policy if exists "admins read audit" on public.admin_audit;
create policy "admins read audit" on public.admin_audit
  for select to authenticated using (public.is_admin());
-- Only the trigger below writes it (it runs as the table owner).
revoke all on public.admin_audit from anon, authenticated;
grant select on public.admin_audit to authenticated;
revoke all on sequence public.admin_audit_id_seq from anon, authenticated;

-- One row per changed row of an admin table. The trigger arguments name the
-- key column(s) (joined with '/' into target_key). summary: the whole new row
-- on insert, only the changed columns' new values on update (an update that
-- changes nothing is not logged), the old row on delete. Only attached to
-- the small admin tables below, never to a family table.
create or replace function public.audit_admin_change()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_key text;
  v_summary jsonb;
  v_admin uuid;
begin
  -- An unreadable JWT setting must never block an admin change: then no admin id.
  begin
    v_admin := auth.uid();
  exception when others then
    v_admin := null;
  end;

  select string_agg(v_row ->> k.name, '/' order by k.ord) into v_key
  from unnest(tg_argv) with ordinality as k(name, ord);

  if tg_op = 'INSERT' then
    v_summary := v_new;
  elsif tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, n.value) into v_summary
    from jsonb_each(v_new) n
    where v_old -> n.key is distinct from n.value;
    if v_summary is null then
      return null;
    end if;
  else
    v_summary := v_old;
  end if;

  insert into public.admin_audit (admin_id, action, target, target_key, summary)
  values (v_admin, lower(tg_op), tg_table_name, v_key, v_summary);
  return null;
end;
$$;
revoke all on function public.audit_admin_change() from public;
revoke execute on function public.audit_admin_change() from anon, authenticated;

drop trigger if exists promo_codes_audit on public.promo_codes;
create trigger promo_codes_audit after insert or update or delete on public.promo_codes
  for each row execute function public.audit_admin_change('code');
drop trigger if exists ads_audit on public.ads;
create trigger ads_audit after insert or update or delete on public.ads
  for each row execute function public.audit_admin_change('id');
drop trigger if exists app_settings_audit on public.app_settings;
create trigger app_settings_audit after insert or update or delete on public.app_settings
  for each row execute function public.audit_admin_change('key');
drop trigger if exists admins_audit on public.admins;
create trigger admins_audit after insert or update or delete on public.admins
  for each row execute function public.audit_admin_change('user_id');
drop trigger if exists voice_reviews_audit on public.voice_reviews;
create trigger voice_reviews_audit after insert or update or delete on public.voice_reviews
  for each row execute function public.audit_admin_change('language', 'key');

-------------------------------------------------------------------------------
-- 5. Admins manage admins
-------------------------------------------------------------------------------

-- public.admins (0003) has user_id and created_at; created_at is "added at".

-- Every admin with their e-mail address.
create or replace function public.admin_list()
returns table (user_id uuid, email text, added_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
    select a.user_id, u.email::text, a.created_at
    from public.admins a
    left join auth.users u on u.id = a.user_id
    order by a.created_at, a.user_id;
end;
$$;

-- Makes an existing account (by e-mail, any case, spaces trimmed) an admin.
-- Idempotent: an admin already stays one. Returns that admin's row.
-- Errors: not_admin, no_such_user.
create or replace function public.admin_add(p_email text)
returns table (user_id uuid, email text, added_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select u.id into v_user from auth.users u
  where lower(u.email) = lower(trim(coalesce(p_email, '')))
  order by u.created_at
  limit 1;
  if v_user is null then
    raise exception 'no_such_user' using errcode = 'P0001';
  end if;
  insert into public.admins (user_id) values (v_user) on conflict do nothing;
  return query
    select a.user_id, u.email::text, a.created_at
    from public.admins a join auth.users u on u.id = a.user_id
    where a.user_id = v_user;
end;
$$;

-- Takes admin rights away. True when a row was removed, false when that
-- account was no admin. Errors: not_admin, last_admin (it is the only admin),
-- not_self (an admin cannot remove themselves; ask another admin).
create or replace function public.admin_remove(p_user uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  -- one admin change at a time: two admins cannot remove each other at once
  perform pg_advisory_xact_lock(hashtext('admins'));
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if not exists (select 1 from public.admins a where a.user_id = p_user) then
    return false;
  end if;
  if (select count(*) from public.admins) <= 1 then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
  if p_user = auth.uid() then
    raise exception 'not_self' using errcode = 'P0001';
  end if;
  delete from public.admins a where a.user_id = p_user;
  return true;
end;
$$;

revoke all on function public.admin_list() from public;
revoke all on function public.admin_add(text) from public;
revoke all on function public.admin_remove(uuid) from public;
revoke execute on function public.admin_list() from anon;
revoke execute on function public.admin_add(text) from anon;
revoke execute on function public.admin_remove(uuid) from anon;
grant execute on function public.admin_list() to authenticated;
grant execute on function public.admin_add(text) to authenticated;
grant execute on function public.admin_remove(uuid) to authenticated;

-------------------------------------------------------------------------------
-- 6. Retention for the KPI tiles
-------------------------------------------------------------------------------

-- admin_analytics_funnel (0016) already returns these counts as rows
-- ('first_opened', 'returned_day2', 'returned_day7'); this gives them as one
-- row with the same cohort: installs first opened in the last p_days days.
-- An install can come back on day 2 only from its second day on (day 7 from its seventh):
-- each return is counted among the installs old enough for it (`eligible_*`), so young
-- installs do not pull the share down.
drop function if exists public.admin_retention(integer);
create or replace function public.admin_retention(p_days integer default 30)
returns table (
  installs bigint,
  eligible_day2 bigint,
  returned_day2 bigint,
  eligible_day7 bigint,
  returned_day7 bigint
)
language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Tashkent')::date;
  since date := (now() at time zone 'Asia/Tashkent')::date - greatest(1, least(coalesce(p_days, 30), 365));
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
    with cohort as (
      select e.install_id, min(e.day) as first_day from public.analytics_events e
      where e.name = 'first_opened' and e.day > since
      group by e.install_id
    ),
    back as (
      select distinct e.install_id, e.name from public.analytics_events e
      where e.name in ('returned_day2', 'returned_day7')
    )
    select
      (select count(*) from cohort),
      (select count(*) from cohort c where c.first_day <= today - 1),
      (select count(*) from cohort c join back b on b.install_id = c.install_id
         where b.name = 'returned_day2' and c.first_day <= today - 1),
      (select count(*) from cohort c where c.first_day <= today - 6),
      (select count(*) from cohort c join back b on b.install_id = c.install_id
         where b.name = 'returned_day7' and c.first_day <= today - 6);
end;
$$;
revoke all on function public.admin_retention(integer) from public, anon;
grant execute on function public.admin_retention(integer) to authenticated;
