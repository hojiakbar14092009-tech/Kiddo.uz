-- Phase 53: scale (docs/architecture/scale-53.md).
-- Re-runnable (if not exists / create or replace / drop … if exists).
--
-- 1. Indexes for every foreign key (deleting a family and RLS filters by parent_id).
-- 2. RLS policies read auth.uid() and is_admin() once per query, not once per row.
-- 3. analytics_installs: one row per install, kept by add_analytics_events, so the
--    admin funnel and retention never scan the event table.
-- 4. Materialized views for the admin's exits and revenue, refreshed by pg_cron
--    (and by the admin functions themselves when older than 15 minutes).
-- 5. A job queue (jobs) drained by the `worker` Edge Function.
-- 6. Analytics only through the `analytics` Edge Function, which limits each IP.
-- 7. pg_cron schedules, only where pg_cron is available (Supabase), never locally.

-- 1. Foreign key indexes ------------------------------------------------------
create index if not exists child_state_parent_idx on public.child_state (parent_id);
create index if not exists task_results_parent_idx on public.task_results (parent_id);
create index if not exists child_events_parent_idx on public.child_events (parent_id);
create index if not exists payments_parent_idx on public.payments (parent_id);
create index if not exists ad_views_user_idx on public.ad_views (user_id);
create index if not exists ad_views_ad_idx on public.ad_views (ad_id);
create index if not exists presence_heartbeats_parent_idx on public.presence_heartbeats (parent_id);
create index if not exists reward_ledger_parent_idx on public.reward_ledger (parent_id);
create index if not exists child_learn_parent_idx on public.child_learn (parent_id);
create index if not exists resource_ledger_parent_idx on public.resource_ledger (parent_id);
create index if not exists world_state_parent_idx on public.world_state (parent_id);
create index if not exists achievements_parent_idx on public.achievements (parent_id);
create index if not exists ai_consent_parent_idx on public.ai_consent (parent_id);
create index if not exists deleted_children_parent_idx on public.deleted_children (parent_id);
create index if not exists voice_reviews_reviewed_by_idx on public.voice_reviews (reviewed_by);
-- the restore after a new install pages a child's results newest first
create index if not exists task_results_child_finished_idx
  on public.task_results (child_id, finished_at desc);

-- 2. RLS: auth.uid() and is_admin() as an init plan -----------------------------
-- `parent_id = auth.uid()` calls the function for every row it looks at;
-- `parent_id = (select auth.uid())` once per query (Supabase's advisor lint
-- auth_rls_initplan). Same meaning. A wrapped call is left alone on a re-run.
do $$
declare
  p record;
  q text;
  c text;
  stmt text;
begin
  perform set_config('search_path', 'public', true);
  for p in
    select tablename, policyname, qual, with_check from pg_policies where schemaname = 'public'
  loop
    q := p.qual;
    c := p.with_check;
    q := regexp_replace(q, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    q := regexp_replace(q, '(?<!SELECT )(?<![[:alnum:]_.])is_admin\(\)', '(select public.is_admin())', 'g');
    c := regexp_replace(c, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    c := regexp_replace(c, '(?<!SELECT )(?<![[:alnum:]_.])is_admin\(\)', '(select public.is_admin())', 'g');
    if q is distinct from p.qual or c is distinct from p.with_check then
      stmt := format('alter policy %I on public.%I', p.policyname, p.tablename);
      if q is not null then stmt := stmt || format(' using (%s)', q); end if;
      if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
      execute stmt;
    end if;
  end loop;
end $$;

-- 3. One row per install for the funnel and retention ------------------------
create table if not exists public.analytics_installs (
  install_id text primary key,
  first_day date,
  last_day date not null,
  reached text[] not null default '{}'
);
create index if not exists analytics_installs_first_day on public.analytics_installs (first_day);
create index if not exists analytics_installs_last_day on public.analytics_installs (last_day);
alter table public.analytics_installs enable row level security;
revoke all on public.analytics_installs from anon, authenticated;

-- what the events of earlier phases already hold; a re-run only adds (events older than
-- 180 days are gone by then, so what an install already has is kept, never replaced)
insert into public.analytics_installs as i (install_id, first_day, last_day, reached)
  select e.install_id, min(e.day) filter (where e.name = 'first_opened'), max(e.day),
         array_agg(distinct e.name order by e.name)
  from public.analytics_events e
  group by e.install_id
on conflict (install_id) do update set
  first_day = least(i.first_day, excluded.first_day),
  last_day = greatest(i.last_day, excluded.last_day),
  reached = (select array_agg(distinct n order by n) from unnest(i.reached || excluded.reached) n);

-- 0020's function, now also keeping analytics_installs. Called only by the
-- `analytics` Edge Function (service role), which limits each IP first.
create or replace function public.add_analytics_events(p_events jsonb)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Tashkent')::date;
  -- about 10 000 children a day sending ~20 events each; raise it with the audience
  c_daily_cap constant integer := 200000;
  install text;
  room integer;
  added integer;
  v_names text[];
  v_first date;
  v_last date;
begin
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 100 then
    raise exception 'bad_batch';
  end if;
  if (select count(distinct e ->> 'install') from jsonb_array_elements(p_events) e) > 1 then
    raise exception 'bad_batch';
  end if;
  install := p_events -> 0 ->> 'install';
  if install is null or char_length(install) not between 8 and 64 then
    return 0;
  end if;
  -- every day a batch may write to counts (the cap cannot be dodged with another day)
  room := 200 - (select count(*) from public.analytics_events a
                 where a.install_id = install and a.day between today - 2 and today + 1);
  room := least(room, c_daily_cap - coalesce(
    (select d.events from public.analytics_daily d where d.day = today), 0));
  if room <= 0 then
    return 0;
  end if;

  with ins as (
    insert into public.analytics_events (id, install_id, name, day, at, screen)
      select e ->> 'id', install, e ->> 'name',
             case when coalesce(e ->> 'day', '') ~ '^\d{4}-\d{2}-\d{2}$' then (e ->> 'day')::date end,
             case when coalesce(e ->> 'at', '') ~ '^\d{4}-\d{2}-\d{2}[T ]' then (e ->> 'at')::timestamptz end,
             nullif(e ->> 'screen', '')
      from jsonb_array_elements(p_events) as e
      where char_length(coalesce(e ->> 'id', '')) between 8 and 64
        and e ->> 'name' in (
          'first_opened', 'app_opened', 'onboarding_done', 'activity_opened', 'activity_finished',
          'journey_done', 'returned_day2', 'returned_day7', 'app_closed')
        and coalesce(e ->> 'screen', '') ~ '^(|/[a-z0-9/-]{1,64})$'
        -- casts only after the shape is checked (AND has no evaluation order)
        and case when coalesce(e ->> 'day', '') ~ '^\d{4}-\d{2}-\d{2}$'
              then (e ->> 'day')::date between today - 2 and today + 1 else false end
        and case when coalesce(e ->> 'at', '') ~ '^\d{4}-\d{2}-\d{2}[T ][0-9:.]+(Z|[+-][0-9:]+)?$'
              then (e ->> 'at')::timestamptz between now() - interval '3 days'
                                                and now() + interval '1 day'
              else false end
      limit room
    on conflict (id) do nothing
    returning name, day
  )
  select count(*)::integer, array_agg(distinct ins.name order by ins.name),
         min(ins.day) filter (where ins.name = 'first_opened'), max(ins.day)
    into added, v_names, v_first, v_last
  from ins;

  if added > 0 then
    insert into public.analytics_daily (day, events) values (today, added)
    on conflict (day) do update set events = public.analytics_daily.events + excluded.events;
    insert into public.analytics_installs as i (install_id, first_day, last_day, reached)
      values (install, v_first, v_last, v_names)
    on conflict (install_id) do update set
      first_day = least(i.first_day, excluded.first_day),
      last_day = greatest(i.last_day, excluded.last_day),
      reached = (select array_agg(distinct n order by n) from unnest(i.reached || excluded.reached) n);
  end if;

  -- retention: about one call in a hundred clears what is older than 180 days
  if random() < 0.01 then
    delete from public.analytics_events where day < today - 180;
    delete from public.analytics_daily where day < today - 180;
    delete from public.analytics_installs where last_day < today - 180;
  end if;
  return added;
end;
$$;
revoke all on function public.add_analytics_events(jsonb) from public, anon, authenticated;
grant execute on function public.add_analytics_events(jsonb) to service_role;

-- 4. Materialized views for the admin -------------------------------------------
-- No RLS on a materialized view: nobody but the owner and the admin functions reads them.
drop materialized view if exists public.admin_exits_daily;
create materialized view public.admin_exits_daily as
  select l.day, l.screen, count(*)::bigint as closes
  from (
    select distinct on (e.install_id, e.day) e.day, e.screen
    from public.analytics_events e
    where e.name = 'app_closed' and e.screen is not null
    order by e.install_id, e.day, e.at desc
  ) l
  group by l.day, l.screen;
create unique index admin_exits_daily_key on public.admin_exits_daily (day, screen);
revoke all on public.admin_exits_daily from public, anon, authenticated;

drop materialized view if exists public.admin_revenue_daily;
create materialized view public.admin_revenue_daily as
  select (p.created_at at time zone 'Asia/Tashkent')::date as day,
         count(*)::bigint as payments, sum(p.amount)::bigint as amount
  from public.payments p
  group by 1;
create unique index admin_revenue_daily_key on public.admin_revenue_daily (day);
revoke all on public.admin_revenue_daily from public, anon, authenticated;

create table if not exists public.admin_stats_state (
  id integer primary key check (id = 1),
  refreshed_at timestamptz not null
);
alter table public.admin_stats_state enable row level security;
revoke all on public.admin_stats_state from anon, authenticated;
insert into public.admin_stats_state (id, refreshed_at) values (1, now())
  on conflict (id) do update set refreshed_at = excluded.refreshed_at;

-- Refreshes both views unless they are younger than p_max_age. One refresh at a
-- time: a second caller keeps the current numbers. Returns the refresh time.
create or replace function public.refresh_admin_stats(p_max_age interval default interval '0')
returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_last timestamptz;
begin
  select s.refreshed_at into v_last from public.admin_stats_state s where s.id = 1;
  if v_last is not null and v_last > now() - p_max_age then
    return v_last;
  end if;
  if not pg_try_advisory_xact_lock(hashtext('kiddo.admin_stats')) then
    return v_last;
  end if;
  if (select c.relispopulated from pg_catalog.pg_class c where c.oid = 'public.admin_exits_daily'::regclass) then
    refresh materialized view concurrently public.admin_exits_daily;
  else
    refresh materialized view public.admin_exits_daily;
  end if;
  if (select c.relispopulated from pg_catalog.pg_class c where c.oid = 'public.admin_revenue_daily'::regclass) then
    refresh materialized view concurrently public.admin_revenue_daily;
  else
    refresh materialized view public.admin_revenue_daily;
  end if;
  insert into public.admin_stats_state (id, refreshed_at) values (1, now())
    on conflict (id) do update set refreshed_at = excluded.refreshed_at;
  return now();
end;
$$;
revoke all on function public.refresh_admin_stats(interval) from public, anon, authenticated;
grant execute on function public.refresh_admin_stats(interval) to service_role;

-- The admin's calls never refresh themselves (a refresh on a big day could
-- outlast their time limit and fail the page). When the views are older than
-- 15 minutes (pg_cron missed a turn), they ask the worker for one, at most one
-- request per 10 minutes, and show the numbers they have.
drop function if exists public.refresh_admin_stats_quietly();
create or replace function public.request_admin_stats_refresh()
returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if exists (select 1 from public.admin_stats_state s
             where s.id = 1 and s.refreshed_at > now() - interval '15 minutes') then
    return;
  end if;
  perform public.enqueue_job('refresh_admin_stats', '{}'::jsonb, now(),
    'refresh_admin_stats:' || floor(extract(epoch from now()) / 600)::bigint, 3);
end;
$$;
revoke all on function public.request_admin_stats_refresh() from public, anon, authenticated;

-- When the admin's numbers were last brought up to date.
create or replace function public.admin_stats_refreshed_at()
returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return (select s.refreshed_at from public.admin_stats_state s where s.id = 1);
end;
$$;
revoke all on function public.admin_stats_refreshed_at() from public, anon;
grant execute on function public.admin_stats_refreshed_at() to authenticated;

-- The funnel and retention from analytics_installs (same answers as 0016 / 0019).
create or replace function public.admin_analytics_funnel(p_days integer default 30)
returns table (name text, installs bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  since date := (now() at time zone 'Asia/Tashkent')::date - greatest(1, least(p_days, 365));
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  return query
    select n.step, count(*)::bigint
    from public.analytics_installs i
    cross join lateral unnest(i.reached) as n(step)
    where i.first_day > since
    group by n.step;
end;
$$;

drop function if exists public.admin_analytics_exits(integer);
create or replace function public.admin_analytics_exits(p_days integer default 30)
returns table (screen text, closes bigint)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  perform public.request_admin_stats_refresh();
  return query
    select x.screen, sum(x.closes)::bigint
    from public.admin_exits_daily x
    where x.day > (now() at time zone 'Asia/Tashkent')::date - greatest(1, least(p_days, 365))
    group by x.screen
    order by 2 desc, 1
    limit 20;
end;
$$;

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
    select
      count(*),
      count(*) filter (where i.first_day <= today - 1),
      count(*) filter (where i.first_day <= today - 1 and 'returned_day2' = any (i.reached)),
      count(*) filter (where i.first_day <= today - 6),
      count(*) filter (where i.first_day <= today - 6 and 'returned_day7' = any (i.reached))
    from public.analytics_installs i
    where i.first_day > since;
end;
$$;

-- Income per Tashkent day for the last p_days days: closed days from the view,
-- the days since its refresh counted live (a few rows of payments).
create or replace function public.admin_revenue_days(p_days integer default 400)
returns table (day date, payments bigint, amount bigint)
language plpgsql volatile security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Tashkent')::date;
  since date := (now() at time zone 'Asia/Tashkent')::date - (greatest(1, least(coalesce(p_days, 400), 800)) - 1);
  v_cut date;
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  perform public.request_admin_stats_refresh();
  select (s.refreshed_at at time zone 'Asia/Tashkent')::date into v_cut
  from public.admin_stats_state s where s.id = 1;
  v_cut := greatest(coalesce(v_cut, since), since);
  return query
    select r.day, r.payments, r.amount
    from public.admin_revenue_daily r
    where r.day >= since and r.day < v_cut
    union all
    select (p.created_at at time zone 'Asia/Tashkent')::date, count(*)::bigint, sum(p.amount)::bigint
    from public.payments p
    where p.created_at >= (v_cut::timestamp at time zone 'Asia/Tashkent')
      and p.created_at < ((today + 1)::timestamp at time zone 'Asia/Tashkent')
    group by 1
    order by 1;
end;
$$;

revoke all on function public.admin_analytics_funnel(integer) from public, anon;
revoke all on function public.admin_analytics_exits(integer) from public, anon;
revoke all on function public.admin_retention(integer) from public, anon;
revoke all on function public.admin_revenue_days(integer) from public, anon;
grant execute on function public.admin_analytics_funnel(integer) to authenticated;
grant execute on function public.admin_analytics_exits(integer) to authenticated;
grant execute on function public.admin_retention(integer) to authenticated;
grant execute on function public.admin_revenue_days(integer) to authenticated;

-- 5. Job queue --------------------------------------------------------------------
-- Work that talks to the outside (Telegram messages from Phase 56 on) waits
-- here and is done by the `worker` Edge Function, a few at a time, with
-- retries. A job that keeps failing ends as dead after max_attempts.
create table if not exists public.jobs (
  id bigint generated always as identity primary key,
  kind text not null check (kind ~ '^[a-z][a-z0-9_]{0,39}$'),
  payload jsonb not null default '{}' check (pg_column_size(payload) <= 8192),
  dedupe_key text unique check (char_length(dedupe_key) <= 200),
  run_at timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  locked_until timestamptz,
  last_error text,
  done_at timestamptz,
  dead boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists jobs_due_idx on public.jobs (run_at) where done_at is null and not dead;
create index if not exists jobs_done_idx on public.jobs (done_at) where done_at is not null;
alter table public.jobs enable row level security;
revoke all on public.jobs from anon, authenticated;

-- Adds a job; with a dedupe key, the same job is added once (its id is returned).
create or replace function public.enqueue_job(
  p_kind text,
  p_payload jsonb default '{}',
  p_run_at timestamptz default now(),
  p_dedupe_key text default null,
  p_max_attempts integer default 5
)
returns bigint
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id bigint;
begin
  insert into public.jobs (kind, payload, run_at, dedupe_key, max_attempts)
    values (p_kind, coalesce(p_payload, '{}'), coalesce(p_run_at, now()), p_dedupe_key,
            coalesce(p_max_attempts, 5))
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is null then
    select j.id into v_id from public.jobs j where j.dedupe_key = p_dedupe_key;
  end if;
  return v_id;
end;
$$;

-- Takes up to p_limit due jobs for p_lease_seconds. Two workers never get the
-- same job (skip locked); a worker that dies loses its jobs when the lease ends.
create or replace function public.claim_jobs(p_limit integer default 10, p_lease_seconds integer default 60)
returns table (id bigint, kind text, payload jsonb, attempts integer)
language plpgsql volatile security definer set search_path = '' as $$
begin
  -- a job whose last try never reported back (the run died) and has no tries left
  update public.jobs j
     set dead = true, locked_until = null,
         last_error = coalesce(j.last_error, 'no answer from the last attempt')
   where j.done_at is null and not j.dead and j.attempts >= j.max_attempts
     and j.locked_until is not null and j.locked_until < now();
  return query
    update public.jobs j
       set locked_until = now() + make_interval(secs => greatest(5, least(coalesce(p_lease_seconds, 60), 900))),
           attempts = j.attempts + 1
     where j.id in (
       select d.id from public.jobs d
       where d.done_at is null and not d.dead and d.run_at <= now()
         and d.attempts < d.max_attempts
         and (d.locked_until is null or d.locked_until < now())
       order by d.run_at, d.id
       limit greatest(1, least(coalesce(p_limit, 10), 100))
       for update skip locked)
    returning j.id, j.kind, j.payload, j.attempts;
end;
$$;

-- p_attempts is the try the caller was given: a run whose lease ran out (and the
-- job went to another run) changes nothing. True when the answer was taken.
drop function if exists public.finish_job(bigint);
create or replace function public.finish_job(p_id bigint, p_attempts integer)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.jobs set done_at = now(), locked_until = null, last_error = null
   where id = p_id and attempts = p_attempts and done_at is null and not dead;
  return found;
end;
$$;

-- A failed try: again later (30 s, 1, 2, 4 … minutes, at most an hour), or dead
-- after the last attempt or when p_final (the job can never succeed).
drop function if exists public.fail_job(bigint, text, boolean);
create or replace function public.fail_job(
  p_id bigint,
  p_attempts integer,
  p_error text,
  p_final boolean default false
)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.jobs j
     set locked_until = null,
         last_error = left(coalesce(p_error, ''), 500),
         dead = p_final or j.attempts >= j.max_attempts,
         run_at = now() + make_interval(secs => least(3600, 30 * power(2, greatest(j.attempts - 1, 0))))
   where j.id = p_id and j.attempts = p_attempts and j.done_at is null and not j.dead;
  return found;
end;
$$;

-- Done jobs go after 7 days, dead ones after 30; old per-IP counters after 2 days.
create or replace function public.prune_jobs()
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_total integer := 0;
  v_n integer;
begin
  delete from public.jobs where done_at < now() - interval '7 days';
  get diagnostics v_n = row_count;
  v_total := v_n;
  delete from public.jobs where dead and run_at < now() - interval '30 days';
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;
  delete from public.analytics_ip_hits where window_start < now() - interval '2 days';
  get diagnostics v_n = row_count;
  return v_total + v_n;
end;
$$;

-- 6. Analytics per IP -------------------------------------------------------------
-- The `analytics` Edge Function counts the events of each IP per window. Only a
-- keyed hash of the IP is stored (it changes every day), never the address.
create table if not exists public.analytics_ip_hits (
  ip_hash text not null check (char_length(ip_hash) between 16 and 128),
  window_start timestamptz not null,
  events integer not null default 0,
  primary key (ip_hash, window_start)
);
create index if not exists analytics_ip_hits_window on public.analytics_ip_hits (window_start);
alter table public.analytics_ip_hits enable row level security;
revoke all on public.analytics_ip_hits from anon, authenticated;

-- Adds p_events to this IP's window; true while the window stays within p_limit.
create or replace function public.analytics_ip_take(
  p_ip_hash text,
  p_events integer,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_window integer := greatest(60, least(coalesce(p_window_seconds, 3600), 86400));
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / v_window) * v_window);
  v_total integer;
begin
  insert into public.analytics_ip_hits as h (ip_hash, window_start, events)
    values (p_ip_hash, v_start, greatest(0, least(coalesce(p_events, 0), 100)))
  on conflict (ip_hash, window_start) do update set events = h.events + excluded.events
  returning h.events into v_total;
  return v_total <= p_limit;
end;
$$;

-- The service role (the Edge Functions and pg_cron) only.
revoke all on function public.enqueue_job(text, jsonb, timestamptz, text, integer) from public, anon, authenticated;
revoke all on function public.claim_jobs(integer, integer) from public, anon, authenticated;
revoke all on function public.finish_job(bigint, integer) from public, anon, authenticated;
revoke all on function public.fail_job(bigint, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.prune_jobs() from public, anon, authenticated;
revoke all on function public.analytics_ip_take(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.enqueue_job(text, jsonb, timestamptz, text, integer) to service_role;
grant execute on function public.claim_jobs(integer, integer) to service_role;
grant execute on function public.finish_job(bigint, integer) to service_role;
grant execute on function public.fail_job(bigint, integer, text, boolean) to service_role;
grant execute on function public.prune_jobs() to service_role;
grant execute on function public.analytics_ip_take(text, integer, integer, integer) to service_role;

-- 7. pg_cron ------------------------------------------------------------------------
-- Calls the worker only when a job is due. The address and the secret come from
-- Supabase Vault (`kiddo_project_url`, `kiddo_worker_secret`); without them, or
-- without pg_net, nothing is sent.
create or replace function public.kick_worker()
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.jobs j
                 where j.done_at is null and not j.dead and j.run_at <= now()
                   and j.attempts < j.max_attempts
                   and (j.locked_until is null or j.locked_until < now())) then
    return false;
  end if;
  if to_regclass('vault.decrypted_secrets') is null
     or not exists (select 1 from pg_catalog.pg_extension where extname = 'pg_net') then
    return false;
  end if;
  execute $q$select max(decrypted_secret) filter (where name = 'kiddo_project_url'),
                    max(decrypted_secret) filter (where name = 'kiddo_worker_secret')
             from vault.decrypted_secrets$q$ into v_url, v_secret;
  if v_url is null or v_secret is null then
    return false;
  end if;
  execute 'select net.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 150000)'
    using rtrim(v_url, '/') || '/functions/v1/worker',
          jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
          '{}'::jsonb;
  return true;
end;
$$;
revoke all on function public.kick_worker() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    -- a job of the same name is replaced, so a re-run keeps one of each
    perform cron.schedule('kiddo-admin-stats', '*/10 * * * *', 'select public.refresh_admin_stats()');
    perform cron.schedule('kiddo-worker', '* * * * *', 'select public.kick_worker()');
    perform cron.schedule('kiddo-housekeeping', '17 3 * * *',
      'select public.prune_jobs(); select public.ai_housekeeping()');
  end if;
end $$;
