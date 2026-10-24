-- 0009: the coin balance and paid items come from the server ledger
-- (rollout step 5 of docs/architecture/phase-0.md; the "honest limit" of 0005).
--
-- Until now child_state.coins, .outfits and .pets were whatever the device
-- sent: the reward ledger (record_reward, 0005) was an audit trail only. Now:
--   * child_state.coins is always the sum of the child's reward_ledger rows,
--     whatever a client writes (a BEFORE trigger recomputes it, and every new
--     ledger row refreshes it);
--   * an outfit or a pet stays in child_state only when a purchase for it is
--     in the ledger (ref `outfit|<id>|…`, `pet|<id>|…`, as src/store/progressStore
--     writes them) or it was owned before this migration (grandfathered once);
--   * a purchase or a penalty can no longer take the balance below zero, and an
--     outfit or a pet costs its price from the server's list (shop_items, the
--     same as src/features/shop/outfits.ts and PET_PRICE; a unit test compares);
--   * a family that signs up later brings its device balance and items once,
--     through record_opening_balance (capped, known items only).
-- The trigger corrects silently instead of refusing, so an honest device's
-- backup never fails; a modified device can only change its own screen.
-- Safe to run twice.

-------------------------------------------------------------------------------
-- 0. The shop's prices (the opening and purchases below check against them)
-------------------------------------------------------------------------------

-- The shop's price list: an outfit or a pet costs exactly this many coins.
create table if not exists public.shop_items (
  kind text not null check (kind in ('outfit', 'pet')),
  item text not null check (item ~ '^[a-z][a-z0-9-]{0,31}$'),
  price integer not null check (price > 0),
  primary key (kind, item)
);
alter table public.shop_items enable row level security;
drop policy if exists "everyone reads the shop" on public.shop_items;
create policy "everyone reads the shop" on public.shop_items for select using (true);
revoke insert, update, delete, truncate on public.shop_items from anon, authenticated;
insert into public.shop_items (kind, item, price) values
  ('outfit', 'flower', 10), ('outfit', 'bowtie', 12), ('outfit', 'cap', 15),
  ('outfit', 'scarf', 15), ('outfit', 'glasses', 20), ('outfit', 'crown', 40),
  ('pet', 'cat', 75), ('pet', 'parrot', 75), ('pet', 'hamster', 75),
  ('pet', 'guinea-pig', 75), ('pet', 'bunny', 75)
on conflict (kind, item) do update set price = excluded.price;

-------------------------------------------------------------------------------
-- 1. Opening balances: coins earned before the ledger existed are kept
-------------------------------------------------------------------------------

alter table public.reward_ledger drop constraint if exists reward_ledger_reason_check;
alter table public.reward_ledger add constraint reward_ledger_reason_check check (
  -- the same names as RewardReason in src/domain/rewards, plus the one-time
  -- opening balance written by this migration only (record_reward refuses it)
  reason in ('task', 'daily-bonus', 'learn', 'quest', 'achievement', 'pro-gift', 'penalty',
             'purchase', 'admin', 'opening-balance')
);

-- The balance of one child: the sum of its ledger.
create or replace function public.child_coin_balance(p_child text)
returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(l.coins), 0)::integer from public.reward_ledger l where l.child_id = p_child
$$;
revoke all on function public.child_coin_balance(text) from public;
revoke execute on function public.child_coin_balance(text) from anon, authenticated;

-- Items bought before purchases were recorded in the ledger. Written once by
-- this migration; nobody else writes here.
create table if not exists public.grandfathered_items (
  child_id text not null references public.children (id) on delete cascade,
  kind text not null check (kind in ('outfit', 'pet')),
  item text not null check (char_length(item) between 1 and 40),
  primary key (child_id, kind, item)
);
alter table public.grandfathered_items enable row level security;
revoke all on public.grandfathered_items from anon, authenticated;

-- One opening entry per child for what the device showed before the ledger
-- (only the part the ledger does not already explain), and the items owned
-- then. Idempotent: the opening entry has a fixed ref and the items a primary key.
create or replace function public.open_balances()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
  r record;
  v_missing integer;
begin
  for r in select s.child_id, s.parent_id, s.coins, s.outfits, s.pets from public.child_state s loop
    -- items first: the opening entry below refreshes the row, which keeps owned items only
    insert into public.grandfathered_items (child_id, kind, item)
    select r.child_id, 'outfit', o from unnest(r.outfits) o
    where exists (select 1 from public.shop_items si where si.kind = 'outfit' and si.item = o)
    on conflict do nothing;
    insert into public.grandfathered_items (child_id, kind, item)
    select r.child_id, 'pet', p from jsonb_array_elements_text(
      case when jsonb_typeof(r.pets) = 'array' then r.pets else '[]'::jsonb end) p
    where exists (select 1 from public.shop_items si where si.kind = 'pet' and si.item = p)
    on conflict do nothing;
    v_missing := r.coins - public.child_coin_balance(r.child_id);
    if v_missing > 0 then
      insert into public.reward_ledger (child_id, parent_id, coins, reason, ref_id)
      values (r.child_id, r.parent_id, least(v_missing, 10000), 'opening-balance', 'opening')
      on conflict (child_id, reason, ref_id) do nothing;
      if found then v_count := v_count + 1; end if;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.open_balances() from public;
revoke execute on function public.open_balances() from anon, authenticated;

-- The device's state as it was before this migration becomes the opening.
-- (Run before the trigger below exists, so nothing is recomputed yet; the
-- second run finds every opening in place.)
drop trigger if exists child_state_server_authority on public.child_state;
select public.open_balances();

-------------------------------------------------------------------------------
-- 2. child_state: balance and paid items from the ledger
-------------------------------------------------------------------------------

-- Is this item paid for (or grandfathered)?
create or replace function public.owns_item(p_child text, p_kind text, p_item text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reward_ledger l
    where l.child_id = p_child and l.reason = 'purchase'
      and split_part(l.ref_id, '|', 1) = p_kind and split_part(l.ref_id, '|', 2) = p_item
  ) or exists (
    select 1 from public.grandfathered_items g
    where g.child_id = p_child and g.kind = p_kind and g.item = p_item
  )
$$;
revoke all on function public.owns_item(text, text, text) from public;
revoke execute on function public.owns_item(text, text, text) from anon, authenticated;

create or replace function public.child_state_from_ledger()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_slot text;
begin
  new.coins := public.child_coin_balance(new.child_id);
  new.outfits := coalesce(array(
    select distinct o from unnest(coalesce(new.outfits, '{}')) o
    where public.owns_item(new.child_id, 'outfit', o)
  ), '{}');
  -- what the robot wears must be something it owns
  if jsonb_typeof(new.wearing) = 'object' then
    for v_slot in select k from jsonb_object_keys(new.wearing) k loop
      if not (new.wearing ->> v_slot = any (new.outfits)) then
        new.wearing := new.wearing - v_slot;
      end if;
    end loop;
  else
    new.wearing := '{}'::jsonb;
  end if;
  new.pets := coalesce((
    select jsonb_agg(distinct p) from jsonb_array_elements_text(
      case when jsonb_typeof(new.pets) = 'array' then new.pets else '[]'::jsonb end) p
    where public.owns_item(new.child_id, 'pet', p)
  ), '[]'::jsonb);
  if new.pet is not null and not (new.pets ? new.pet) then
    new.pet := null;
  end if;
  return new;
end;
$$;
create trigger child_state_server_authority before insert or update on public.child_state
  for each row execute function public.child_state_from_ledger();

-- A new ledger row (a reward on another device, an admin grant, a purchase)
-- refreshes the stored balance at once.
create or replace function public.reward_ledger_refresh_state()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.child_state set updated_at = now() where child_id = new.child_id;
  return null;
end;
$$;
drop trigger if exists reward_ledger_refresh on public.reward_ledger;
create trigger reward_ledger_refresh after insert on public.reward_ledger
  for each row execute function public.reward_ledger_refresh_state();

-- Bring every stored row in line now.
update public.child_state set updated_at = now();

-------------------------------------------------------------------------------
-- 3. record_reward: no spending below zero, no forged openings
-------------------------------------------------------------------------------

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
  v_price integer;
  -- Coins a child may earn per day from play (tasks, sessions, quests, bonuses,
  -- achievements). PRO gifts, purchases, penalties and admin grants are not capped.
  c_daily_cap constant integer := 500;
begin
  if v_uid is null and not v_service then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  -- 'opening-balance' is not on this list: only migration 0009 writes it.
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

  -- One writer per child at a time: two tabs cannot both slip under the cap
  -- or both spend the same coins, and the idempotency lookup below sees any
  -- row a parallel call committed.
  perform pg_advisory_xact_lock(hashtext('reward:' || p_child));

  -- Seen before: return it (a retried request is not an error).
  select * into v_row from public.reward_ledger l
  where l.child_id = p_child and l.reason = p_reason and l.ref_id = p_ref;
  if found then
    return v_row;
  end if;

  -- An outfit or a pet (ref `outfit|<id>|…`, `pet|<id>|…`): a real item, its
  -- exact price, and only once.
  if p_reason = 'purchase' and split_part(p_ref, '|', 1) in ('outfit', 'pet') then
    v_price := (select si.price from public.shop_items si
                where si.kind = split_part(p_ref, '|', 1) and si.item = split_part(p_ref, '|', 2));
    if v_price is null or p_coins <> -v_price then
      raise exception 'bad_purchase' using errcode = '22023';
    end if;
    if public.owns_item(p_child, split_part(p_ref, '|', 1), split_part(p_ref, '|', 2)) then
      raise exception 'already_owned' using errcode = 'P0001';
    end if;
  end if;

  -- Spending needs the coins: the ledger is the balance.
  if p_reason in ('purchase', 'penalty')
     and public.child_coin_balance(p_child) + p_coins < 0 then
    raise exception 'insufficient_coins' using errcode = 'P0001';
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
revoke execute on function public.record_reward(text, integer, text, text) from anon;
grant execute on function public.record_reward(text, integer, text, text) to authenticated, service_role;

-------------------------------------------------------------------------------
-- 4. A family that signs up later: its device balance and items, once
-------------------------------------------------------------------------------

-- On a family's first sync the device sends each child's coins and owned
-- items. They become the child's opening entry, once: only while the child has
-- no ledger row at all, at most 5000 coins, and only items the shop sells.
-- Returns true when it opened the balance, false when there was nothing to do
-- (already opened, or the child already earned on the server).
create or replace function public.record_opening_balance(
  p_child text,
  p_coins integer,
  p_outfits text[],
  p_pets text[]
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_parent uuid;
  -- a family's savings from a long offline time, not an endless supply
  c_max_coins constant integer := 5000;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  select c.parent_id into v_parent from public.children c where c.id = p_child;
  if v_parent is null then
    raise exception 'no_child' using errcode = '22023';
  end if;
  if v_parent <> v_uid then
    raise exception 'not_your_child' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('reward:' || p_child));
  if exists (select 1 from public.reward_ledger l where l.child_id = p_child) then
    return false;
  end if;

  insert into public.grandfathered_items (child_id, kind, item)
  select p_child, 'outfit', o from unnest(coalesce(p_outfits, '{}')) o
  where exists (select 1 from public.shop_items si where si.kind = 'outfit' and si.item = o)
  on conflict do nothing;
  insert into public.grandfathered_items (child_id, kind, item)
  select p_child, 'pet', p from unnest(coalesce(p_pets, '{}')) p
  where exists (select 1 from public.shop_items si where si.kind = 'pet' and si.item = p)
  on conflict do nothing;

  if coalesce(p_coins, 0) > 0 then
    insert into public.reward_ledger (child_id, parent_id, coins, reason, ref_id, created_by)
    values (p_child, v_parent, least(p_coins, c_max_coins), 'opening-balance', 'opening', v_uid)
    on conflict (child_id, reason, ref_id) do nothing;
  else
    -- nothing to add, but the items above need the stored row brought in line
    update public.child_state set updated_at = now() where child_id = p_child;
  end if;
  return true;
end;
$$;
revoke all on function public.record_opening_balance(text, integer, text[], text[]) from public;
revoke execute on function public.record_opening_balance(text, integer, text[], text[]) from anon;
grant execute on function public.record_opening_balance(text, integer, text[], text[]) to authenticated;
