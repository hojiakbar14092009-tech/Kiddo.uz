-- The same restore without the parent filter on children (RLS alone), as before Phase 53.
\set p random(1, 20000)
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-' || lpad(to_hex(:p), 12, '0'), 'role', 'authenticated')::text, true);
select id, name from public.children;
select child_id, coins from public.child_state where child_id in ('c' || :p || '-1', 'c' || :p || '-2');
select id, coins from public.task_results where child_id = 'c' || :p || '-1' order by finished_at desc limit 100;
select coins, reason from public.reward_ledger where child_id = 'c' || :p || '-1' order by created_at desc limit 100;
commit;
