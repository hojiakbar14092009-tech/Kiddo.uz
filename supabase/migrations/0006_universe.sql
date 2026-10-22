-- 0006: Kiddo Universe (Phase 4) – resources, city, medals.
--
-- Mirrors src/domain/universe: every resource change (stars, crystals, seeds,
-- parts, scrolls, keys) is one row of an append-only ledger, written only
-- through record_resource(), which checks who is calling, the sign and size
-- of the change, daily caps (on the day the resource was earned) and, for
-- spending, the balance. The city (world_state) is written only through
-- record_building_level(), which checks the upgrade was paid for in the
-- ledger. Medals (achievements) are readable by the parent; no client
-- writes them yet (a validating RPC comes with the server-side rules).
--
-- Re-runnable (if not exists / drop … if exists / create or replace).

-------------------------------------------------------------------------------
-- 1. Resource ledger
-------------------------------------------------------------------------------

create table if not exists public.resource_ledger (
  id uuid primary key default gen_random_uuid(),
  child_id text not null references public.children (id) on delete cascade,
  parent_id uuid not null references auth.users (id) on delete cascade,
  -- the same names as ResourceId in src/domain/universe/types.ts
  resource text not null check (resource in ('star', 'crystal', 'seed', 'part', 'scroll', 'key')),
  amount integer not null check (amount between -1000 and 1000 and amount <> 0),
  reason text not null check (char_length(reason) between 1 and 32),
  ref_id text not null check (char_length(ref_id) between 1 and 128),
  -- When the device earned it (clamped to the last year); daily caps use this.
  earned_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (child_id, resource, reason, ref_id)
);
alter table public.resource_ledger add column if not exists earned_at timestamptz not null default now();
create index if not exists resource_ledger_child_idx
  on public.resource_ledger (child_id, resource, earned_at desc);

alter table public.resource_ledger enable row level security;
drop policy if exists "read own resources" on public.resource_ledger;
create policy "read own resources" on public.resource_ledger
  for select to authenticated using (parent_id = auth.uid() or public.is_admin());
-- No write policy and no write privileges: the only way in is record_resource().
revoke insert, update, delete, truncate on public.resource_ledger from anon, authenticated;
revoke all on public.resource_ledger from anon;

create or replace function public.resource_ledger_no_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'resource_ledger is append-only';
end;
$$;
drop trigger if exists resource_ledger_append_only on public.resource_ledger;
create trigger resource_ledger_append_only before update on public.resource_ledger
  for each row execute function public.resource_ledger_no_update();

-- Records one resource change. Idempotent: the same (child, resource, reason,
-- ref) returns the stored row and changes nothing. Errors (raise exception):
--   not_signed_in, bad_resource, bad_reason, bad_ref, bad_time, no_child,
--   not_your_child, not_admin, out_of_bounds, bad_sign, daily_cap, insufficient.
--
-- p_at is when the device earned it (entries earned offline or before signing
-- in arrive later). It may not be in the future (5 minutes of clock skew are
-- allowed); older than a year counts as a year ago. Daily caps apply to the
-- Asia/Tashkent day of that time, so a late upload of device history never
-- eats today's cap, and backdating still pays at most one day's cap per day. The device sends entries oldest
-- first and spends after the grants they need, so a spend finds its balance.
-- A quest crystal's ref must be `daily|YYYY-MM-DD` for a day up to today.
--
-- Reasons (src/domain/universe) and what they may carry:
--   activity      star    +1..3   (improvement over the best of an activity)
--   three-stars   crystal +1      (an activity reached 3 stars the first time)
--   number-3star  part    +1      (a number activity at 3 stars, once a day)
--   tale          scroll  +1      (a tale read the first time)
--   quest         crystal +1      (the daily quest claimed; ref daily|<day>)
--   upgrade       any but star, negative (a building upgrade), within the balance
--   admin         any, positive, admins only
-- Daily caps (Asia/Tashkent day) for what a parent's device may add:
--   star 150, crystal 20, part 3, scroll 30, seed 50, key 20.
drop function if exists public.record_resource(text, text, integer, text, text);
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
  v_balance integer;
  v_max integer;
  v_cap integer;
  v_at timestamptz := coalesce(p_at, now());
  v_day_start timestamptz;
  v_quest_day date;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if p_resource is null or p_resource not in ('star', 'crystal', 'seed', 'part', 'scroll', 'key') then
    raise exception 'bad_resource' using errcode = '22023';
  end if;
  if p_reason is null or p_reason not in
      ('activity', 'three-stars', 'number-3star', 'tale', 'quest', 'upgrade', 'admin') then
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
  if p_reason = 'quest' then
    if p_ref !~ '^daily\|[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'bad_ref' using errcode = '22023';
    end if;
    begin
      v_quest_day := substr(p_ref, 7)::date;
    exception when others then
      raise exception 'bad_ref' using errcode = '22023';
    end;
    if v_quest_day > (now() at time zone 'Asia/Tashkent')::date then
      raise exception 'bad_ref' using errcode = '22023';
    end if;
  end if;
  if p_amount is null then
    raise exception 'out_of_bounds' using errcode = '22023';
  end if;
  if v_at > now() + interval '5 minutes' then
    raise exception 'bad_time' using errcode = '22023';
  end if;
  -- Device history before signing in is uploaded once with its real days, so
  -- each day keeps its own cap. Further back than a year counts as a year ago.
  v_at := least(greatest(v_at, now() - interval '365 days'), now());

  select c.parent_id into v_parent from public.children c where c.id = p_child;
  if v_parent is null then
    raise exception 'no_child' using errcode = '22023';
  end if;

  -- Spending takes away; everything else adds.
  if (p_reason = 'upgrade' and p_amount >= 0) or (p_reason <> 'upgrade' and p_amount <= 0) then
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
    v_max := case p_resource when 'star' then 3 when 'seed' then 5 else 1 end;
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
-- 2. The city: building levels per child
-------------------------------------------------------------------------------

create table if not exists public.world_state (
  child_id text primary key references public.children (id) on delete cascade,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- { "<building id>": level }; a handful of keys, the limit only stops abuse.
  buildings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(buildings) = 'object' and pg_column_size(buildings) < 8192),
  updated_at timestamptz not null default now()
);
drop trigger if exists world_state_touch on public.world_state;
create trigger world_state_touch before update on public.world_state
  for each row execute function public.touch_updated_at();

alter table public.world_state enable row level security;
drop policy if exists "own world state" on public.world_state;
drop policy if exists "read own world state" on public.world_state;
create policy "read own world state" on public.world_state
  for select to authenticated using (parent_id = auth.uid() or public.is_admin());
drop policy if exists "admins read world state" on public.world_state;
-- Read-only for clients: levels change only through record_building_level().
revoke insert, update, delete, truncate on public.world_state from anon, authenticated;
revoke all on public.world_state from anon;

-- Raises a building of the parent's child to p_level, only when the ledger
-- holds the upgrade's payment (reason 'upgrade', ref `upgrade|<id>|<level>`)
-- and the level is the next one. Idempotent: an equal or lower level returns
-- the current state. Errors: not_signed_in, bad_building, bad_level, no_child,
-- not_your_child, not_paid.
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
  if not exists (
    select 1 from public.resource_ledger l
    where l.child_id = p_child and l.reason = 'upgrade' and l.amount < 0
      and l.ref_id = 'upgrade|' || p_building || '|' || p_level
  ) then
    raise exception 'not_paid' using errcode = 'P0001';
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

-------------------------------------------------------------------------------
-- 3. Medals: one row per tier reached, append-only
-------------------------------------------------------------------------------

create table if not exists public.achievements (
  child_id text not null references public.children (id) on delete cascade,
  achievement_id text not null check (char_length(achievement_id) between 1 and 64),
  tier text not null check (tier in ('bronze', 'silver', 'gold')),
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reached_at timestamptz not null default now(),
  primary key (child_id, achievement_id, tier)
);

alter table public.achievements enable row level security;
drop policy if exists "read own achievements" on public.achievements;
create policy "read own achievements" on public.achievements
  for select to authenticated using (parent_id = auth.uid() or public.is_admin());
-- Read-only for clients: nothing on the server validates a medal against the
-- ledger yet, so a parent's device may not write one (it would look
-- authoritative). The service role / a later validating RPC will write them.
drop policy if exists "add own achievements" on public.achievements;
revoke insert, update, delete, truncate on public.achievements from anon, authenticated;
revoke all on public.achievements from anon;
