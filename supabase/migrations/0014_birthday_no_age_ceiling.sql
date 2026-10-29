-- Phase 24: the birthday gift. A child gets exactly 50 coins and (optionally)
-- one pet once a year in their birthday week, ledger reason 'birthday', ref
-- `birthday|<year>` or `birthday|<year>|<pet>`: one row a year, whatever the
-- pet; the pet in that row is owned (owns_item). The app offers the gift in
-- the birthday week (the birthday and the six days after); the server allows a
-- day before to thirteen days after, for time zones and a claim synced later. And no maximum age
-- (Phase 22): a learner of any age from 3 can be synced. Safe to re-run.

alter table public.children drop constraint if exists children_age_check;
alter table public.children add constraint children_age_check check (age >= 3);

alter table public.reward_ledger drop constraint if exists reward_ledger_reason_check;
alter table public.reward_ledger add constraint reward_ledger_reason_check check (
  reason in ('task', 'daily-bonus', 'learn', 'quest', 'achievement', 'pro-gift', 'penalty',
             'purchase', 'admin', 'opening-balance', 'birthday')
);

-- Is today (Tashkent) in the birthday week of `p_child` for the year in `p_ref`
-- (`birthday|<year>`)? 29 February is the 28th in other years.
create or replace function public.is_birthday_week(p_child text, p_ref text)
returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_born date;
  v_year integer;
  v_day date;
  v_today date := (now() at time zone 'Asia/Tashkent')::date;
begin
  if p_ref is null or p_ref !~ '^birthday\|[0-9]{4}(\|[a-z-]{1,24})?$' then
    return false;
  end if;
  v_year := split_part(p_ref, '|', 2)::integer;
  select c.birth_date into v_born from public.children c where c.id = p_child;
  if v_born is null or v_year <= extract(year from v_born) then
    return false;
  end if;
  begin
    v_day := make_date(v_year, extract(month from v_born)::integer, extract(day from v_born)::integer);
  exception when others then
    v_day := make_date(v_year, 2, 28);
  end;
  return v_today between v_day - 1 and v_day + 13;
end;
$$;
revoke all on function public.is_birthday_week(text, text) from public;

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
       'purchase', 'admin', 'birthday') then
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
  elsif p_reason = 'birthday' then
    -- The birthday gift (Phase 24): exactly 50 coins, once a year, in the
    -- birthday week, for the parent's own child (ref `birthday|<year>`).
    if v_uid is null or v_parent <> v_uid then
      raise exception 'not_your_child' using errcode = '42501';
    end if;
    if p_coins <> 50 then
      raise exception 'out_of_bounds' using errcode = '22023';
    end if;
    if not public.is_birthday_week(p_child, p_ref) then
      raise exception 'not_birthday' using errcode = 'P0001';
    end if;
    -- a pet in the gift must be one the shop has
    if split_part(p_ref, '|', 3) <> '' and not exists (
      select 1 from public.shop_items si where si.kind = 'pet' and si.item = split_part(p_ref, '|', 3)
    ) then
      raise exception 'bad_purchase' using errcode = '22023';
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
  -- One birthday gift a year, whatever pet was asked for the second time.
  if p_reason = 'birthday' then
    select * into v_row from public.reward_ledger l
    where l.child_id = p_child and l.reason = 'birthday'
      and split_part(l.ref_id, '|', 2) = split_part(p_ref, '|', 2);
    if found then
      return v_row;
    end if;
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

-- A pet given as a birthday present is owned, like a bought one.
create or replace function public.owns_item(p_child text, p_kind text, p_item text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reward_ledger l
    where l.child_id = p_child and l.reason = 'purchase'
      and split_part(l.ref_id, '|', 1) = p_kind and split_part(l.ref_id, '|', 2) = p_item
  ) or exists (
    select 1 from public.reward_ledger l
    where l.child_id = p_child and l.reason = 'birthday' and p_kind = 'pet'
      and split_part(l.ref_id, '|', 3) = p_item
  ) or exists (
    select 1 from public.grandfathered_items g
    where g.child_id = p_child and g.kind = p_kind and g.item = p_item
  )
$$;
revoke all on function public.owns_item(text, text, text) from public;
revoke execute on function public.owns_item(text, text, text) from anon, authenticated;
