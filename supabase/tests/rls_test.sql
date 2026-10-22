\set ON_ERROR_STOP 1
-- fixtures (as superuser)
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','a@x.uz'),
 ('00000000-0000-0000-0000-00000000000b','b@x.uz'),
 ('00000000-0000-0000-0000-0000000000ad','admin@x.uz');
insert into public.admins values ('00000000-0000-0000-0000-0000000000ad');
insert into public.children (id,parent_id,name,age,gender,mascot) values
 ('ca','00000000-0000-0000-0000-00000000000a','Ali',5,'boy','boy'),
 ('cb','00000000-0000-0000-0000-00000000000b','Lola',5,'girl','girl');
insert into public.child_state (child_id,parent_id) values ('ca','00000000-0000-0000-0000-00000000000a');
insert into public.payments (id,parent_id,plan,provider,amount) values
 ('pa','00000000-0000-0000-0000-00000000000a','monthly','click',1000),
 ('pb','00000000-0000-0000-0000-00000000000b','monthly','click',1000);
-- B watched an ad 60 s ago (the server's clock decides; 10 s ad)
insert into public.ads (id,title,video_url,duration_s) values ('11111111-1111-1111-1111-111111111111','A','https://x/a.mp4',10);
insert into public.ad_views (id,user_id,ad_id,started_at) values
 ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-00000000000b','11111111-1111-1111-1111-111111111111', now() - interval '60 seconds');

create function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'EXPECTED ERROR (%) but succeeded: %', needle, sql;
exception when others then
  if sqlerrm like 'EXPECTED ERROR%' then raise; end if;
  if position(needle in sqlerrm) = 0 then raise exception 'wrong error for %: % (wanted %)', sql, sqlerrm, needle; end if;
  raise notice 'ok: refused (%): %', needle, left(sql, 70);
end $$;
-- NULL is a failure too.
create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', label; end if; raise notice 'ok: %', label; end $$;
grant execute on all functions in schema pg_temp to authenticated, anon, service_role;

-- harness self-test: a NULL or false check must fail
do $$ begin
  begin perform pg_temp.check(null, 'null'); raise exception 'harness accepted NULL';
  exception when others then if sqlerrm = 'harness accepted NULL' then raise; end if; end;
  begin perform pg_temp.check(false, 'false'); raise exception 'harness accepted false';
  exception when others then if sqlerrm = 'harness accepted false' then raise; end if; end;
  raise notice 'ok: harness rejects NULL and false';
end $$;

-- ===== parent A
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select pg_temp.check((select count(*) from public.payments) = 1, 'payments: parent sees only own');
select pg_temp.expect_error($$insert into public.payments (id,plan,provider,amount) values ('px','lifetime','click',0)$$, 'row-level security');
update public.payments set amount = 0 where id = 'pa';
delete from public.payments where id = 'pa';
select pg_temp.check((select amount from public.payments where id='pa') = 1000, 'payments: parent update/delete change nothing');
select pg_temp.expect_error($$insert into public.subscriptions (parent_id,plan,source) values ('00000000-0000-0000-0000-00000000000a','lifetime','payment')$$, 'row-level security');
-- presence
insert into public.presence_heartbeats (child_id, screen) values ('ca','/home');
insert into public.presence_heartbeats (child_id, screen) values ('ca','/math') on conflict (child_id) do update set screen = excluded.screen;
select pg_temp.check((select screen from public.presence_heartbeats) = '/math', 'presence: parent upserts own');
select pg_temp.expect_error($$insert into public.presence_heartbeats (child_id, screen) values ('cb','/x')$$, 'row-level security');
select pg_temp.expect_error($$update public.presence_heartbeats set child_id='cb' where child_id='ca'$$, 'row-level security');
-- ledger
select pg_temp.expect_error($$insert into public.reward_ledger (child_id,parent_id,coins,reason,ref_id) values ('ca','00000000-0000-0000-0000-00000000000a',5,'task','r')$$, 'permission denied');
select pg_temp.check((select (public.record_reward('ca',10,'learn','s1')).coins) = 10, 'ledger: RPC records');
select pg_temp.check((select (public.record_reward('ca',10,'learn','s1')).id) = (select id from public.reward_ledger where ref_id='s1'), 'ledger: RPC idempotent');
select pg_temp.check((select count(*) from public.reward_ledger) = 1, 'ledger: one row after retry');
select pg_temp.expect_error($$select public.record_reward('cb',10,'learn','s2')$$, 'not_your_child');
select pg_temp.expect_error($$select public.record_reward('ca',10,'cheat','s3')$$, 'bad_reason');
select pg_temp.expect_error($$select public.record_reward('ca',5000,'task','s4')$$, 'out_of_bounds');
select pg_temp.expect_error($$select public.record_reward('ca',100,'admin','s5')$$, 'not_admin');
select pg_temp.expect_error($$select public.record_reward('ca',1000,'pro-gift','g1')$$, 'not_admin');
select pg_temp.expect_error($$select public.record_reward('ca',200,'purchase','p1')$$, 'bad_sign');
select pg_temp.expect_error($$select public.record_reward('ca',-30,'task','neg1')$$, 'bad_sign');
select pg_temp.expect_error($$select public.record_reward('ca',0,'task','zero')$$, 'bad_sign');
select public.record_reward('ca',200,'task','t'||g) from generate_series(1,2) g;
select pg_temp.expect_error($$select public.record_reward('ca',200,'task','t3')$$, 'daily_cap');
select pg_temp.check((select (public.record_reward('ca',-30,'purchase','buy1')).coins) = -30, 'ledger: spending allowed past cap');
select pg_temp.check((select (public.record_reward('ca',-5,'penalty','pen1')).coins) = -5, 'ledger: penalty negative');
select pg_temp.expect_error($$update public.reward_ledger set coins = 999$$, 'permission denied');
-- resources (0006)
select pg_temp.expect_error($$insert into public.resource_ledger (child_id,parent_id,resource,amount,reason,ref_id) values ('ca','00000000-0000-0000-0000-00000000000a','star',3,'activity','r')$$, 'permission denied');
select pg_temp.check((select (public.record_resource('ca','star',3,'activity','run-1')).amount) = 3, 'resources: RPC records');
select pg_temp.check((select (public.record_resource('ca','star',3,'activity','run-1')).id) = (select id from public.resource_ledger where ref_id='run-1'), 'resources: RPC idempotent');
select pg_temp.check((select count(*) from public.resource_ledger) = 1, 'resources: one row after retry');
select pg_temp.expect_error($$select public.record_resource('cb','star',1,'activity','x1')$$, 'not_your_child');
select pg_temp.expect_error($$select public.record_resource('ca','gem',1,'activity','x2')$$, 'bad_resource');
select pg_temp.expect_error($$select public.record_resource('ca','star',1,'cheat','x3')$$, 'bad_reason');
select pg_temp.expect_error($$select public.record_resource('ca','crystal',1,'activity','x4')$$, 'bad_reason');
select pg_temp.expect_error($$select public.record_resource('ca','star',-1,'upgrade','x5')$$, 'bad_reason');
select pg_temp.expect_error($$select public.record_resource('ca','star',4,'activity','x6')$$, 'out_of_bounds');
select pg_temp.expect_error($$select public.record_resource('ca','crystal',5,'quest','daily|2026-01-01')$$, 'out_of_bounds');
select pg_temp.expect_error($$select public.record_resource('ca','star',-2,'activity','x8')$$, 'bad_sign');
select pg_temp.expect_error($$select public.record_resource('ca','crystal',1,'upgrade','x9')$$, 'bad_sign');
select pg_temp.expect_error($$select public.record_resource('ca','crystal',10,'admin','x10')$$, 'not_admin');
select public.record_resource('ca','part',1,'number-3star','math:'||g||'|2026-10-18') from generate_series(1,3) g;
select pg_temp.expect_error($$select public.record_resource('ca','part',1,'number-3star','math:9|2026-10-18')$$, 'daily_cap');
select pg_temp.check((select (public.record_resource('ca','crystal',1,'three-stars','math:4')).amount) = 1, 'resources: crystal for three stars');
select pg_temp.check((select (public.record_resource('ca','crystal',-1,'upgrade','upgrade|math-land|1')).amount) = -1, 'resources: spend within the balance');
select pg_temp.expect_error($$select public.record_resource('ca','crystal',-1,'upgrade','upgrade|math-land|2')$$, 'insufficient');
select pg_temp.check((select (public.record_resource('ca','part',-3,'upgrade','upgrade|robot-workshop|1')).amount) = -3, 'resources: spending allowed past the daily cap');
select pg_temp.expect_error($$update public.resource_ledger set amount = 99$$, 'permission denied');
select pg_temp.expect_error($$delete from public.resource_ledger$$, 'permission denied');
-- resources: earned time and quest refs (0006)
select pg_temp.expect_error($$select public.record_resource('ca','star',1,'activity','future-1', now() + interval '1 hour')$$, 'bad_time');
select public.record_resource('ca','part',1,'number-3star','late:'||g, now() - interval '1 day') from generate_series(1,3) g;
select pg_temp.check((select count(*) from public.resource_ledger where ref_id like 'late:%') = 3, 'resources: a late upload is capped on its own day, not today');
select pg_temp.expect_error($$select public.record_resource('ca','part',1,'number-3star','late:9', now() - interval '1 day')$$, 'daily_cap');
select pg_temp.check((select (public.record_resource('ca','star',1,'activity','old-1', now() - interval '30 days')).earned_at) < now() - interval '29 days', 'resources: a month-old entry keeps its own day');
select pg_temp.check((select (public.record_resource('ca','star',1,'activity','old-2', now() - interval '900 days')).earned_at) > now() - interval '366 days', 'resources: older than a year counts as a year ago');
select pg_temp.expect_error($$select public.record_resource('ca','crystal',1,'quest','day-1')$$, 'bad_ref');
select pg_temp.expect_error($$select public.record_resource('ca','crystal',1,'quest','daily|2026-02-30')$$, 'bad_ref');
select pg_temp.expect_error($$select public.record_resource('ca','crystal',1,'quest','daily|2999-01-01')$$, 'bad_ref');
select pg_temp.check((select (public.record_resource('ca','crystal',1,'quest','daily|' || to_char((now() at time zone 'Asia/Tashkent')::date, 'YYYY-MM-DD'))).amount) = 1, 'resources: quest crystal for today');
-- world_state: read-only, levels only through the RPC and only when paid
select pg_temp.expect_error($$insert into public.world_state (child_id, buildings) values ('ca', '{"math-land":3}')$$, 'permission denied');
select pg_temp.expect_error($$select public.record_building_level('ca','observatory',1)$$, 'not_paid');
select pg_temp.check((select (public.record_building_level('ca','math-land',1)).buildings ->> 'math-land') = '1', 'world_state: paid upgrade recorded');
select pg_temp.check((select (public.record_building_level('ca','math-land',1)).buildings ->> 'math-land') = '1', 'world_state: RPC idempotent');
select pg_temp.expect_error($$select public.record_building_level('ca','math-land',3)$$, 'bad_level');
select pg_temp.expect_error($$select public.record_building_level('ca','math-land',2)$$, 'not_paid');
select pg_temp.expect_error($$select public.record_building_level('ca','Math Land',1)$$, 'bad_building');
select pg_temp.expect_error($$select public.record_building_level('cb','math-land',1)$$, 'not_your_child');
select pg_temp.expect_error($$update public.world_state set buildings = '{"math-land":3}'$$, 'permission denied');
select pg_temp.check((select buildings ->> 'math-land' from public.world_state) = '1', 'world_state: parent reads own');
-- achievements: read-only for clients until a validating RPC exists
select pg_temp.expect_error($$insert into public.achievements (child_id, achievement_id, tier) values ('ca','first-steps','bronze')$$, 'permission denied');
select pg_temp.check((select count(*) from public.achievements) = 0, 'achievements: parent cannot add one');
-- child_learn
insert into public.child_learn (child_id, data) values ('ca', '{"attempts":[]}');
select pg_temp.expect_error($$insert into public.child_learn (child_id, data) values ('cb', '{}')$$, 'row-level security');
select pg_temp.expect_error($$update public.child_learn set child_id='cb'$$, 'row-level security');
select pg_temp.expect_error($$insert into public.child_learn (child_id, data) values ('ca', jsonb_build_object('x', (select string_agg(md5(g::text),'') from generate_series(1,40000) g))) on conflict (child_id) do update set data = excluded.data$$, 'child_learn_data_check');
-- jsonb size
select pg_temp.expect_error($$update public.children set homework = jsonb_build_object('x', (select string_agg(md5(g::text),'') from generate_series(1,5000) g)) where id='ca'$$, 'children_homework_size');
-- promo: launch codes are active but need an ad claim; failures are rate-limited
select pg_temp.check((public.redeem_promo_code('KIDDO07') ->> 'error') = 'invalid', 'promo: a real code without an ad claim is refused');
select pg_temp.check((public.redeem_promo_code('BOLAJON30') ->> 'error') = 'invalid', 'promo: the other launch code too');
select pg_temp.check(not exists (select 1 from public.subscriptions), 'promo: no PRO was given');
select public.redeem_promo_code('NOPE' || g) from generate_series(1,3) g;
select pg_temp.check((public.redeem_promo_code('KIDDO07') ->> 'error') = 'rate_limited', 'promo: blocked after 5 failures');
select pg_temp.expect_error($$select public.redeem_promo('KIDDO07')$$, 'permission denied');
commit;
select pg_temp.check((select count(*) from public.promo_attempts where user_id='00000000-0000-0000-0000-00000000000a' and not ok) = 5, 'promo: failed attempts were stored (not rolled back)');

-- ===== parent B: watches the ad, claims, redeems once
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select pg_temp.check((select days from public.claim_promo('22222222-2222-2222-2222-222222222222')) in (7, 30), 'promo: claim after the whole ad');
select pg_temp.expect_error($$select public.claim_promo('22222222-2222-2222-2222-222222222222')$$, 'already_claimed');
select pg_temp.check(((public.redeem_promo_code((select code from public.promo_claims))) ->> 'ok')::boolean, 'promo: the claimed code works');
select pg_temp.check((public.redeem_promo_code((select code from public.promo_claims)) ->> 'error') = 'used', 'promo: once per family');
select pg_temp.check((select expires_at > now() + interval '6 days' and status = 'active' from public.subscriptions), 'promo: PRO given with status active');
-- presence: B cannot touch A's row
select pg_temp.expect_error($$insert into public.presence_heartbeats (child_id, screen) values ('ca','/evil') on conflict (child_id) do update set screen=excluded.screen$$, 'row-level security');
select pg_temp.expect_error($$insert into public.presence_heartbeats (child_id, screen, parent_id) values ('cb','/x','00000000-0000-0000-0000-00000000000a')$$, 'row-level security');
select pg_temp.check((select count(*) from public.presence_heartbeats) = 0, 'presence: B cannot see A');
select pg_temp.check((select count(*) from public.reward_ledger) = 0, 'ledger: B cannot see A');
select pg_temp.check((select count(*) from public.child_learn) = 0, 'child_learn: B cannot see A');
select pg_temp.check((select count(*) from public.resource_ledger) = 0, 'resources: B cannot see A');
select pg_temp.check((select count(*) from public.world_state) = 0, 'world_state: B cannot see A');
select pg_temp.check((select count(*) from public.achievements) = 0, 'achievements: B cannot see A');
select pg_temp.expect_error($$select public.record_resource('ca','star',1,'activity','b-1')$$, 'not_your_child');
commit;

-- ===== legacy redeem_promo brute force (critic probe P2): now not callable at all
do $$ declare i int; refused int := 0; begin
  perform set_config('role','authenticated', true);
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
  for i in 1..20 loop
    begin perform public.redeem_promo('GUESS'||i);
    exception when insufficient_privilege then refused := refused + 1; end;
  end loop;
  perform pg_temp.check(refused = 20, 'legacy redeem_promo refused for signed-in clients');
end $$;

-- ===== service role: PRO gift with a payment
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select pg_temp.check((select (public.record_reward('cb',500,'pro-gift','pay-1')).coins) = 500, 'ledger: service role writes pro-gift');
commit;

-- ===== admin
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select pg_temp.check((select count(*) from public.presence_heartbeats) = 1, 'presence: admin reads all');
select pg_temp.check((select c.name from public.presence_heartbeats p join public.children c on c.id = p.child_id) = 'Ali', 'presence: admin joins names');
select pg_temp.check((select (public.record_reward('cb',1000,'admin','grant-1')).coins) = 1000, 'ledger: admin grant');
select pg_temp.check((select (public.record_reward('cb',100,'pro-gift','gift-admin')).coins) = 100, 'ledger: admin may write pro-gift');
select pg_temp.check((select (public.record_resource('cb','crystal',50,'admin','grant-1')).amount) = 50, 'resources: admin grant');
select pg_temp.check((select count(*) from public.world_state) = 1, 'world_state: admin reads all');
select pg_temp.check((select count(*) from public.resource_ledger where child_id='ca') > 0, 'resources: admin reads all');
insert into public.payments (id,parent_id,plan,provider,amount) values ('pc','00000000-0000-0000-0000-00000000000b','yearly','admin',0);
select pg_temp.check((select count(*) from public.payments) = 3, 'payments: admin writes and reads all');
commit;

-- ===== anon
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.expect_error($$select * from public.children$$, 'permission denied');
select pg_temp.expect_error($$select * from public.presence_heartbeats$$, 'permission denied');
select pg_temp.check((select count(*) from public.ads) = 1, 'anon reads active ads (policy uses is_admin)');
select pg_temp.check((select count(*) from public.app_settings) >= 0, 'anon still reads app_settings');
commit;
select pg_temp.check(not has_function_privilege('anon','public.record_reward(text,integer,text,text)','execute'), 'anon cannot execute record_reward');
select pg_temp.check(not has_function_privilege('anon','public.record_resource(text,text,integer,text,text,timestamptz)','execute'), 'anon cannot execute record_resource');
select pg_temp.check(not has_table_privilege('anon','public.resource_ledger','select'), 'anon cannot read resource_ledger');
select pg_temp.check(not has_table_privilege('anon','public.world_state','select'), 'anon cannot read world_state');
select pg_temp.check(not has_table_privilege('anon','public.achievements','select'), 'anon cannot read achievements');
select pg_temp.check(not has_function_privilege('authenticated','public.redeem_promo(text)','execute'), 'authenticated cannot execute legacy redeem_promo');
select pg_temp.check(has_function_privilege('anon','public.is_admin()','execute'), 'anon can still evaluate is_admin');
select pg_temp.check((select bool_and(active) from public.promo_codes where code in ('KIDDO07','BOLAJON30')), 'launch codes stay active');

-- ===== known, documented gap (M1): the balance is still client-written
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
update public.child_state set coins = 999999 where child_id='ca';
select pg_temp.check((select coins from public.child_state where child_id='ca') = 999999, 'KNOWN GAP: child_state.coins is still client-writable (documented)');
rollback;

-- ===== cascade delete still works with append-only ledger
delete from public.children where id = 'ca';
select pg_temp.check((select count(*) from public.reward_ledger where child_id='ca') = 0, 'ledger: child delete cascades');
select pg_temp.check((select count(*) from public.resource_ledger where child_id='ca') = 0, 'resources: child delete cascades');
select pg_temp.check((select count(*) from public.world_state where child_id='ca') = 0, 'world_state: child delete cascades');
select pg_temp.check((select count(*) from public.achievements where child_id='ca') = 0, 'achievements: child delete cascades');

-- ===== every security definer function pins search_path
select pg_temp.check(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.prosecdef and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
), 'all security definer functions set search_path');
\echo ALL-SQL-ASSERTIONS-PASSED
