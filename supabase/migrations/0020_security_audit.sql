-- Phase 52: fixes from the security audit (docs/architecture/security-audit-52.md).
-- Re-runnable (if not exists / create or replace / drop … if exists).

-- 1. Analytics: a cap for everyone together. The per-install cap of 0016 can be
-- dodged with a new random install id per call, so a script with the public
-- key could fill the table without end. Now at most c_daily_cap events are
-- kept per day (Tashkent time), counted in a one-row-per-day table.
create table if not exists public.analytics_daily (
  day date primary key,
  events integer not null default 0
);
alter table public.analytics_daily enable row level security;
revoke all on public.analytics_daily from anon, authenticated;

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

  if added > 0 then
    insert into public.analytics_daily (day, events) values (today, added)
    on conflict (day) do update set events = public.analytics_daily.events + excluded.events;
  end if;

  -- retention: about one call in a hundred clears what is older than 180 days
  if random() < 0.01 then
    delete from public.analytics_events where day < today - 180;
    delete from public.analytics_daily where day < today - 180;
  end if;
  return added;
end;
$$;
revoke all on function public.add_analytics_events(jsonb) from public;
grant execute on function public.add_analytics_events(jsonb) to anon, authenticated;

-- 2. A child's birthday week is asked only inside record_reward. `revoke … from
-- public` (0014) leaves Supabase's default grants to anon and authenticated.
revoke all on function public.is_birthday_week(text, text) from public, anon, authenticated;

-- 3. Admin rights only for an account whose e-mail is confirmed (a typo or an
-- address someone registered without owning it cannot become an admin).
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
    and u.email_confirmed_at is not null
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
revoke all on function public.admin_add(text) from public, anon;
grant execute on function public.admin_add(text) to authenticated;

-- 4. The last admin cannot disappear, not even by deleting their account
-- (admin_remove already refuses; the account deletion went around it).
create or replace function public.keep_last_admin()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('admins'));
  if not exists (select 1 from public.admins a where a.user_id <> old.user_id) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
  return old;
end;
$$;
revoke all on function public.keep_last_admin() from public, anon, authenticated;
drop trigger if exists admins_keep_last on public.admins;
create trigger admins_keep_last before delete on public.admins
  for each row execute function public.keep_last_admin();
