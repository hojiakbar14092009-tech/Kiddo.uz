-- 0011: the connected world (Phase 14). The universe's journey (maths →
-- crystal → rocket → Mars → rare seed → Mistake Garden → biology → bloom →
-- Science Lab) writes three new kinds of ledger rows, each checked here:
--  1. world_rules: the finds, garden beds and journey rewards the app has
--     (src/domain/universe/progression/content.ts), with their exact resource
--     and amount, and the earlier step each one needs in the child's ledger:
--     the Mars seed needs the rocket's first level paid, planting needs the
--     seed found, the journey reward needs the seed planted.
--  2. record_resource accepts the reasons 'discovery', 'plant' (spending) and
--     'journey' only for those rows; everything else is as in 0010.
--  3. The city's new buildings (spaceport, mistake-garden, science-lab) with
--     the same prices as every building (the spaceport is a workshop).
-- What the server cannot see: how far the Mars flower grew (the growth comes
-- from science runs on the device) and the Science Lab's own experiment. The
-- reward at the end is one fixed amount, once per child; see
-- docs/architecture/universe.md "Source of truth".
-- Safe to run twice.

-------------------------------------------------------------------------------
-- 1. World rules
-------------------------------------------------------------------------------

create table if not exists public.world_rules (
  reason text not null check (reason in ('discovery', 'plant', 'journey')),
  ref_id text not null check (char_length(ref_id) between 1 and 128),
  resource text not null check (resource in ('crystal', 'seed', 'part', 'scroll', 'key')),
  -- the exact amount: positive for a find or a reward, negative for planting
  amount integer not null check (amount between -5 and 5 and amount <> 0),
  -- the ledger row (any resource) of this child that must exist first
  needs_reason text not null,
  needs_ref text not null,
  primary key (reason, ref_id)
);
alter table public.world_rules enable row level security;
drop policy if exists "everyone reads world rules" on public.world_rules;
create policy "everyone reads world rules" on public.world_rules for select using (true);
revoke insert, update, delete, truncate on public.world_rules from anon, authenticated;

insert into public.world_rules (reason, ref_id, resource, amount, needs_reason, needs_ref) values
  ('discovery', 'mars-seed', 'seed', 1, 'upgrade', 'upgrade|spaceport|1'),
  ('plant', 'plot|mars', 'seed', -1, 'discovery', 'mars-seed'),
  ('journey', 'journey|first-flight', 'crystal', 2, 'plant', 'plot|mars')
on conflict (reason, ref_id) do update set
  resource = excluded.resource, amount = excluded.amount,
  needs_reason = excluded.needs_reason, needs_ref = excluded.needs_ref;

-------------------------------------------------------------------------------
-- 2. record_resource with the world's reasons
-------------------------------------------------------------------------------

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
       'discovery', 'plant', 'journey') then
    raise exception 'bad_reason' using errcode = '22023';
  end if;
  -- Each earning reason pays exactly one kind of resource.
  if (p_reason = 'activity' and p_resource <> 'star')
     or (p_reason in ('three-stars', 'quest') and p_resource <> 'crystal')
     or (p_reason = 'number-3star' and p_resource <> 'part')
     or (p_reason = 'tale' and p_resource <> 'scroll')
     or (p_reason = 'upgrade' and p_resource = 'star') then
    raise exception 'bad_reason' using errcode = '22023';
  end if;
  if p_ref is null or char_length(p_ref) not between 1 and 128 then
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
  if (p_reason in ('upgrade', 'plant') and p_amount >= 0)
     or (p_reason not in ('upgrade', 'plant') and p_amount <= 0) then
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
    if p_amount > v_max or p_amount < -100 then
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
  -- the step the rule names must already be in this child's ledger
  if v_rule.reason is not null and not exists (
    select 1 from public.resource_ledger l
    where l.child_id = p_child and l.reason = v_rule.needs_reason and l.ref_id = v_rule.needs_ref
  ) then
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

-------------------------------------------------------------------------------
-- 3. New buildings
-------------------------------------------------------------------------------

-- src/domain/universe/world.ts: 1/2/3 crystals for levels 1/2/3, 0/10/25
-- stars; the spaceport (a workshop) also 1/2/3 parts.
insert into public.building_levels (building, level, stars_needed)
select b, l, case l when 1 then 0 when 2 then 10 else 25 end
from unnest(array[
  'spaceport', 'mistake-garden', 'science-lab'
]) b, generate_series(1, 3) l
on conflict (building, level) do update set stars_needed = excluded.stars_needed;
insert into public.building_costs (building, level, resource, amount)
select bl.building, bl.level, 'crystal', bl.level from public.building_levels bl
on conflict (building, level, resource) do update set amount = excluded.amount;
insert into public.building_costs (building, level, resource, amount)
select bl.building, bl.level, 'part', bl.level from public.building_levels bl
where bl.building in ('spaceport')
on conflict (building, level, resource) do update set amount = excluded.amount;
