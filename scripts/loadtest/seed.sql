-- Load-test data (Phase 53): a year of a mid-size audience. Triggers are off
-- while seeding (bulk data, not app behaviour); the load itself runs with them.
\set parents 20000
set session_replication_role = replica;
insert into auth.users (id, email, email_confirmed_at)
  select ('00000000-0000-0000-0000-' || lpad(to_hex(g), 12, '0'))::uuid, 'p' || g || '@load.uz', now()
  from generate_series(1, :parents) g;
insert into auth.users (id, email, email_confirmed_at)
  values ('ffffffff-0000-0000-0000-0000000000ad', 'admin@load.uz', now());
insert into public.admins (user_id) values ('ffffffff-0000-0000-0000-0000000000ad');
-- two children per family
insert into public.children (id, parent_id, name, age, gender, mascot)
  select 'c' || g || '-' || k, ('00000000-0000-0000-0000-' || lpad(to_hex(g), 12, '0'))::uuid,
         'Bola', 5, 'girl', 'girl'
  from generate_series(1, :parents) g, generate_series(1, 2) k;
insert into public.child_state (child_id, parent_id, coins)
  select c.id, c.parent_id, 100 from public.children c;
-- ten finished tasks and ten rewards per child
insert into public.task_results (id, child_id, parent_id, type, language, coins, stars, day, finished_at)
  select c.id || '-t' || n, c.id, c.parent_id, 'memory', 'uz', 5, 3,
         current_date - n, now() - make_interval(days => n)
  from public.children c, generate_series(1, 10) n;
insert into public.reward_ledger (child_id, parent_id, coins, reason, ref_id, created_at)
  select c.id, c.parent_id, 5, 'task', 'seed-' || n, now() - make_interval(days => n)
  from public.children c, generate_series(1, 10) n;
-- a year of payments
insert into public.payments (id, parent_id, plan, provider, amount, created_at)
  select 'pay-' || g, ('00000000-0000-0000-0000-' || lpad(to_hex(1 + g % :parents), 12, '0'))::uuid,
         'monthly', 'click', 29000, now() - make_interval(mins => (g * 17) % 525600)
  from generate_series(1, 30000) g;
-- 180 days of analytics: 50 000 installs, 1 000 000 events
insert into public.analytics_events (id, install_id, name, day, at, screen, received_at)
  select 'seed-ev-' || lpad(g::text, 7, '0'), 'install-' || lpad((g % 50000)::text, 6, '0'),
         (array['first_opened','app_opened','activity_opened','activity_finished','app_closed',
                'returned_day2','returned_day7','app_closed'])[1 + g % 8],
         (now() at time zone 'Asia/Tashkent')::date - (g % 180),
         now() - make_interval(days => g % 180),
         case when g % 8 in (4, 7) then '/worlds/dino' end,
         now() - make_interval(days => g % 180)
  from generate_series(1, 1000000) g;
set session_replication_role = origin;
-- the per-install summary of 0021, when it is there
do $$ begin
  if to_regclass('public.analytics_installs') is not null then
    insert into public.analytics_installs (install_id, first_day, last_day, reached)
      select e.install_id, min(e.day) filter (where e.name = 'first_opened'), max(e.day),
             array_agg(distinct e.name order by e.name)
      from public.analytics_events e group by e.install_id
    on conflict (install_id) do nothing;
    perform public.refresh_admin_stats();
  end if;
end $$;
analyze;
