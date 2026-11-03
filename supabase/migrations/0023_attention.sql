-- Phase 71: the attention helper in the admin's numbers, without any picture.
-- The camera's view never leaves a child's device (docs/architecture/attention.md);
-- a device sends only that something happened that day: a grown-up allowed or
-- declined the helper, the camera was used, the robot called the child back, games
-- were offered or taken. The admin reads them back only as counts per event.
-- Re-runnable (drop … if exists / create or replace). Written, not applied.

-- 1. The new event names are allowed ---------------------------------------------
alter table public.analytics_events drop constraint if exists analytics_events_name_check;
alter table public.analytics_events add constraint analytics_events_name_check check (name in (
  'first_opened', 'app_opened', 'onboarding_done', 'activity_opened', 'activity_finished',
  'journey_done', 'returned_day2', 'returned_day7', 'app_closed',
  'attention_yes', 'attention_no', 'attention_camera', 'attention_nudge',
  'attention_offer', 'attention_offer_taken'
));

-- 2. 0021's function, unchanged except for the names it accepts ---------------------
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
          'journey_done', 'returned_day2', 'returned_day7', 'app_closed',
          'attention_yes', 'attention_no', 'attention_camera', 'attention_nudge',
          'attention_offer', 'attention_offer_taken')
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

-- 3. The admin's counts -------------------------------------------------------------
-- Per attention event: the devices that had it at least once in the period and the
-- days it happened on (each event is sent at most once a day per device).
create or replace function public.admin_attention_stats(p_days integer default 30)
returns table (name text, installs bigint, days bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  since date := (now() at time zone 'Asia/Tashkent')::date - greatest(1, least(p_days, 365));
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  return query
    select e.name, count(distinct e.install_id)::bigint, count(*)::bigint
    from public.analytics_events e
    where e.day > since and e.name like 'attention\_%'
    group by e.name;
end;
$$;
revoke all on function public.admin_attention_stats(integer) from public, anon;
grant execute on function public.admin_attention_stats(integer) to authenticated;
