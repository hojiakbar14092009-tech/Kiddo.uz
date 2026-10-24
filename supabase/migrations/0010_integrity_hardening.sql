-- 0010: integrity gaps found by the Phase 13 security audit.
--
--  1. Resources: a backdated upload can no longer pay a year of daily caps on
--     demand. An entry up to 30 days late (after the family's account existed)
--     meets the per-day caps; anything older (history from before the account,
--     a tablet offline for months) shares one lifetime budget per child and
--     resource. A quest crystal
--     belongs to its own day (or the day before: yesterday's finished quest can
--     be claimed today; ±1 day for time zones) and to the last year.
--  2. City: an upgrade counts only for a real building, with the full price of
--     that level paid (crystals, workshop parts) and the stars it needs earned.
--     The prices mirror src/domain/universe/world.ts (a unit test compares them).
--  3. Ads and promo codes: at most 10 ad starts an hour and 30 a day per
--     account; a claim needs a confirmed e-mail address; new ads last at least
--     15 s; the ad functions get an empty search_path like the rest.
--  4. A deleted child id cannot be used again (its ledgers, wiped by the
--     cascade, would start over with fresh daily caps), and a family can add
--     at most five new child profiles a day (how many it keeps stays open).
--  5. child_events only for the parent's own children.
--  6. anon keeps read access only on the public tables.
--  7. Audio: a daily limit per account (voice links, TTS), and only texts the
--     provider really speaks count toward the global TTS ceiling.
-- Safe to run twice.

-------------------------------------------------------------------------------
-- 1. Resource history budget and quest days
-------------------------------------------------------------------------------

-- Resources a device may upload from before the family's account existed,
-- over the child's whole life (months of play stay well inside; a year of
-- daily caps does not): stars 1500, crystals 120, parts 20, scrolls 120,
-- seeds 300, keys 60.
create or replace function public.resource_history_budget(p_resource text)
returns integer
language sql immutable set search_path = '' as $$
  select case p_resource
    when 'star' then 1500 when 'crystal' then 120 when 'part' then 20
    when 'scroll' then 120 when 'seed' then 300 else 60 end
$$;

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
-- 2. Building prices on the server
-------------------------------------------------------------------------------

-- One row per (building, level, resource) the upgrade costs, and the stars a
-- level needs. Level 0 is free and open; it has no rows.
create table if not exists public.building_levels (
  building text not null check (building ~ '^[a-z][a-z0-9-]{0,31}$'),
  level integer not null check (level between 1 and 3),
  stars_needed integer not null default 0 check (stars_needed >= 0),
  primary key (building, level)
);
create table if not exists public.building_costs (
  building text not null,
  level integer not null,
  resource text not null check (resource in ('crystal', 'seed', 'part', 'scroll', 'key')),
  amount integer not null check (amount > 0),
  primary key (building, level, resource),
  foreign key (building, level) references public.building_levels (building, level) on delete cascade
);
alter table public.building_levels enable row level security;
alter table public.building_costs enable row level security;
drop policy if exists "everyone reads building levels" on public.building_levels;
create policy "everyone reads building levels" on public.building_levels for select using (true);
drop policy if exists "everyone reads building costs" on public.building_costs;
create policy "everyone reads building costs" on public.building_costs for select using (true);
revoke insert, update, delete, truncate on public.building_levels, public.building_costs
  from anon, authenticated;

-- src/domain/universe/world.ts: every building costs 1/2/3 crystals for
-- levels 1/2/3 and needs 0/10/25 stars; workshops also 1/2/3 parts.
insert into public.building_levels (building, level, stars_needed)
select b, l, case l when 1 then 0 when 2 then 10 else 25 end
from unnest(array[
  'math-land', 'reading-house', 'word-workshop', 'writing-school', 'observatory',
  'story-library', 'garden', 'robot-workshop', 'art-studio', 'friendship-house',
  'dino-park', 'uzbekistan-gate', 'shop', 'museum'
]) b, generate_series(1, 3) l
on conflict (building, level) do update set stars_needed = excluded.stars_needed;
insert into public.building_costs (building, level, resource, amount)
select bl.building, bl.level, 'crystal', bl.level from public.building_levels bl
on conflict (building, level, resource) do update set amount = excluded.amount;
insert into public.building_costs (building, level, resource, amount)
select bl.building, bl.level, 'part', bl.level from public.building_levels bl
where bl.building in ('word-workshop', 'robot-workshop')
on conflict (building, level, resource) do update set amount = excluded.amount;

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
  -- the whole price of this level, resource by resource, spent under its ref
  if exists (
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

-------------------------------------------------------------------------------
-- 3. Ads and promo codes
-------------------------------------------------------------------------------

-- Starts watching an ad; returns the view id the claim must show. At most 10
-- starts an hour and 30 a day per account (a child watches one ad; the
-- limits only stop scripts).
create or replace function public.start_ad_view(p_ad uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_signed_in' using errcode = '28000'; end if;
  if not exists (select 1 from public.ads a where a.id = p_ad and a.active) then
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

-- After the whole ad: hands out one code, once per account, and only to an
-- account with a confirmed e-mail address.
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
  where p.active
    and not exists (
      select 1 from public.promo_redemptions r where r.user_id = v_uid and r.code = p.code
    )
  order by random()
  limit 1;
  if v_code is null then raise exception 'no_codes' using errcode = 'P0001'; end if;

  update public.ad_views set completed_at = now() where id = p_view;
  insert into public.promo_claims (user_id, code) values (v_uid, v_code);
  return query select p.code, p.days from public.promo_codes p where p.code = v_code;
end $$;

-- The code this account already got (to show it again).
create or replace function public.my_promo_claim()
returns table (code text, days integer, claimed_at timestamptz)
language sql security definer set search_path = '' as $$
  select c.code, p.days, c.claimed_at
  from public.promo_claims c join public.promo_codes p on p.code = c.code
  where c.user_id = auth.uid();
$$;

-- A new or changed ad lasts at least 15 s (a one-second "ad" was a free code
-- per account). `not valid`: ads already up keep running until they change.
alter table public.ads drop constraint if exists ads_min_duration;
alter table public.ads add constraint ads_min_duration check (duration_s >= 15) not valid;

revoke all on function public.start_ad_view(uuid) from public;
revoke all on function public.claim_promo(uuid) from public;
revoke all on function public.my_promo_claim() from public;
revoke execute on function public.start_ad_view(uuid) from anon;
revoke execute on function public.claim_promo(uuid) from anon;
revoke execute on function public.my_promo_claim() from anon;
grant execute on function public.start_ad_view(uuid) to authenticated;
grant execute on function public.claim_promo(uuid) to authenticated;
grant execute on function public.my_promo_claim() to authenticated;

-------------------------------------------------------------------------------
-- 4. Child ids are not reused; new profiles are limited per day
-------------------------------------------------------------------------------

-- A removed child leaves only its id, its family and the time (no name, no
-- data): the id cannot come back with fresh ledgers and caps.
create table if not exists public.deleted_children (
  child_id text primary key,
  parent_id uuid not null references auth.users (id) on delete cascade,
  deleted_at timestamptz not null default now()
);
alter table public.deleted_children enable row level security;
revoke all on public.deleted_children from anon, authenticated;

create or replace function public.remember_deleted_child()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- When the whole account is deleted (its children go with it), there is no
  -- family left to remember: the tombstone would point at nobody.
  if exists (select 1 from auth.users u where u.id = old.parent_id) then
    insert into public.deleted_children (child_id, parent_id) values (old.id, old.parent_id)
    on conflict (child_id) do update set deleted_at = now();
  end if;
  return old;
end;
$$;

-- When the server first saw a child profile (the device's own created_at is
-- whatever the device says, so it cannot count new profiles).
alter table public.children add column if not exists registered_at timestamptz;
create or replace function public.stamp_registered_child()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.registered_at := now();
  return new;
end;
$$;
drop trigger if exists children_registered on public.children;
create trigger children_registered before insert on public.children
  for each row execute function public.stamp_registered_child();
create or replace function public.keep_registered_child()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.registered_at := old.registered_at;
  return new;
end;
$$;
drop trigger if exists children_registered_kept on public.children;
create trigger children_registered_kept before update on public.children
  for each row execute function public.keep_registered_child();
drop trigger if exists children_remember_deleted on public.children;
create trigger children_remember_deleted after delete on public.children
  for each row execute function public.remember_deleted_child();

-- Never an id that was deleted before, and at most five new profiles a day
-- (0002 lifted the limit on how many a family keeps; that stays).
create or replace function public.guard_new_child()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.children where id = new.id) then
    return new; -- an upsert of an existing child is an update
  end if;
  if exists (select 1 from public.deleted_children d where d.child_id = new.id) then
    raise exception 'child_id_used' using errcode = 'P0001';
  end if;
  if (select count(*) from public.children c
      where c.parent_id = new.parent_id and c.registered_at > now() - interval '1 day')
     + (select count(*) from public.deleted_children d
        where d.parent_id = new.parent_id and d.deleted_at > now() - interval '1 day') >= 5 then
    raise exception 'too_many_new_children' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists children_guard on public.children;
create trigger children_guard before insert on public.children
  for each row execute function public.guard_new_child();

-------------------------------------------------------------------------------
-- 5. child_events: own children only
-------------------------------------------------------------------------------

drop policy if exists "own child events" on public.child_events;
create policy "own child events" on public.child_events
  for all using (parent_id = auth.uid())
  with check (parent_id = auth.uid() and public.owns_child(child_id));

-------------------------------------------------------------------------------
-- 6. anon reads the public tables, never writes them
-------------------------------------------------------------------------------

revoke insert, update, delete, truncate on public.ads, public.app_settings from anon;

-------------------------------------------------------------------------------
-- 7. Audio limits: per account per day, and only real synthesis counts
--    toward the global TTS ceiling
-------------------------------------------------------------------------------

-- 'synth': one row per text the TTS provider really spoke (a cache hit is
-- not one), so cached sentences no longer use up the global daily ceiling.
alter table public.audio_requests drop constraint if exists audio_requests_kind_check;
alter table public.audio_requests
  add constraint audio_requests_kind_check check (kind in ('voice', 'tts', 'auth', 'ai', 'synth'));

-- The short window (p_limit per p_window_seconds) and, when given, a limit for
-- the last 24 hours, checked together; one row is counted per allowed request.
create or replace function public.audio_rate_ok(
  p_uid uuid,
  p_kind text,
  p_limit integer,
  p_window_seconds integer,
  p_daily_limit integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_used integer;
  v_day integer;
begin
  if p_uid is null then
    raise exception 'bad_user';
  end if;
  if p_kind is null or p_kind not in ('voice', 'tts', 'auth', 'ai', 'synth') then
    raise exception 'bad_kind';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100000 then
    raise exception 'bad_limit';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'bad_window';
  end if;
  if p_daily_limit is not null and (p_daily_limit < 1 or p_daily_limit > 1000000) then
    raise exception 'bad_limit';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('audio_rate:' || p_uid::text || ':' || p_kind, 0)
  );

  delete from public.audio_requests r
  where r.user_id = p_uid and r.at < now() - interval '1 day';
  if pg_catalog.random() < 0.01 then
    delete from public.audio_requests r where r.at < now() - interval '1 day';
  end if;

  select count(*) filter (where r.at > now() - pg_catalog.make_interval(secs => p_window_seconds)),
         count(*)
    into v_used, v_day
  from public.audio_requests r
  where r.user_id = p_uid and r.kind = p_kind;

  if v_used >= p_limit or (p_daily_limit is not null and v_day >= p_daily_limit) then
    return false;
  end if;

  insert into public.audio_requests (user_id, kind) values (p_uid, p_kind);
  return true;
end;
$$;
revoke all on function public.audio_rate_ok(uuid, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.audio_rate_ok(uuid, text, integer, integer, integer) to service_role;

-- The four-argument form stays for callers that only need the short window.
create or replace function public.audio_rate_ok(
  p_uid uuid,
  p_kind text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select public.audio_rate_ok(p_uid, p_kind, p_limit, p_window_seconds, null)
$$;
revoke all on function public.audio_rate_ok(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.audio_rate_ok(uuid, text, integer, integer) to service_role;

create or replace function public.audio_daily_count(p_kind text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_kind is null or p_kind not in ('voice', 'tts', 'auth', 'ai', 'synth') then
    raise exception 'bad_kind';
  end if;
  return (
    select count(*)::integer
    from public.audio_requests r
    where r.kind = p_kind
      and r.at >= pg_catalog.date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
  );
end;
$$;
revoke all on function public.audio_daily_count(text) from public, anon, authenticated;
grant execute on function public.audio_daily_count(text) to service_role;
