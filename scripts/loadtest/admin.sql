-- The admin opening the dashboard: funnel, retention, exits.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select * from public.admin_analytics_funnel(30);
select * from public.admin_retention(30);
select * from public.admin_analytics_exits(30);
commit;
