-- Phase 37: anonymous product analytics. A device sends only an event name,
-- the day, the time, a random install id and (for leaving) a coarse screen
-- such as '/worlds/dino'. No child, name, answer, photo or account is stored.
-- Events arrive only through add_analytics_events (no table access); nobody
-- can read them back except an admin, and only as counts.
-- Re-runnable (if not exists / drop … if exists / create or replace).

create table if not exists public.analytics_events (
  id text primary key check (char_length(id) between 8 and 64),
  install_id text not null check (char_length(install_id) between 8 and 64),
  name text not null check (name in (
    'first_opened', 'app_opened', 'onboarding_done', 'activity_opened', 'activity_finished',
    'journey_done', 'returned_day2', 'returned_day7', 'app_closed'
  )),
  day date not null,
  at timestamptz not null,
  screen text check (screen is null or screen ~ '^/[a-z0-9/-]{1,64}$'),
  received_at timestamptz not null default now(),
  -- a device clock may be wrong, but not by more than two days
  check (day between (received_at at time zone 'Asia/Tashkent')::date - 2
                 and (received_at at time zone 'Asia/Tashkent')::date + 1)
);

create index if not exists analytics_events_day_name on public.analytics_events (day, name);
create index if not exists analytics_events_install_day on public.analytics_events (install_id, day);

alter table public.analytics_events enable row level security;

-- No direct access: events arrive only through add_analytics_events below.
revoke all on public.analytics_events from anon, authenticated;
drop policy if exists "anyone adds an analytics event" on public.analytics_events;

-- A batch of events from one device (at most 100, one install id). Events
-- that do not fit (unknown name, a screen that is not a coarse path, a day
-- or time far from now) are skipped, not refused, so one bad event never
-- loses the others. An event sent twice is ignored. At most 200 events per
-- install over the days a batch may write to are kept (a flood from one script stops there), and events
-- older than 180 days are cleared now and then. Returns how many were new.
create or replace function public.add_analytics_events(p_events jsonb)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Tashkent')::date;
  install text;
  room integer;
  added integer;
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
  if room <= 0 then
    return 0;
  end if;

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
  on conflict (id) do nothing;
  get diagnostics added = row_count;

  -- retention: about one call in a hundred clears what is older than 180 days
  if random() < 0.01 then
    delete from public.analytics_events where day < today - 180;
  end if;
  return added;
end;
$$;

revoke all on function public.add_analytics_events(jsonb) from public;
grant execute on function public.add_analytics_events(jsonb) to anon, authenticated;

-- The funnel of the last p_days days as a cohort: installs first opened in the
-- period, and how many of them reached each step.
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
    with cohort as (
      select distinct e.install_id from public.analytics_events e
      where e.name = 'first_opened' and e.day > since
    )
    select e.name, count(distinct e.install_id)
    from public.analytics_events e
    join cohort c on c.install_id = e.install_id
    group by e.name;
end;
$$;

-- Where the app was left in the last p_days days: the last leaving of each
-- install each day, most often first.
create or replace function public.admin_analytics_exits(p_days integer default 30)
returns table (screen text, closes bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  return query
    with last_close as (
      select distinct on (e.install_id, e.day) e.screen
      from public.analytics_events e
      where e.name = 'app_closed' and e.screen is not null
        and e.day > (now() at time zone 'Asia/Tashkent')::date - greatest(1, least(p_days, 365))
      order by e.install_id, e.day, e.at desc
    )
    select l.screen, count(*)
    from last_close l
    group by l.screen
    order by count(*) desc, l.screen
    limit 20;
end;
$$;

revoke all on function public.admin_analytics_funnel(integer) from public, anon;
revoke all on function public.admin_analytics_exits(integer) from public, anon;
grant execute on function public.admin_analytics_funnel(integer) to authenticated;
grant execute on function public.admin_analytics_exits(integer) to authenticated;
