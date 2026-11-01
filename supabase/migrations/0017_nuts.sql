-- Phase 39: one currency for children, yong‘oq (nuts). The reward ledger's
-- coins are the nuts. Crystals, parts and scrolls are no longer paid or spent:
-- what paid them pays nuts (record_reward, reasons learn and quest), a
-- building level costs its building_costs at a fixed rate (crystal 10, part 5,
-- scroll 5: src/domain/universe/nuts.ts), and what a child held is converted
-- once (resource reason 'conversion', reward reason 'conversion', ref
-- `conversion|v1`). Old devices that still send crystals keep working: every
-- earlier rule stays. Re-runnable (create or replace / drop … if exists).

alter table public.reward_ledger drop constraint if exists reward_ledger_reason_check;
alter table public.reward_ledger add constraint reward_ledger_reason_check check (
  reason in ('task', 'daily-bonus', 'learn', 'quest', 'achievement', 'pro-gift', 'penalty',
             'purchase', 'admin', 'opening-balance', 'birthday', 'conversion')
);

-- What one unit of a former resource is worth in nuts (0 for the others).
create or replace function public.nut_rate(p_resource text)
returns integer
language sql immutable set search_path = '' as $$
  select case p_resource when 'crystal' then 10 when 'part' then 5 when 'scroll' then 5 else 0 end
$$;
revoke all on function public.nut_rate(text) from public;
revoke execute on function public.nut_rate(text) from anon, authenticated;

-- A building level's price in nuts (null: no such level).
create or replace function public.building_nut_price(p_building text, p_level integer)
returns integer
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.building_levels bl
                 where bl.building = p_building and bl.level = p_level)
    then coalesce((select sum(bc.amount * public.nut_rate(bc.resource))::integer
                   from public.building_costs bc
                   where bc.building = p_building and bc.level = p_level), 0)
  end
$$;
revoke all on function public.building_nut_price(text, integer) from public;
revoke execute on function public.building_nut_price(text, integer) from anon, authenticated;

-- 1. Resources: the conversion's spends; a find opened by an upgrade paid in nuts.
create or replace function public.record_resource(
  p_child text,
  p_resource text,
  p_amount integer,
  p_reason text,
  p_ref text,
  p_at timestamptz default null
)
returns public.resource_ledger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_parent uuid;
  v_row public.resource_ledger;
  v_today integer;
  v_history integer;
  v_balance integer;
  v_max integer;
  v_cap integer;
  v_at timestamptz := coalesce(p_at, now());
  v_day_start timestamptz;
  v_quest_day date;
  v_earned_day date;
  v_account timestamptz;
  v_rule public.world_rules;
  -- up to this late (and after the account existed) only the per-day caps apply
  c_late constant interval := interval '30 days';
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if p_resource is null or p_resource not in ('star', 'crystal', 'seed', 'part', 'scroll', 'key') then
    raise exception 'bad_resource' using errcode = '22023';
  end if;
  if p_reason is null or p_reason not in
      ('activity', 'three-stars', 'number-3star', 'tale', 'quest', 'upgrade', 'admin',
       'discovery', 'plant', 'journey', 'conversion') then
    raise exception 'bad_reason' using errcode = '22023';
  end if;
  -- Each earning reason pays exactly one kind of resource.
  if (p_reason = 'activity' and p_resource <> 'star')
     or (p_reason in ('three-stars', 'quest') and p_resource <> 'crystal')
     or (p_reason = 'number-3star' and p_resource <> 'part')
     or (p_reason = 'tale' and p_resource <> 'scroll')
     or (p_reason = 'upgrade' and p_resource = 'star')
     or (p_reason = 'conversion' and p_resource not in ('crystal', 'part', 'scroll')) then
    raise exception 'bad_reason' using errcode = '22023';
  end if;
  if p_ref is null or char_length(p_ref) not between 1 and 128 then
    raise exception 'bad_ref' using errcode = '22023';
  end if;
  -- Phase 39: the one-time change of what a child held into nuts
  if p_reason = 'conversion' and p_ref <> 'conversion|v1' then
    raise exception 'bad_ref' using errcode = '22023';
  end if;
  -- The connected world (0011): every find, garden bed and journey reward is a
  -- row of world_rules, with its exact resource and amount.
  if p_reason in ('discovery', 'plant', 'journey') then
    select * into v_rule from public.world_rules r
    where r.reason = p_reason and r.ref_id = p_ref;
    if v_rule.reason is null then
      raise exception 'bad_ref' using errcode = '22023';
    end if;
    if v_rule.resource <> p_resource then
      raise exception 'bad_reason' using errcode = '22023';
    end if;
    if p_amount is distinct from v_rule.amount then
      raise exception 'out_of_bounds' using errcode = '22023';
    end if;
  end if;
  if p_amount is null then
    raise exception 'out_of_bounds' using errcode = '22023';
  end if;
  if v_at > now() + interval '5 minutes' then
    raise exception 'bad_time' using errcode = '22023';
  end if;
  -- Device history before signing in is uploaded with its real days, so each
  -- day keeps its own cap. Further back than a year counts as a year ago.
  v_at := least(greatest(v_at, now() - interval '365 days'), now());

  if p_reason = 'quest' then
    if p_ref !~ '^daily\|[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'bad_ref' using errcode = '22023';
    end if;
    begin
      v_quest_day := substr(p_ref, 7)::date;
    exception when others then
      raise exception 'bad_ref' using errcode = '22023';
    end;
    -- the day's quest: claimed that day or the next (yesterday's finished quest
    -- can be claimed today), with a day of slack either way for the device's
    -- own time zone; never a day still to come, never one invented for 1900
    v_earned_day := (v_at at time zone 'Asia/Tashkent')::date;
    if v_quest_day > (now() at time zone 'Asia/Tashkent')::date + 1
       or v_quest_day < (now() at time zone 'Asia/Tashkent')::date - 365
       or v_quest_day not between v_earned_day - 2 and v_earned_day + 1 then
      raise exception 'bad_ref' using errcode = '22023';
    end if;
  end if;

  select c.parent_id into v_parent from public.children c where c.id = p_child;
  if v_parent is null then
    raise exception 'no_child' using errcode = '22023';
  end if;

  -- Spending takes away; everything else adds.
  if (p_reason in ('upgrade', 'plant', 'conversion') and p_amount >= 0)
     or (p_reason not in ('upgrade', 'plant', 'conversion') and p_amount <= 0) then
    raise exception 'bad_sign' using errcode = '22023';
  end if;

  if p_reason = 'admin' then
    if not public.is_admin() then
      raise exception 'not_admin' using errcode = '42501';
    end if;
    if p_amount > 1000 then
      raise exception 'out_of_bounds' using errcode = '22023';
    end if;
  else
    if v_parent <> v_uid then
      raise exception 'not_your_child' using errcode = '42501';
    end if;
    -- world rules carry their own exact amount (checked above)
    v_max := case
      when v_rule.reason is not null then v_rule.amount
      when p_resource = 'star' then 3 when p_resource = 'seed' then 5 else 1 end;
    -- a conversion takes at most one row's worth (1000) of a resource
    if p_reason = 'conversion' then
      p_amount := greatest(p_amount, -1000);
    end if;
    if p_amount > v_max or p_amount < (case when p_reason = 'conversion' then -1000 else -100 end) then
      raise exception 'out_of_bounds' using errcode = '22023';
    end if;
  end if;

  -- One writer per child at a time (caps and balance checks see every row).
  perform pg_advisory_xact_lock(hashtext('resource:' || p_child));

  select * into v_row from public.resource_ledger l
  where l.child_id = p_child and l.resource = p_resource
    and l.reason = p_reason and l.ref_id = p_ref;
  if found then
    return v_row;
  end if;

  -- a find needs its place open, a bed its seed, a journey its last steps:
  -- the step the rule names must already be in this child's ledger (an
  -- upgrade may also have been paid in nuts: Phase 39)
  if v_rule.reason is not null and not exists (
    select 1 from public.resource_ledger l
    where l.child_id = p_child and l.reason = v_rule.needs_reason and l.ref_id = v_rule.needs_ref
  ) and not (v_rule.needs_reason = 'upgrade' and exists (
    select 1 from public.reward_ledger r
    where r.child_id = p_child and r.reason = 'purchase' and r.ref_id = v_rule.needs_ref
  )) then
    raise exception 'not_unlocked' using errcode = 'P0001';
  end if;

  if p_amount > 0 and p_reason <> 'admin' then
    v_cap := case p_resource
      when 'star' then 150 when 'crystal' then 20 when 'part' then 3
      when 'scroll' then 30 when 'seed' then 50 else 20 end;
    v_day_start := date_trunc('day', v_at at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent';
    select coalesce(sum(l.amount), 0) into v_today
    from public.resource_ledger l
    where l.child_id = p_child
      and l.resource = p_resource
      and l.amount > 0
      and l.reason <> 'admin'
      and l.earned_at >= v_day_start
      and l.earned_at < v_day_start + interval '1 day';
    if v_today + p_amount > v_cap then
      raise exception 'daily_cap' using errcode = 'P0001';
    end if;
    -- Recent entries (up to 30 days late, and after the family's account
    -- existed) only meet the per-day caps above. Anything older (a device's
    -- history from before the account, or a tablet offline for months) shares
    -- one lifetime budget per child and resource.
    select u.created_at into v_account from auth.users u where u.id = v_parent;
    if v_at < greatest(coalesce(v_account, now()), now() - c_late) then
      select coalesce(sum(l.amount), 0) into v_history
      from public.resource_ledger l
      where l.child_id = p_child
        and l.resource = p_resource
        and l.amount > 0
        and l.reason <> 'admin'
        and l.earned_at < greatest(coalesce(v_account, l.created_at), l.created_at - c_late);
      if v_history + p_amount > public.resource_history_budget(p_resource) then
        raise exception 'history_cap' using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- the conversion takes what the server has (a device may have had more):
  -- nothing held, nothing to write
  if p_reason = 'conversion' then
    select coalesce(sum(l.amount), 0) into v_balance
    from public.resource_ledger l
    where l.child_id = p_child and l.resource = p_resource;
    if v_balance <= 0 then
      return v_row;
    end if;
    p_amount := greatest(p_amount, -v_balance);
  end if;

  if p_amount < 0 then
    select coalesce(sum(l.amount), 0) into v_balance
    from public.resource_ledger l
    where l.child_id = p_child and l.resource = p_resource;
    if v_balance + p_amount < 0 then
      raise exception 'insufficient' using errcode = 'P0001';
    end if;
  end if;

  insert into public.resource_ledger
    (child_id, parent_id, resource, amount, reason, ref_id, earned_at, created_by)
  values (p_child, v_parent, p_resource, p_amount, p_reason, p_ref, v_at, v_uid)
  on conflict (child_id, resource, reason, ref_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.resource_ledger l
    where l.child_id = p_child and l.resource = p_resource
      and l.reason = p_reason and l.ref_id = p_ref;
  end if;
  return v_row;
end;
$$;
revoke all on function public.record_resource(text, text, integer, text, text, timestamptz) from public;
revoke execute on function public.record_resource(text, text, integer, text, text, timestamptz) from anon;
grant execute on function public.record_resource(text, text, integer, text, text, timestamptz) to authenticated;

-- 2. Nuts: the conversion's nuts; a building level's exact price; and the day a
-- reward was earned (p_at), so a device that was offline for some days is
-- capped per day earned, not all on the day it syncs.
alter table public.reward_ledger add column if not exists earned_at timestamptz;
update public.reward_ledger set earned_at = created_at where earned_at is null;
alter table public.reward_ledger alter column earned_at set default now();
alter table public.reward_ledger alter column earned_at set not null;

-- The old four-argument form goes: the new one takes the same named arguments
-- (p_at is optional), so older devices and the admin keep working.
drop function if exists public.record_reward(text, integer, text, text);
create or replace function public.record_reward(
  p_child text,
  p_coins integer,
  p_reason text,
  p_ref text,
  p_at timestamptz default null
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
  v_at timestamptz := coalesce(p_at, now());
  v_day_start timestamptz;
  v_account timestamptz;
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
       'purchase', 'admin', 'birthday', 'conversion') then
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
  -- the day it was earned: never ahead of now, at most a week back and never
  -- before the family's account (older play counts as the oldest allowed day)
  if v_at > now() + interval '5 minutes' then
    raise exception 'bad_time' using errcode = '22023';
  end if;
  select u.created_at into v_account from auth.users u where u.id = v_parent;
  v_at := least(greatest(v_at, now() - interval '7 days', coalesce(v_account, now() - interval '7 days')), now());

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
  elsif p_reason = 'conversion' then
    -- Phase 39: the nuts for what the child held, once (ref `conversion|v1`);
    -- the amount is checked below against the conversion's resource rows
    if v_uid is null or v_parent <> v_uid then
      raise exception 'not_your_child' using errcode = '42501';
    end if;
    if p_ref <> 'conversion|v1' then
      raise exception 'out_of_bounds' using errcode = '22023';
    end if;
    p_coins := least(p_coins, 10000);
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

  -- The conversion pays what the converted resources are worth, at most
  -- (crystal 10, part 5, scroll 5: src/domain/universe/nuts.ts).
  if p_reason = 'conversion' then
    select coalesce(sum(-l.amount * public.nut_rate(l.resource)), 0) into v_price
    from public.resource_ledger l
    where l.child_id = p_child and l.reason = 'conversion' and l.ref_id = 'conversion|v1';
    if v_price <= 0 then
      return v_row;
    end if;
    p_coins := least(p_coins, v_price);
  end if;

  -- A building level (ref `upgrade|<building>|<level>`, Phase 39): its exact
  -- price in nuts, the building_costs at the same rate.
  if p_reason = 'purchase' and split_part(p_ref, '|', 1) = 'upgrade' then
    if p_ref !~ '^upgrade\|[a-z][a-z0-9-]{0,31}\|[1-3]$' then
      raise exception 'bad_purchase' using errcode = '22023';
    end if;
    v_price := public.building_nut_price(split_part(p_ref, '|', 2), split_part(p_ref, '|', 3)::integer);
    if v_price is null or p_coins <> -v_price then
      raise exception 'bad_purchase' using errcode = '22023';
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
    v_day_start := date_trunc('day', v_at at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent';
    select coalesce(sum(l.coins), 0) into v_today
    from public.reward_ledger l
    where l.child_id = p_child
      and l.coins > 0
      and l.reason in ('task', 'daily-bonus', 'learn', 'quest', 'achievement')
      and l.earned_at >= v_day_start
      and l.earned_at < v_day_start + interval '1 day';
    if v_today + p_coins > c_daily_cap then
      raise exception 'daily_cap' using errcode = 'P0001';
    end if;
  end if;

  insert into public.reward_ledger (child_id, parent_id, coins, reason, ref_id, created_by, earned_at)
  values (p_child, v_parent, p_coins, p_reason, p_ref, v_uid, v_at)
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
revoke all on function public.record_reward(text, integer, text, text, timestamptz) from public;
revoke execute on function public.record_reward(text, integer, text, text, timestamptz) from anon;
grant execute on function public.record_reward(text, integer, text, text, timestamptz) to authenticated, service_role;

-- 3. A building level paid in nuts.
create or replace function public.record_building_level(
  p_child text,
  p_building text,
  p_level integer
)
returns public.world_state
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_parent uuid;
  v_row public.world_state;
  v_current integer;
  v_stars integer;
  v_needed integer;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if p_building is null or p_building !~ '^[a-z][a-z0-9-]{0,31}$' then
    raise exception 'bad_building' using errcode = '22023';
  end if;
  if p_level is null or p_level not between 1 and 3 then
    raise exception 'bad_level' using errcode = '22023';
  end if;
  select bl.stars_needed into v_needed from public.building_levels bl
  where bl.building = p_building and bl.level = p_level;
  if v_needed is null then
    raise exception 'bad_building' using errcode = '22023';
  end if;
  select c.parent_id into v_parent from public.children c where c.id = p_child;
  if v_parent is null then
    raise exception 'no_child' using errcode = '22023';
  end if;
  if v_parent <> v_uid then
    raise exception 'not_your_child' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext('resource:' || p_child));
  insert into public.world_state (child_id, parent_id) values (p_child, v_parent)
  on conflict (child_id) do nothing;
  select * into v_row from public.world_state w where w.child_id = p_child for update;
  v_current := coalesce((v_row.buildings ->> p_building)::integer, 0);
  if p_level <= v_current then
    return v_row;
  end if;
  if p_level <> v_current + 1 then
    raise exception 'bad_level' using errcode = '22023';
  end if;
  -- the whole price of this level: paid in nuts under its ref (Phase 39), or
  -- (before) resource by resource under the same ref
  if not exists (
    select 1 from public.reward_ledger r
    where r.child_id = p_child and r.reason = 'purchase'
      and r.ref_id = 'upgrade|' || p_building || '|' || p_level
      and -r.coins >= public.building_nut_price(p_building, p_level)
  ) and exists (
    select 1 from public.building_costs bc
    where bc.building = p_building and bc.level = p_level
      and coalesce((
        select -sum(l.amount) from public.resource_ledger l
        where l.child_id = p_child and l.reason = 'upgrade' and l.amount < 0
          and l.resource = bc.resource
          and l.ref_id = 'upgrade|' || p_building || '|' || p_level
      ), 0) < bc.amount
  ) then
    raise exception 'not_paid' using errcode = 'P0001';
  end if;
  -- stars are a measure, never spent: everything earned counts
  select coalesce(sum(l.amount), 0) into v_stars from public.resource_ledger l
  where l.child_id = p_child and l.resource = 'star' and l.amount > 0;
  if v_stars < v_needed then
    raise exception 'not_enough_stars' using errcode = 'P0001';
  end if;
  update public.world_state w
  set buildings = w.buildings || jsonb_build_object(p_building, p_level)
  where w.child_id = p_child
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.record_building_level(text, text, integer) from public;
revoke execute on function public.record_building_level(text, text, integer) from anon;
grant execute on function public.record_building_level(text, text, integer) to authenticated;

-- 4. A first sync's opening: room for the converted crystals and the nuts the
-- replayed upgrade payments take again (0009 allowed 5000).
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
  -- a family's savings from a long offline time, not an endless supply; since
  -- Phase 39 they also hold the converted crystals and the upgrades replayed after it
  c_max_coins constant integer := 20000;
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
