\set ON_ERROR_STOP 1
-- fixtures (as superuser)
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','a@x.uz'),
 ('00000000-0000-0000-0000-00000000000b','b@x.uz'),
 ('00000000-0000-0000-0000-0000000000ad','admin@x.uz');
insert into public.admins values ('00000000-0000-0000-0000-0000000000ad');
-- B has confirmed the e-mail address (a promo claim needs it, 0010); A has not
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-00000000000b';
insert into public.children (id,parent_id,name,age,gender,mascot) values
 ('ca','00000000-0000-0000-0000-00000000000a','Ali',5,'boy','boy'),
 ('cb','00000000-0000-0000-0000-00000000000b','Lola',5,'girl','girl');
insert into public.child_state (child_id,parent_id) values ('ca','00000000-0000-0000-0000-00000000000a');
insert into public.payments (id,parent_id,plan,provider,amount) values
 ('pa','00000000-0000-0000-0000-00000000000a','monthly','click',1000),
 ('pb','00000000-0000-0000-0000-00000000000b','monthly','click',1000);
-- B watched an ad 60 s ago (the server's clock decides; 20 s ad)
insert into public.ads (id,title,video_url,duration_s) values ('11111111-1111-1111-1111-111111111111','A','https://x/a.mp4',20);
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
-- birthday gift (0014): exactly 50 and one pet, once a year, only around the birthday
update public.children set birth_date = ((now() at time zone 'Asia/Tashkent')::date - interval '6 years')::date where id = 'ca';
select pg_temp.expect_error($$select public.record_reward('ca',49,'birthday','birthday|' || extract(year from (now() at time zone 'Asia/Tashkent'))::int)$$, 'out_of_bounds');
select pg_temp.expect_error($$select public.record_reward('ca',50,'birthday','birthday|2001')$$, 'not_birthday');
select pg_temp.expect_error($$select public.record_reward('ca',50,'birthday','cake')$$, 'not_birthday');
select pg_temp.expect_error($$select public.record_reward('ca',50,'birthday','birthday|' || extract(year from (now() at time zone 'Asia/Tashkent'))::int || '|dragon')$$, 'bad_purchase');
select pg_temp.check((select (public.record_reward('ca',50,'birthday','birthday|' || extract(year from (now() at time zone 'Asia/Tashkent'))::int || '|bunny')).coins) = 50, 'birthday: 50 coins and a pet in the birthday week');
select pg_temp.check((select count(*) from public.reward_ledger where reason='birthday') = 1, 'birthday: one row');
select public.record_reward('ca',50,'birthday','birthday|' || extract(year from (now() at time zone 'Asia/Tashkent'))::int || '|bunny');
select public.record_reward('ca',50,'birthday','birthday|' || extract(year from (now() at time zone 'Asia/Tashkent'))::int || '|cat');
select public.record_reward('ca',50,'birthday','birthday|' || extract(year from (now() at time zone 'Asia/Tashkent'))::int);
select pg_temp.check((select count(*) from public.reward_ledger where reason='birthday') = 1, 'birthday: once a year, whatever pet is asked again');
update public.child_state set pets = '["bunny","cat"]'::jsonb, pet = 'cat' where child_id = 'ca';
select pg_temp.check((select pets from public.child_state where child_id='ca') = '["bunny"]'::jsonb, 'birthday: the gifted pet is owned, an unpaid one is not');
select pg_temp.check((select pet from public.child_state where child_id='ca') is null, 'birthday: an unowned pet is not the active one');
select pg_temp.expect_error($$select public.record_reward('cb',50,'birthday','birthday|2026')$$, 'not_your_child');
update public.children set birth_date = ((now() at time zone 'Asia/Tashkent')::date - interval '6 years' - interval '20 days')::date where id = 'ca';
select pg_temp.expect_error($$select public.record_reward('ca',50,'birthday','birthday|' || extract(year from (now() at time zone 'Asia/Tashkent'))::int)$$, 'not_birthday');
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
select pg_temp.expect_error($$select public.record_resource('ca','crystal',5,'quest','daily|' || to_char((now() at time zone 'Asia/Tashkent')::date, 'YYYY-MM-DD'))$$, 'out_of_bounds');
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
select pg_temp.check(not has_function_privilege('anon','public.record_reward(text,integer,text,text,timestamptz)','execute'), 'anon cannot execute record_reward');
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
select pg_temp.check((select coins from public.child_state where child_id='ca') <> 999999, 'closed (0009): child_state.coins is no longer client-writable');
rollback;

-- ===== cascade delete still works with append-only ledger
delete from public.children where id = 'ca';
select pg_temp.check((select count(*) from public.reward_ledger where child_id='ca') = 0, 'ledger: child delete cascades');
select pg_temp.check((select count(*) from public.resource_ledger where child_id='ca') = 0, 'resources: child delete cascades');
select pg_temp.check((select count(*) from public.world_state where child_id='ca') = 0, 'world_state: child delete cascades');
select pg_temp.check((select count(*) from public.achievements where child_id='ca') = 0, 'achievements: child delete cascades');

-- ===== private voice (0007)
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000c','c@x.uz'),
 ('00000000-0000-0000-0000-00000000000d','d@x.uz');
insert into public.subscriptions (parent_id, plan, source, expires_at, status) values
 ('00000000-0000-0000-0000-0000000000ad','monthly','payment', now() - interval '1 hour','active'),
 ('00000000-0000-0000-0000-00000000000c','lifetime','payment', null,'active'),
 ('00000000-0000-0000-0000-00000000000d','lifetime','payment', null,'canceled');
insert into storage.objects (bucket_id, name) values ('voice','uz/000cef41.mp3'), ('voice','tts/uz/' || repeat('a',64) || '.mp3');
select pg_temp.check((select public = false from storage.buckets where id = 'voice'), 'voice: bucket exists and is private');
select pg_temp.check((select allowed_mime_types = array['audio/mpeg'] from storage.buckets where id = 'voice'), 'voice: bucket accepts mp3 only');
select pg_temp.check(not exists (
  select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and (coalesce(qual,'') || coalesce(with_check,'')) like '%voice%'
), 'voice: no storage.objects policy mentions the voice bucket');
select pg_temp.check(not exists (
  select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and (qual is null or qual = 'true') and cmd in ('SELECT','ALL')
), 'voice: no storage.objects policy reads every bucket');

-- clients: a PRO parent, an admin and anon all see nothing in the bucket
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'voice') = 0, 'voice: a PRO parent cannot read the objects');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('voice','uz/deadbeef.mp3')$$, 'row-level security');
update storage.objects set name = 'x' where bucket_id = 'voice';
delete from storage.objects where bucket_id = 'voice';
select pg_temp.expect_error($$select public.is_pro_active('00000000-0000-0000-0000-00000000000b')$$, 'permission denied');
select pg_temp.expect_error($$select public.audio_rate_ok('00000000-0000-0000-0000-00000000000b','voice',1000,60)$$, 'permission denied');
select pg_temp.expect_error($$select * from public.tts_cache$$, 'permission denied');
select pg_temp.expect_error($$insert into public.tts_cache (language,text_hash,path) values ('uz', repeat('b',64), 'tts/uz/' || repeat('b',64) || '.mp3')$$, 'permission denied');
select pg_temp.expect_error($$select * from public.audio_requests$$, 'permission denied');
select pg_temp.expect_error($$delete from public.audio_requests$$, 'permission denied');
select pg_temp.expect_error($$select public.audio_daily_count('tts')$$, 'permission denied');
select pg_temp.expect_error($$select * from public.tts_cache_expired(30)$$, 'permission denied');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'voice') = 0, 'voice: an admin client cannot read the objects either');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('voice','uz/deadbeef.mp3')$$, 'row-level security');
commit;
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'voice') = 0, 'voice: anon cannot read the objects');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('voice','uz/deadbeef.mp3')$$, 'row-level security');
select pg_temp.expect_error($$select public.is_pro_active('00000000-0000-0000-0000-00000000000c')$$, 'permission denied');
select pg_temp.expect_error($$select * from public.tts_cache$$, 'permission denied');
commit;
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'voice' and name = 'uz/000cef41.mp3') = 1, 'voice: client update/delete changed nothing');
select pg_temp.check(not has_function_privilege('anon','public.is_pro_active(uuid)','execute'), 'anon cannot execute is_pro_active');
select pg_temp.check(not has_function_privilege('authenticated','public.is_pro_active(uuid)','execute'), 'authenticated cannot execute is_pro_active');
select pg_temp.check(not has_function_privilege('anon','public.audio_rate_ok(uuid,text,integer,integer)','execute'), 'anon cannot execute audio_rate_ok');
select pg_temp.check(not has_function_privilege('authenticated','public.audio_rate_ok(uuid,text,integer,integer)','execute'), 'authenticated cannot execute audio_rate_ok');
select pg_temp.check(not has_function_privilege('anon','public.audio_daily_count(text)','execute') and not has_function_privilege('authenticated','public.audio_daily_count(text)','execute'), 'clients cannot execute audio_daily_count');
select pg_temp.check(not has_function_privilege('anon','public.tts_cache_expired(integer,integer)','execute') and not has_function_privilege('authenticated','public.tts_cache_expired(integer,integer)','execute'), 'clients cannot execute tts_cache_expired');
select pg_temp.check(has_function_privilege('service_role','public.audio_daily_count(text)','execute') and has_function_privilege('service_role','public.tts_cache_expired(integer,integer)','execute'), 'service role executes audio_daily_count and tts_cache_expired');
select pg_temp.check(not has_table_privilege('authenticated','public.tts_cache','select') and not has_table_privilege('anon','public.tts_cache','select'), 'clients hold no select grant on tts_cache');
select pg_temp.check((select c.relrowsecurity from pg_class c where c.oid = 'public.tts_cache'::regclass), 'tts_cache: RLS on');
select pg_temp.check((select c.relrowsecurity from pg_class c where c.oid = 'public.audio_requests'::regclass), 'audio_requests: RLS on');
select pg_temp.check(not exists (select 1 from pg_policies where schemaname='public' and tablename in ('tts_cache','audio_requests')), 'tts_cache/audio_requests: no client policies');

-- service role: reads the bucket, PRO check, rate limit, cache
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'voice') = 2, 'voice: the service role reads the objects');
select pg_temp.check(public.is_pro_active('00000000-0000-0000-0000-00000000000b'), 'is_pro_active: promo PRO (expires in the future)');
select pg_temp.check(public.is_pro_active('00000000-0000-0000-0000-00000000000c'), 'is_pro_active: lifetime (expires_at null)');
select pg_temp.check(not public.is_pro_active('00000000-0000-0000-0000-00000000000a'), 'is_pro_active: no subscription row');
select pg_temp.check(not public.is_pro_active('00000000-0000-0000-0000-0000000000ad'), 'is_pro_active: expired');
select pg_temp.check(not public.is_pro_active('00000000-0000-0000-0000-00000000000d'), 'is_pro_active: canceled lifetime');
select pg_temp.check(not public.is_pro_active(null), 'is_pro_active: null user');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-00000000000b','voice',2,60), 'rate: 1st request allowed');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-00000000000b','voice',2,60), 'rate: 2nd request allowed');
select pg_temp.check(not public.audio_rate_ok('00000000-0000-0000-0000-00000000000b','voice',2,60), 'rate: 3rd request refused');
select pg_temp.check(not public.audio_rate_ok('00000000-0000-0000-0000-00000000000b','voice',2,60), 'rate: still refused');
select pg_temp.check((select count(*) from public.audio_requests where user_id='00000000-0000-0000-0000-00000000000b' and kind='voice') = 2, 'rate: refused requests are not recorded');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-00000000000b','tts',2,60), 'rate: kinds are counted separately');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-00000000000c','voice',2,60), 'rate: users are counted separately');
insert into public.audio_requests (user_id, kind, at) values
 ('00000000-0000-0000-0000-00000000000c','tts', now() - interval '120 seconds'),
 ('00000000-0000-0000-0000-00000000000c','tts', now() - interval '90 seconds'),
 ('00000000-0000-0000-0000-00000000000c','tts', now() - interval '2 days');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-00000000000c','tts',2,60), 'rate: requests outside the window do not count');
select pg_temp.check(not public.audio_rate_ok('00000000-0000-0000-0000-00000000000c','tts',2,600), 'rate: a longer window counts them');
select pg_temp.check(not exists (select 1 from public.audio_requests where at < now() - interval '1 day'), 'rate: rows older than a day are removed');
select pg_temp.expect_error($$select public.audio_rate_ok('00000000-0000-0000-0000-00000000000c','video',2,60)$$, 'bad_kind');
select pg_temp.expect_error($$select public.audio_rate_ok('00000000-0000-0000-0000-00000000000c','voice',0,60)$$, 'bad_limit');
select pg_temp.expect_error($$select public.audio_rate_ok('00000000-0000-0000-0000-00000000000c','voice',5,100000)$$, 'bad_window');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-00000000000c','auth',1,60), 'rate: kind auth is allowed');
select pg_temp.check(not public.audio_rate_ok('00000000-0000-0000-0000-00000000000c','auth',1,60), 'rate: kind auth has its own limit');
select pg_temp.expect_error($$insert into public.audio_requests (user_id, kind) values ('00000000-0000-0000-0000-00000000000c','video')$$, 'audio_requests_kind_check');
-- daily count: every user's tts rows since 00:00 UTC (yesterday's do not count)
select pg_temp.check(public.audio_daily_count('tts') = (select count(*) from public.audio_requests where kind = 'tts' and at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'), 'daily: counts today''s tts rows of all users');
insert into public.audio_requests (user_id, kind, at) values
 ('00000000-0000-0000-0000-00000000000d','tts', date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '1 minute');
select pg_temp.check(public.audio_daily_count('tts') = (select count(*) from public.audio_requests where kind = 'tts') - 1, 'daily: a row from before 00:00 UTC does not count');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-00000000000d','tts',10,60), 'daily: another user''s tts request allowed');
select pg_temp.check(public.audio_daily_count('tts') = (select count(*) from public.audio_requests where kind = 'tts') - 1, 'daily: an allowed tts request of any user counts');
select pg_temp.check(public.audio_daily_count('voice') >= 2 and public.audio_daily_count('auth') = 1, 'daily: kinds are counted separately');
select pg_temp.expect_error($$select public.audio_daily_count('video')$$, 'bad_kind');
insert into public.tts_cache (language, text_hash, path, voice) values ('uz', repeat('a',64), 'tts/uz/' || repeat('a',64) || '.mp3', 'uz-UZ-MadinaNeural');
select pg_temp.check((select count(*) from public.tts_cache) = 1, 'tts_cache: the service role writes and reads');
-- expiry (30-day TTL): only rows older than p_days, oldest first, limited; read-only
insert into public.tts_cache (language, text_hash, path, voice, created_at) values
 ('ru', repeat('e',64), 'tts/ru/' || repeat('e',64) || '.mp3', 'v', now() - interval '31 days'),
 ('en', repeat('f',64), 'tts/en/' || repeat('f',64) || '.mp3', 'v', now() - interval '40 days');
select pg_temp.check((select array_agg(p) from public.tts_cache_expired(30) p) = array['tts/en/' || repeat('f',64) || '.mp3', 'tts/ru/' || repeat('e',64) || '.mp3'], 'tts_cache_expired: the expired paths, oldest first');
select pg_temp.check((select count(*) from public.tts_cache_expired(30, 1)) = 1, 'tts_cache_expired: p_limit caps the list');
select pg_temp.check((select count(*) from public.tts_cache_expired(35)) = 1, 'tts_cache_expired: p_days sets the age');
select pg_temp.check((select count(*) from public.tts_cache) = 3, 'tts_cache_expired: deletes nothing');
select pg_temp.expect_error($$select * from public.tts_cache_expired(0)$$, 'bad_days');
select pg_temp.expect_error($$select * from public.tts_cache_expired(30, 0)$$, 'bad_limit');
delete from public.tts_cache where language in ('ru', 'en');
select pg_temp.expect_error($$insert into public.tts_cache (language, text_hash, path) values ('ru', repeat('c',64), 'tts/uz/' || repeat('c',64) || '.mp3')$$, 'tts_cache_check');
select pg_temp.expect_error($$insert into public.tts_cache (language, text_hash, path) values ('kk', repeat('c',64), 'tts/kk/' || repeat('c',64) || '.mp3')$$, 'tts_cache_language_check');
commit;
select pg_temp.check((select prosecdef from pg_proc where oid = 'public.is_pro_active(uuid)'::regprocedure), 'is_pro_active is security definer');

-- ===== learning memory + AI tutor (0008)
insert into public.children (id,parent_id,name,age,gender,mascot) values
 ('m1','00000000-0000-0000-0000-00000000000a','Ali',5,'boy','boy'),
 ('m2','00000000-0000-0000-0000-00000000000b','Lola',5,'girl','girl');
create function pg_temp.ev(p_child text, p_id text, p_item text, p_hours numeric, p_first boolean,
  p_review boolean default false, p_helped boolean default false, p_hint integer default 1)
returns public.learning_memory language sql as $$
  select public.record_learning_evidence(p_child, p_id, 'math:add:within20', p_item, 4,
    date_trunc('hour', now()) - interval '3 days' + make_interval(secs => (p_hours * 3600)::double precision),
    p_first, p_helped, case when p_first then '{}'::text[] else array['off-by-one'] end,
    case when p_first then 0 else p_hint end, p_review)
$$;
grant execute on all functions in schema pg_temp to authenticated, anon, service_role;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
-- A: one accidental mistake is an observation only
select pg_temp.check((select status from pg_temp.ev('m1','r1|q1','add:8+7',0,false)) = 'observed', 'memory: one mistake is only observed');
select pg_temp.check((select evidence_count from pg_temp.ev('m1','r1|q1','add:8+7',0,false)) = 1, 'memory: the same evidence id counts once');
-- B: the same mistake on another item is confirmed, review tomorrow
select pg_temp.check((select status = 'confirmed' and next_review_at = date_trunc('hour', now()) - interval '3 days' + interval '1 day 30 minutes'
  from pg_temp.ev('m1','r2|q2','add:9+6',0.5,false)), 'memory: two different items confirm it, review the next day');
select pg_temp.check((select items from public.learning_misconceptions where child_id='m1' and code='off-by-one') = array['add:8+7','add:9+6'], 'memory: misconception keeps the items');
-- C: independent practice: improving
select pg_temp.check((select status from pg_temp.ev('m1','r3|q3','add:7+6',1,true)) = 'improving', 'memory: later success turns it to improving');
select pg_temp.check((select status from pg_temp.ev('m1','r4|q4','add:8+5',2,true)) = 'improving', 'memory: two successes stay improving');
select pg_temp.check((select status from pg_temp.ev('m1','r5|q5','add:6+7',3,true)) = 'improving', 'memory: a streak without a spaced review is not resolved');
-- D: the review the next day resolves it (retention), same rules as memory.ts
select pg_temp.check((select status = 'resolved' and next_review_at is null and review_count = 1 and mastery = 0.88
  from pg_temp.ev('m1','r6|q6','add:9+4',26,true,true)), 'memory: a spaced review answered alone resolves it (mastery 0.88 as in memory.ts)');
select pg_temp.check((select resolved_at is not null from public.learning_misconceptions where child_id='m1' and code='off-by-one'), 'memory: resolved_at is kept');
-- a slip after resolving starts again as one observation
select pg_temp.check((select status from pg_temp.ev('m1','r7|q7','add:6+9',40,false)) = 'observed', 'memory: a slip after resolving makes the skill observed');
select pg_temp.check((select count = 1 and status = 'observed' and items = array['add:6+9'] from public.learning_misconceptions
  where child_id='m1' and code='off-by-one'), 'memory: a slip after resolving is a single observation again');
-- 0013 (Mistake Garden): the child got past it once; that fact stays
select pg_temp.check((select resolved_at is not null from public.learning_misconceptions
  where child_id='m1' and code='off-by-one'), 'memory: a slip after resolving keeps resolved_at');
-- the browser cannot write memory or consent directly
select pg_temp.expect_error($$update public.learning_memory set mastery = 1 where child_id='m1'$$, 'permission denied');
select pg_temp.expect_error($$insert into public.learning_memory (child_id,parent_id,skill_key,first_at,last_practiced_at,mastery) values ('m1','00000000-0000-0000-0000-00000000000a','math:sub:within10',now(),now(),1)$$, 'permission denied');
select pg_temp.expect_error($$update public.learning_misconceptions set status = 'resolved'$$, 'permission denied');
select pg_temp.expect_error($$delete from public.learning_memory$$, 'permission denied');
select pg_temp.expect_error($$select * from public.learning_evidence$$, 'permission denied');
-- forged child id and bad shapes
select pg_temp.expect_error($$select pg_temp.ev('m2','x|1','add:1+1',0,false)$$, 'not_your_child');
select pg_temp.expect_error($$select pg_temp.ev('nobody','x|1','add:1+1',0,false)$$, 'no_child');
select pg_temp.expect_error($$select public.record_learning_evidence('m1','x|2','math:add:within20','My name is Ali',4,now(),false,false,'{}',1,false)$$, 'bad_item');
select pg_temp.expect_error($$select public.record_learning_evidence('m1','x|3','phone:+998901234567','add:1+1',4,now(),false,false,'{}',1,false)$$, 'bad_skill');
select pg_temp.expect_error($$select public.record_learning_evidence('m1','x|4','math:add:within20','add:1+1',4,now(),false,false,'{}',7,false)$$, 'bad_hint');
select pg_temp.expect_error($$select public.record_learning_evidence('m1','x|5','math:add:within20','add:1+1',4,null,false,false,'{}',1,false)$$, 'bad_time');
select pg_temp.check((select last_practiced_at <= now() from public.record_learning_evidence('m1','x|6','math:sub:within10','sub:5-1',4,now() + interval '1 hour',true,false,'{}',0,false)), 'memory: a device clock ahead of the server is clamped, not refused');
-- two different items in ONE session stay an observation (hurried taps)
select public.record_learning_evidence('m1','same|1','math:missing:add','missing:a+?=s:3:5',3,now() - interval '1 hour',false,false,array['off-by-one'],1,false);
select pg_temp.check((select status from public.record_learning_evidence('m1','same|2','math:missing:add','missing:a+?=s:2:6',3,now() - interval '50 minutes',false,false,array['off-by-one'],1,false)) = 'observed', 'memory: one session never confirms a misconception');
select pg_temp.check((select count(*) from public.learning_memory) = 3 and (select count(distinct child_id) from public.learning_memory) = 1, 'memory: parent reads own child only');
-- consent: only through the RPC, only for own children
select pg_temp.check((select granted from public.set_ai_consent('m1', true, '1')), 'consent: parent switches the tutor on for own child');
select pg_temp.expect_error($$select public.set_ai_consent('m2', true, '1')$$, 'not_your_child');
select pg_temp.expect_error($$select public.set_ai_consent('m1', true, 'v1; drop')$$, 'bad_version');
select pg_temp.expect_error($$insert into public.ai_consent (child_id,parent_id,granted,policy_version) values ('m2','00000000-0000-0000-0000-00000000000a',true,'1')$$, 'permission denied');
select pg_temp.expect_error($$update public.ai_consent set granted = true$$, 'permission denied');
select pg_temp.check((select count(*) from public.ai_consent) = 1, 'consent: parent reads own consent');
select pg_temp.expect_error($$select public.ai_consent_ok('00000000-0000-0000-0000-00000000000a','m1','1')$$, 'permission denied');
select pg_temp.expect_error($$select * from public.ai_cache$$, 'permission denied');
select pg_temp.expect_error($$select * from public.ai_usage$$, 'permission denied');
select pg_temp.expect_error($$select * from public.ai_provider_state$$, 'permission denied');
select pg_temp.expect_error($$select public.ai_housekeeping()$$, 'permission denied');
commit;

-- 0013: when that slip goes stale (14 days) the skill is resolved again, not forgotten
update public.learning_misconceptions set last_at = last_at - interval '20 days', first_at = first_at - interval '20 days'
  where child_id='m1' and skill_key='math:add:within20' and code='off-by-one';
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select pg_temp.check((select status from pg_temp.ev('m1','r8|q8','add:5+5',41,true)) = 'resolved', 'memory: a stale slip after resolving returns to resolved');
select pg_temp.check((select status = 'resolved' and resolved_at is not null from public.learning_misconceptions
  where child_id='m1' and skill_key='math:add:within20' and code='off-by-one'), 'memory: resolved again, not forgotten');
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select pg_temp.check((select count(*) from public.learning_memory) = 0, 'memory: another family sees nothing (select)');
select pg_temp.check((select count(*) from public.learning_misconceptions) = 0, 'memory: another family sees no misconceptions');
select pg_temp.check((select count(*) from public.ai_consent) = 0, 'consent: another family sees nothing');
select pg_temp.expect_error($$select pg_temp.ev('m1','b|1','add:1+1',0,false)$$, 'not_your_child');
select pg_temp.expect_error($$update public.learning_memory set mastery = 0 where child_id='m1'$$, 'permission denied');
select pg_temp.check((select status from pg_temp.ev('m2','b|2','add:3+4',0,true)) = 'new', 'memory: B records for own child');
commit;

begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.expect_error($$select public.record_learning_evidence('m1','z|1','math:add:within20','add:1+1',4,now(),true,false,'{}',0,false)$$, 'permission denied');
select pg_temp.expect_error($$select * from public.learning_memory$$, 'permission denied');
commit;

begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select pg_temp.check(public.ai_consent_ok('00000000-0000-0000-0000-00000000000a','m1','1'), 'consent: the tutor function sees A''s consent for m1');
select pg_temp.check(not public.ai_consent_ok('00000000-0000-0000-0000-00000000000a','m1','2'), 'consent: a new policy version needs consent again');
select pg_temp.check(not public.ai_consent_ok('00000000-0000-0000-0000-00000000000b','m1','1'), 'consent: not for another parent');
select pg_temp.check(not public.ai_consent_ok('00000000-0000-0000-0000-00000000000b','m2','1'), 'consent: not without a consent row');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-00000000000a','ai',2,60) and public.audio_rate_ok('00000000-0000-0000-0000-00000000000a','ai',2,60), 'ai rate: allowed under the limit');
select pg_temp.check(not public.audio_rate_ok('00000000-0000-0000-0000-00000000000a','ai',2,60), 'ai rate: refused at the limit');
select pg_temp.check(public.audio_daily_count('ai') = 2, 'ai rate: daily count of ai requests');
insert into public.ai_provider_state (provider, cooldown_until) values ('gemini-free', now() + interval '15 minutes');
insert into public.ai_cache (key_hash, language, reply, created_at) values (repeat('a',64),'uz','{"message":"Qani"}', now() - interval '31 days');
insert into public.ai_usage (provider, model, outcome, latency_bucket, policy_version) values ('gemini-free','gemini-3.8-flash','ok','lt1s','1');
select pg_temp.expect_error($$insert into public.ai_usage (provider, model, outcome, latency_bucket, policy_version) values ('x','y','paid','lt1s','1')$$, 'ai_usage_outcome_check');
select pg_temp.expect_error($$insert into public.ai_cache (key_hash, language, reply) values ('not-a-hash','uz','{}')$$, 'ai_cache_key_hash_check');
select pg_temp.check(public.ai_housekeeping() = 1, 'housekeeping: removes the expired rows only');
select pg_temp.check((select count(*) from public.ai_cache) = 0 and (select count(*) from public.ai_usage) = 1, 'housekeeping: expired cache rows go, recent telemetry stays');
commit;
select pg_temp.check((select prosecdef from pg_proc where oid = 'public.record_learning_evidence(text,text,text,text,integer,timestamptz,boolean,boolean,text[],integer,boolean)'::regprocedure), 'record_learning_evidence is security definer');
delete from public.children where id = 'm1';
select pg_temp.check((select count(*) from public.learning_memory where child_id='m1') = 0 and (select count(*) from public.learning_misconceptions where child_id='m1') = 0 and (select count(*) from public.ai_consent where child_id='m1') = 0, 'memory: child delete cascades');

-- ===== 0009: balance and paid items come from the ledger
insert into public.children (id,parent_id,name,age,gender,mascot) values ('cd','00000000-0000-0000-0000-00000000000a','Dilshod',6,'boy','boy');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select public.record_reward('cd', 150, 'learn', 'cd-l1');
insert into public.child_state (child_id, coins) values ('cd', 99999)
  on conflict (child_id) do update set coins = excluded.coins;
select pg_temp.check((select coins from public.child_state where child_id='cd') = (select coalesce(sum(coins),0) from public.reward_ledger where child_id='cd'), 'balance: a forged coins value is replaced by the ledger sum');
update public.child_state set coins = 1000000 where child_id = 'cd';
select pg_temp.check((select coins from public.child_state where child_id='cd') < 1000, 'balance: a direct update cannot raise it');
update public.child_state set outfits = '{crown,cap}', wearing = '{"head":"cap"}', pets = '["cat"]', pet = 'cat' where child_id = 'cd';
select pg_temp.check((select outfits = '{}' and wearing = '{}'::jsonb and pets = '[]'::jsonb and pet is null from public.child_state where child_id='cd'), 'items: unpaid outfits, wearing and pets are dropped');
select public.record_reward('cd', -40, 'purchase', 'outfit|crown|u1');
select public.record_reward('cd', -75, 'purchase', 'pet|cat|u2');
select pg_temp.expect_error($$select public.record_reward('cd', -1, 'purchase', 'outfit|cap|cheap')$$, 'bad_purchase');
select pg_temp.expect_error($$select public.record_reward('cd', -5, 'purchase', 'pet|dragon|x')$$, 'bad_purchase');
select pg_temp.expect_error($$select public.record_reward('cd', -40, 'purchase', 'outfit|crown|again')$$, 'already_owned');
update public.child_state set outfits = '{crown,cap}', wearing = '{"head":"crown","neck":"cap"}', pets = '["cat","bunny"]', pet = 'cat' where child_id = 'cd';
select pg_temp.check((select outfits = '{crown}' and wearing = '{"head":"crown"}'::jsonb and pets = '["cat"]'::jsonb and pet = 'cat' from public.child_state where child_id='cd'), 'items: a paid outfit and pet stay, the rest go');
select pg_temp.check((select coins from public.child_state where child_id='cd') = (select coalesce(sum(coins),0) from public.reward_ledger where child_id='cd'), 'balance: a purchase lowers the stored balance at once');
select pg_temp.expect_error($$select public.record_reward('cd', -1000, 'purchase', 'too-much')$$, 'insufficient_coins');
select pg_temp.expect_error($$select public.record_reward('cd', -1000, 'penalty', 'too-much-2')$$, 'insufficient_coins');
select pg_temp.expect_error($$select public.record_reward('cd', 500, 'opening-balance', 'opening')$$, 'bad_reason');
select pg_temp.expect_error($$insert into public.grandfathered_items values ('cd','outfit','crown')$$, 'permission denied');
select pg_temp.expect_error($$select public.open_balances()$$, 'permission denied');
select pg_temp.expect_error($$select public.child_coin_balance('cb')$$, 'permission denied');
-- the other family's state cannot be touched at all
update public.child_state set outfits = '{}' where child_id = 'cb';
select pg_temp.expect_error($$insert into public.child_state (child_id, parent_id) values ('cb','00000000-0000-0000-0000-00000000000b')$$, 'row-level security');
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select public.record_reward('cd', 25, 'admin', 'grant-1');
commit;
select pg_temp.check((select coins from public.child_state where child_id='cd') = public.child_coin_balance('cd'), 'balance: an admin grant through record_reward shows at once');

-- coins and items from before the ledger are kept (the migration's opening)
insert into public.children (id,parent_id,name,age,gender,mascot) values ('cc','00000000-0000-0000-0000-00000000000b','Old',6,'boy','boy');
alter table public.child_state disable trigger child_state_server_authority;
insert into public.child_state (child_id,parent_id,coins,outfits,pets,pet) values ('cc','00000000-0000-0000-0000-00000000000b',70,'{flower}','["parrot"]','parrot');
alter table public.child_state enable trigger child_state_server_authority;
select pg_temp.check(public.open_balances() = 1 and public.open_balances() = 0, 'opening: one entry per child, idempotent');
update public.child_state set updated_at = now() where child_id = 'cc';
select pg_temp.check((select coins = 70 and outfits = '{flower}' and pet = 'parrot' from public.child_state where child_id='cc'), 'opening: legacy coins, outfits and pet are kept');
delete from public.children where id = 'cc';
select pg_temp.check((select count(*) from public.grandfathered_items where child_id='cc') = 0 and (select count(*) from public.reward_ledger where child_id='cc') = 0, 'opening: child delete cascades');

-- ===== 0010: integrity hardening (Phase 13 audit)
insert into public.children (id,parent_id,name,age,gender,mascot) values ('ce','00000000-0000-0000-0000-00000000000a','Ezoza',6,'girl','girl');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
-- a year of backdated daily caps is no longer one call loop away
do $$
declare v_refused boolean := false;
begin
  for d in 3..362 loop
    for k in 1..2 loop
      begin
        perform public.record_resource('ce','star',3,'activity','hist-'||d||'-'||k, now() - make_interval(days => d));
      exception when others then
        if sqlerrm like '%history_cap%' then v_refused := true; exit; end if;
        raise;
      end;
    end loop;
    exit when v_refused;
  end loop;
  perform pg_temp.check(v_refused, 'history: backdated uploads stop at the lifetime budget');
end $$;
select pg_temp.check((select sum(amount) from public.resource_ledger where child_id='ce' and resource='star') <= 1500, 'history: no more than the budget was paid');
select pg_temp.check((select (public.record_resource('ce','star',3,'activity','today-1')).amount) = 3, 'history: today''s play still pays');
select pg_temp.expect_error($$select public.record_resource('ce','crystal',1,'quest','daily|1900-01-01', now() - interval '900 days')$$, 'bad_ref');
select pg_temp.expect_error($$select public.record_resource('ce','crystal',1,'quest','daily|' || to_char((now() at time zone 'Asia/Tashkent')::date - 3, 'YYYY-MM-DD'))$$, 'bad_ref');
select pg_temp.check((select (public.record_resource('ce','crystal',1,'quest','daily|' || to_char((now() at time zone 'Asia/Tashkent')::date - 1, 'YYYY-MM-DD'), now() - interval '1 day')).amount) = 1, 'quest: yesterday''s crystal on yesterday');
-- buildings: real ones, full price, stars
select pg_temp.expect_error($$select public.record_building_level('ce','anything-i-like',1)$$, 'bad_building');
select public.record_resource('ce','crystal',1,'three-stars','c-'||g) from generate_series(1,3) g;
select public.record_resource('ce','crystal',-1,'upgrade','upgrade|math-land|1');
select pg_temp.check((select (public.record_building_level('ce','math-land',1)).buildings ->> 'math-land') = '1', 'buildings: level 1 for its price');
select public.record_resource('ce','crystal',-1,'upgrade','upgrade|math-land|2');
select pg_temp.expect_error($$select public.record_building_level('ce','math-land',2)$$, 'not_paid');
select public.record_resource('ce','crystal',-1,'upgrade','upgrade|robot-workshop|1');
select pg_temp.expect_error($$select public.record_building_level('ce','robot-workshop',1)$$, 'not_paid');
commit;
-- stars: a child with crystals but no stars cannot take level 2
insert into public.children (id,parent_id,name,age,gender,mascot) values ('cf','00000000-0000-0000-0000-00000000000a','Farid',6,'boy','boy');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select public.record_resource('cf','crystal',1,'three-stars','f-'||g) from generate_series(1,3) g;
select public.record_resource('cf','crystal',-1,'upgrade','upgrade|garden|1');
select public.record_building_level('cf','garden',1);
select public.record_resource('cf','crystal',-2,'upgrade','upgrade|garden|2');
select pg_temp.expect_error($$select public.record_building_level('cf','garden',2)$$, 'not_enough_stars');
-- ads: A has not confirmed the e-mail; too many starts are refused
select pg_temp.expect_error($$select public.claim_promo('22222222-2222-2222-2222-222222222222')$$, 'email_not_confirmed');
do $$
declare v_refused boolean := false;
begin
  for i in 1..11 loop
    begin
      perform public.start_ad_view('11111111-1111-1111-1111-111111111111');
    exception when others then
      if sqlerrm like '%too_many_views%' then v_refused := true; exit; end if;
      raise;
    end;
  end loop;
  perform pg_temp.check(v_refused, 'ads: an account cannot start ads without end');
end $$;
-- child_events only for own children
select pg_temp.expect_error($$insert into public.child_events (id, child_id, kind) values ('ev-x','cb','opened')$$, 'row-level security');
commit;
-- a short ad still needs 15 s before a claim
select pg_temp.expect_error($$insert into public.ads (title,video_url,duration_s) values ('Tiny','https://x/t.mp4',1)$$, 'ads_min_duration');
insert into public.ads (id,title,video_url,duration_s) values ('33333333-3333-3333-3333-333333333333','Short','https://x/s.mp4',20);
insert into auth.users (id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000ce','ce@x.uz', now());
insert into public.ad_views (id,user_id,ad_id,started_at) values
 ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-0000000000ce','33333333-3333-3333-3333-333333333333', now() - interval '5 seconds');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ce","role":"authenticated"}', true);
select pg_temp.expect_error($$select public.claim_promo('44444444-4444-4444-4444-444444444444')$$, 'not_finished');
commit;
-- a deleted child id never comes back; at most five new profiles a day
delete from public.children where id = 'cf';
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select pg_temp.expect_error($$insert into public.children (id,name,age,gender,mascot) values ('cf','Again',6,'boy','boy')$$, 'child_id_used');
do $$
declare v_refused boolean := false;
begin
  for i in 1..6 loop
    begin
      insert into public.children (id,name,age,gender,mascot) values ('new-'||i,'N',5,'boy','boy');
      delete from public.children where id = 'new-'||i;
    exception when others then
      if sqlerrm like '%too_many_new_children%' then v_refused := true; exit; end if;
      raise;
    end;
  end loop;
  perform pg_temp.check(v_refused, 'children: no endless new profiles to reset the caps');
end $$;
commit;
select pg_temp.check((select count(*) from public.deleted_children where child_id='cf') = 1 and (select count(*) from public.resource_ledger where child_id='cf') = 0, 'children: a deleted child leaves only its id');
begin;
set local role anon;
select pg_temp.expect_error($$insert into public.app_settings (key, value) values ('x', '1')$$, 'permission denied');
select pg_temp.expect_error($$insert into public.ads (title, video_url, duration_s) values ('x','https://x/x.mp4',5)$$, 'permission denied');
commit;

-- ===== Phase 13 critic fixes
-- yesterday's finished quest can be claimed today
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select pg_temp.check((select (public.record_resource('cd','crystal',1,'quest','daily|' || to_char((now() at time zone 'Asia/Tashkent')::date - 1, 'YYYY-MM-DD'), now())).earned_at) > now() - interval '1 minute', 'quest: yesterday''s finished quest can be claimed today');
commit;
-- after the account exists: up to 30 days late with per-day caps, not older
insert into auth.users (id,email,email_confirmed_at,created_at) values ('00000000-0000-0000-0000-0000000000d1','old@x.uz', now(), now() - interval '200 days');
insert into public.children (id,parent_id,name,age,gender,mascot) values ('cg','00000000-0000-0000-0000-0000000000d1','Gulnora',6,'girl','girl');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}', true);
select public.record_resource('cg','part',1,'number-3star','late-'||d||'-'||k, now() - make_interval(days => d)) from generate_series(3,12) d, generate_series(1,3) k;
select pg_temp.check((select sum(amount) from public.resource_ledger where child_id='cg' and resource='part') = 30, 'late: a tablet that syncs after ten days keeps every part');
select pg_temp.check((select (public.record_resource('cg','star',3,'activity','offline-long', now() - interval '45 days')).amount) = 3, 'late: a tablet offline for weeks still syncs (lifetime budget)');
-- a new family brings its device balance and items once
select pg_temp.check(public.record_opening_balance('cg', 9999, '{crown,unicorn}', '{cat,dragon}'), 'opening: a new family''s balance is opened');
select pg_temp.check(not public.record_opening_balance('cg', 9999, '{crown}', '{}'), 'opening: only once');
insert into public.child_state (child_id, coins, outfits, wearing, pets, pet) values ('cg', 1, '{crown,unicorn,cap}', '{"head":"crown"}', '["cat","dragon"]', 'cat');
select pg_temp.check((select coins = 9999 and outfits = '{crown}' and wearing = '{"head":"crown"}'::jsonb and pets = '["cat"]'::jsonb and pet = 'cat' from public.child_state where child_id='cg'), 'opening: the coins (under the 20000 cap since 0017), only real items, kept in the stored state');
select pg_temp.check((select (public.record_reward('cg', -15, 'purchase', 'outfit|cap|n1')).coins) = -15, 'opening: the next purchase is accepted');
select pg_temp.expect_error($$select public.record_opening_balance('cb', 100, '{}', '{}')$$, 'not_your_child');
commit;
-- a child that already earned on the server gets no opening
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select pg_temp.check(not public.record_opening_balance('cd', 500, '{}', '{}'), 'opening: not for a child with ledger rows');
-- the client's created_at cannot dodge the new-profile limit
do $$
declare v_refused boolean := false;
begin
  for i in 1..7 loop
    begin
      insert into public.children (id,name,age,gender,mascot,created_at) values ('back-'||i,'B',5,'boy','boy', now() - interval '10 days');
    exception when others then
      if sqlerrm like '%too_many_new_children%' then v_refused := true; exit; end if;
      raise;
    end;
  end loop;
  perform pg_temp.check(v_refused, 'children: a backdated created_at does not dodge the limit');
end $$;
commit;
-- a whole account (with children) can still be deleted
begin;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d1';
select pg_temp.check((select count(*) from public.children where id = 'cg') = 0 and (select count(*) from public.deleted_children where child_id = 'cg') = 0, 'account delete: children and their data go, no tombstone left');
commit;

-- ===== 0010: audio limits per account and day
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-0000000000ce','voice',100,60,2) and public.audio_rate_ok('00000000-0000-0000-0000-0000000000ce','voice',100,60,2), 'audio: allowed under the daily limit');
select pg_temp.check(not public.audio_rate_ok('00000000-0000-0000-0000-0000000000ce','voice',100,60,2), 'audio: refused at the daily limit, even with room in the short window');
select pg_temp.check(public.audio_rate_ok('00000000-0000-0000-0000-0000000000ce','synth',100,86400,100), 'audio: a real synthesis is allowed');
select pg_temp.check(public.audio_daily_count('synth') = 1, 'audio: real synthesis is counted on its own');
commit;
select pg_temp.check(not has_function_privilege('authenticated','public.audio_rate_ok(uuid,text,integer,integer,integer)','execute') and not has_function_privilege('anon','public.audio_rate_ok(uuid,text,integer,integer,integer)','execute'), 'audio: the limit function is service-only');

-- ===== 0011: the connected world (finds, garden beds, journey rewards)
insert into auth.users (id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000d2','w@x.uz', now());
insert into public.children (id,parent_id,name,age,gender,mascot) values ('cj','00000000-0000-0000-0000-0000000000d2','Jasur',6,'boy','boy');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}', true);
select pg_temp.expect_error($$insert into public.world_rules values ('discovery','x','seed',5,'activity','r')$$, 'permission denied');
select pg_temp.expect_error($$select public.record_resource('cj','seed',1,'discovery','moon-seed')$$, 'bad_ref');
select pg_temp.expect_error($$select public.record_resource('cj','crystal',1,'discovery','mars-seed')$$, 'bad_reason');
select pg_temp.expect_error($$select public.record_resource('cj','seed',5,'discovery','mars-seed')$$, 'out_of_bounds');
-- the Mars seed needs the rocket's first level paid
select pg_temp.expect_error($$select public.record_resource('cj','seed',1,'discovery','mars-seed')$$, 'not_unlocked');
select pg_temp.expect_error($$select public.record_resource('cj','seed',-1,'plant','plot|mars')$$, 'not_unlocked');
select pg_temp.expect_error($$select public.record_resource('cj','crystal',2,'journey','journey|first-flight')$$, 'not_unlocked');
select public.record_resource('cj','crystal',1,'three-stars','math-lab:count:L1');
select public.record_resource('cj','part',1,'number-3star','math-lab:count:L1|2026-10-24');
select public.record_resource('cj','crystal',-1,'upgrade','upgrade|spaceport|1');
select pg_temp.expect_error($$select public.record_building_level('cj','spaceport',1)$$, 'not_paid');
select public.record_resource('cj','part',-1,'upgrade','upgrade|spaceport|1');
select pg_temp.check((select (public.record_building_level('cj','spaceport',1)).buildings ->> 'spaceport') = '1', 'world: the rocket is built for crystal and part');
select pg_temp.check((select (public.record_resource('cj','seed',1,'discovery','mars-seed')).amount) = 1, 'world: the Mars seed once the rocket flies');
select pg_temp.check((select (public.record_resource('cj','seed',1,'discovery','mars-seed')).amount) = 1 and (select count(*) from public.resource_ledger where child_id='cj' and reason='discovery') = 1, 'world: a find is paid once');
select pg_temp.expect_error($$select public.record_resource('cj','seed',1,'plant','plot|mars')$$, 'out_of_bounds');
select pg_temp.check((select (public.record_resource('cj','seed',-1,'plant','plot|mars')).amount) = -1, 'world: the seed is planted');
select pg_temp.check((select sum(amount) from public.resource_ledger where child_id='cj' and resource='seed') = 0, 'world: planting spent the seed');
select pg_temp.expect_error($$select public.record_resource('cj','crystal',5,'journey','journey|first-flight')$$, 'out_of_bounds');
select pg_temp.check((select (public.record_resource('cj','crystal',2,'journey','journey|first-flight')).amount) = 2, 'world: the journey reward after planting');
select pg_temp.check((select (public.record_resource('cj','crystal',2,'journey','journey|first-flight')).amount) = 2 and (select count(*) from public.resource_ledger where child_id='cj' and reason='journey') = 1, 'world: the journey pays once');
select pg_temp.expect_error($$select public.record_resource('cb','seed',1,'discovery','mars-seed')$$, 'not_your_child');
select pg_temp.check((select count(*) from public.building_levels where building in ('spaceport','mistake-garden','science-lab')) = 9, 'world: the new buildings have prices');
commit;

-- ===== 0012: no age ceiling for learning (form 4 to 18, synced age up to 25)
insert into public.children (id,parent_id,name,age,gender,mascot) values ('ck','00000000-0000-0000-0000-0000000000d2','Kamola',16,'girl','girl');
select pg_temp.check((select age from public.children where id='ck') = 16, 'age: a sixteen-year-old profile is allowed');
-- 0014: no maximum age (Phase 22); only an impossible age is refused
insert into public.children (id,parent_id,name,age,gender,mascot) values ('cl','00000000-0000-0000-0000-0000000000d2','Dilshod',40,'boy','boy');
select pg_temp.check((select age from public.children where id='cl') = 40, 'age: a forty-year-old learner is allowed');
select pg_temp.expect_error($$insert into public.children (id,parent_id,name,age,gender,mascot) values ('cm','00000000-0000-0000-0000-0000000000d2','X',2,'girl','girl')$$, 'children_age_check');

-- ===== 0016: anonymous analytics (anyone adds through the function, only an admin reads counts)
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.check(public.add_analytics_events(('['||'{"id":"evt-00000001","install":"install-0001","name":"app_closed","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'","screen":"/worlds/dino"}'||','||'{"id":"evt-00000002","install":"install-0001","name":"app_opened","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||']')::jsonb) = 2, 'analytics: a batch is added');
select pg_temp.check(public.add_analytics_events(('['||'{"id":"evt-00000001","install":"install-0001","name":"app_closed","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'","screen":"/worlds/dino"}'||']')::jsonb) = 0, 'analytics: an event sent twice is ignored');
-- a bad event is skipped, the good ones in its batch are kept
select pg_temp.check(public.add_analytics_events(('['||'{"id":"evt-00000003","install":"install-0001","name":"child_name","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||','||'{"id":"evt-00000004","install":"install-0001","name":"app_closed","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'","screen":"/Aziz Karimov"}'||','||'{"id":"evt-00000005","install":"install-0001","name":"app_opened","day":"2020-01-01","at":"'||now()||'"}'||','||'{"id":"evt-00000007","install":"install-0001","name":"app_opened","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||']')::jsonb) = 1, 'analytics: bad events are skipped, the good one is kept');
select pg_temp.check(public.add_analytics_events('[{"id":"evt-00000008","install":"install-0001","name":"app_opened","day":"tomorrow","at":"soon"}]'::jsonb) = 0, 'analytics: a malformed day or time is skipped, never an error');
select pg_temp.expect_error($q$select public.add_analytics_events(('['||'{"id":"evt-00000009","install":"install-0001","name":"app_opened","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||','||'{"id":"evt-00000010","install":"install-0002","name":"app_opened","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||']')::jsonb)$q$, 'bad_batch');
select pg_temp.expect_error($q$select public.add_analytics_events((select jsonb_agg(x) from generate_series(1,101) x))$q$, 'bad_batch');
-- a flood from one install stops at 200 events a day
select pg_temp.check(
  public.add_analytics_events((select jsonb_agg(jsonb_build_object('id','flood-'||lpad(i::text,6,'0'),'install','install-flood','name','activity_opened','day',(now() at time zone 'Asia/Tashkent')::date,'at',now(),'screen','/home')) from generate_series(1,100) i))
  + public.add_analytics_events((select jsonb_agg(jsonb_build_object('id','flood-'||lpad(i::text,6,'0'),'install','install-flood','name','activity_opened','day',(now() at time zone 'Asia/Tashkent')::date,'at',now(),'screen','/home')) from generate_series(101,200) i))
  + public.add_analytics_events((select jsonb_agg(jsonb_build_object('id','flood-'||lpad(i::text,6,'0'),'install','install-flood','name','activity_opened','day',(now() at time zone 'Asia/Tashkent')::date,'at',now(),'screen','/home')) from generate_series(201,250) i))
  = 200, 'analytics: at most 200 events per install and day');
select pg_temp.expect_error($$insert into public.analytics_events (id,install_id,name,day,at) values ('evt-00000006','install-0001','app_opened',current_date, now())$$, 'permission denied');
select pg_temp.expect_error($$select count(*) from public.analytics_events$$, 'permission denied');
select pg_temp.expect_error($$select * from public.admin_analytics_funnel(30)$$, 'permission denied');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select pg_temp.expect_error($$select count(*) from public.analytics_events$$, 'permission denied');
select pg_temp.expect_error($$select * from public.admin_analytics_funnel(30)$$, 'not_admin');
select pg_temp.expect_error($$select * from public.admin_analytics_exits(30)$$, 'not_admin');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select pg_temp.check((select count(*) from public.admin_analytics_funnel(30)) = 0, 'analytics: no install first opened in the period, an empty funnel');
select pg_temp.check((select closes from public.admin_analytics_exits(30) where screen='/worlds/dino') = 1, 'analytics: where the app was left, for an admin');
commit;
-- a cohort: install-0003 is new in the period and reaches two steps; it left twice in a day, the last place counts
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.check(public.add_analytics_events(('['||'{"id":"evt-00000011","install":"install-0003","name":"first_opened","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||','||'{"id":"evt-00000012","install":"install-0003","name":"app_opened","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||','||'{"id":"evt-00000013","install":"install-0003","name":"app_closed","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||(now() - interval '1 minute')||'","screen":"/home"}'||','||'{"id":"evt-00000014","install":"install-0003","name":"app_closed","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'","screen":"/math-lab"}'||']')::jsonb) = 4, 'analytics: a new install sends its first steps');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select pg_temp.check((select installs from public.admin_analytics_funnel(30) where name='first_opened') = 1 and (select installs from public.admin_analytics_funnel(30) where name='app_opened') = 1, 'analytics: the funnel counts only installs first opened in the period');
select pg_temp.check((select closes from public.admin_analytics_exits(30) where screen='/math-lab') = 1 and not exists (select 1 from public.admin_analytics_exits(30) where screen='/home'), 'analytics: the last leaving of a day counts');
commit;

-- ===== 0017: yong‘oq, one currency (the conversion, nut-paid building levels)
insert into auth.users (id,email,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000e1','nuts@x.uz', now());
insert into public.children (id,parent_id,name,age,gender,mascot) values ('cn','00000000-0000-0000-0000-0000000000e1','Nodira',6,'girl','girl');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
-- held before Phase 39: 2 crystals, 1 part (worth 25 nuts)
select public.record_resource('cn','crystal',1,'three-stars','n-'||g) from generate_series(1,2) g;
select public.record_resource('cn','part',1,'number-3star','n-p|2026-01-01');
-- the conversion's spends: a device that held more converts only what the server has
select pg_temp.check((select (public.record_resource('cn','crystal',-5,'conversion','conversion|v1')).amount) = -2, 'nuts: the conversion takes what the server holds');
select public.record_resource('cn','part',-1,'conversion','conversion|v1');
select pg_temp.check((select coalesce(sum(amount),0) from public.resource_ledger where child_id='cn' and resource in ('crystal','part')) = 0, 'nuts: nothing is left after the conversion');
select pg_temp.check((select (public.record_resource('cn','scroll',-3,'conversion','conversion|v1')).id) is null, 'nuts: nothing held, nothing converted (no error)');
select pg_temp.expect_error($$select public.record_resource('cn','star',-1,'conversion','conversion|v1')$$, 'bad_reason');
select pg_temp.expect_error($$select public.record_resource('cn','crystal',-1,'conversion','conversion|v2')$$, 'bad_ref');
select pg_temp.expect_error($$select public.record_resource('cn','crystal',1,'conversion','conversion|v1')$$, 'bad_sign');
-- the nuts: at most what was converted, once
select pg_temp.check((select (public.record_reward('cn',100,'conversion','conversion|v1')).coins) = 25, 'nuts: the conversion pays what was converted, no more');
select pg_temp.check((select (public.record_reward('cn',100,'conversion','conversion|v1')).coins) = 25, 'nuts: the conversion is paid once');
select pg_temp.expect_error($$select public.record_reward('cn',10,'conversion','conversion|v2')$$, 'out_of_bounds');
select pg_temp.expect_error($$select public.record_reward('cb',10,'conversion','conversion|v1')$$, 'not_your_child');
-- a building level paid in nuts: its exact price (math-land 1 = 10; robot-workshop 1 = 15)
select pg_temp.expect_error($$select public.record_reward('cn',-9,'purchase','upgrade|math-land|1')$$, 'bad_purchase');
select pg_temp.expect_error($$select public.record_reward('cn',-10,'purchase','upgrade|nowhere|1')$$, 'bad_purchase');
select pg_temp.expect_error($$select public.record_reward('cn',-10,'purchase','upgrade|math-land|9')$$, 'bad_purchase');
select pg_temp.check((select (public.record_reward('cn',-10,'purchase','upgrade|math-land|1')).coins) = -10, 'nuts: a level is bought at its price');
select pg_temp.check((select (public.record_building_level('cn','math-land',1)).buildings ->> 'math-land') = '1', 'nuts: a level paid in nuts is recorded');
select pg_temp.expect_error($$select public.record_building_level('cn','math-land',2)$$, 'not_paid');
select pg_temp.check((select (public.record_reward('cn',-15,'purchase','upgrade|robot-workshop|1')).coins) = -15, 'nuts: a workshop level costs its parts too');
select pg_temp.expect_error($$select public.record_reward('cn',-15,'purchase','upgrade|spaceport|1')$$, 'insufficient_coins');
-- a find opened by the rocket bought with nuts
select public.record_reward('cn',15,'learn','crystal|three-stars|n-extra');
select public.record_reward('cn',-15,'purchase','upgrade|spaceport|1');
select public.record_building_level('cn','spaceport',1);
select pg_temp.check((select (public.record_resource('cn','seed',1,'discovery','mars-seed')).amount) = 1, 'nuts: the Mars seed is found after a rocket paid in nuts');
commit;
-- an offline week: nuts are capped on the day they were earned, not the day they sync
update auth.users set created_at = now() - interval '30 days' where id = '00000000-0000-0000-0000-0000000000e1';
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select public.record_reward('cn',100,'learn','off-'||g||'-'||d, now() - make_interval(days => d)) from generate_series(1,5) g, generate_series(2,4) d;
select pg_temp.check((select coalesce(sum(coins),0) from public.reward_ledger where child_id='cn' and ref_id like 'off-%') = 1500, 'nuts: an offline week syncs each day under its own cap');
select pg_temp.expect_error($$select public.record_reward('cn',100,'learn','off-6-2', now() - interval '2 days')$$, 'daily_cap');
select pg_temp.expect_error($$select public.record_reward('cn',10,'learn','future', now() + interval '1 day')$$, 'bad_time');
select pg_temp.check((select (public.record_reward('cn',10,'learn','long-ago', now() - interval '60 days')).earned_at) >= now() - interval '7 days 1 minute', 'nuts: older play counts as a week ago at most');
commit;
select pg_temp.check(public.building_nut_price('spaceport',1) = 15 and public.building_nut_price('garden',3) = 30 and public.building_nut_price('garden',4) is null, 'nuts: building prices at the fixed rate');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
select pg_temp.expect_error($$select public.nut_rate('crystal')$$, 'permission denied');
select pg_temp.expect_error($$select public.building_nut_price('garden',1)$$, 'permission denied');
commit;

-- ===== Phase 44 (0018): child photos, account consents, account deletion
-- two fresh families: F1 (child k1) and F2 (child k2)
insert into auth.users values
 ('00000000-0000-0000-0000-0000000000f1','f1@x.uz'),
 ('00000000-0000-0000-0000-0000000000f2','f2@x.uz');
insert into public.children (id,parent_id,name,age,gender,mascot) values
 ('k1','00000000-0000-0000-0000-0000000000f1','Aziz',5,'boy','boy'),
 ('k2','00000000-0000-0000-0000-0000000000f2','Malika',4,'girl','girl');
insert into public.child_state (child_id,parent_id) values ('k1','00000000-0000-0000-0000-0000000000f1');
select pg_temp.check((select public = false and file_size_limit = 262144 and allowed_mime_types = array['image/jpeg'] from storage.buckets where id = 'child-photos'), 'photos: bucket is private, 256 KB, JPEG only');
select pg_temp.check(not exists (
  select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and (coalesce(qual,'') || coalesce(with_check,'')) like '%child-photos%' and not (roles = '{authenticated}')
), 'photos: every child-photos policy is for authenticated only');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k1.jpg');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'child-photos' and name = '00000000-0000-0000-0000-0000000000f1/k1.jpg') = 1, 'photos: a parent adds and reads own child''s photo');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k2.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f2/k1.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f2/k2.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/x/k1.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','x/00000000-0000-0000-0000-0000000000f1/k1.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','/00000000-0000-0000-0000-0000000000f1/k1.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k1.png')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k1.jpg.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k1')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/nobody.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('ads','00000000-0000-0000-0000-0000000000f1/k1.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('voice','00000000-0000-0000-0000-0000000000f1/k1.jpg')$$, 'row-level security');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('avatars','00000000-0000-0000-0000-0000000000f1/k1.jpg')$$, 'row-level security');
-- moving the photo onto another path or bucket is refused; replacing it in place is fine
select pg_temp.expect_error($$update storage.objects set name = '00000000-0000-0000-0000-0000000000f1/k2.jpg' where bucket_id = 'child-photos'$$, 'row-level security');
select pg_temp.expect_error($$update storage.objects set bucket_id = 'ads' where bucket_id = 'child-photos'$$, 'row-level security');
with u as (update storage.objects set name = name where bucket_id = 'child-photos' returning 1)
select pg_temp.check((select count(*) from u) = 1, 'photos: a parent replaces own child''s photo in place');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'child-photos') = 0, 'photos: another parent cannot read the photo');
update storage.objects set name = '00000000-0000-0000-0000-0000000000f2/k2.jpg' where bucket_id = 'child-photos';
delete from storage.objects where bucket_id = 'child-photos';
insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f2/k2.jpg');
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'child-photos') = 1, 'photos: the other parent sees only their own photo');
commit;
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'child-photos') = 0, 'photos: anon cannot read photos');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k1.jpg')$$, 'row-level security');
select pg_temp.expect_error($$select public.is_own_child_photo('x/y.jpg')$$, 'permission denied');
commit;
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'child-photos' and name = '00000000-0000-0000-0000-0000000000f1/k1.jpg') = 1, 'photos: other clients changed nothing');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
with d as (delete from storage.objects where bucket_id = 'child-photos' returning name)
select pg_temp.check((select array_agg(name) from d) = array['00000000-0000-0000-0000-0000000000f1/k1.jpg'], 'photos: a parent deletes own photo (only own)');
insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k1.jpg');
commit;

-- a child removed first: its photo can still be read and removed by its parent, by no one else
insert into public.children (id,parent_id,name,age,gender,mascot) values
 ('k9','00000000-0000-0000-0000-0000000000f1','Old',5,'boy','boy');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k9.jpg');
commit;
delete from public.children where id = 'k9';
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
delete from storage.objects where bucket_id = 'child-photos' and name like '%/k9.jpg';
commit;
select pg_temp.check((select count(*) from storage.objects where name = '00000000-0000-0000-0000-0000000000f1/k9.jpg') = 1, 'photos: another parent cannot remove a removed child''s photo');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
select pg_temp.check((select count(*) from storage.objects where bucket_id = 'child-photos') = 2, 'photos: a parent lists every photo in own folder (a removed child''s too)');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('child-photos','00000000-0000-0000-0000-0000000000f1/k9.jpg')$$, 'row-level security');
with d as (delete from storage.objects where bucket_id = 'child-photos' and name like '%/k9.jpg' returning 1)
select pg_temp.check((select count(*) from d) = 1, 'photos: a parent removes a removed child''s photo');
commit;

-- account consents: own row only, server clock, no delete
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true);
insert into public.account_consents (version, accepted_at) values ('2026-11', '2000-01-01');
select pg_temp.check((select count(*) from public.account_consents) = 1 and (select accepted_at > now() - interval '1 minute' from public.account_consents), 'consents: a parent records own consent (server time)');
update public.account_consents set version = '2026-12', accepted_at = '2000-01-01';
select pg_temp.check((select version = '2026-12' and accepted_at > now() - interval '1 minute' from public.account_consents), 'consents: a parent updates own consent (server time)');
select pg_temp.expect_error($$insert into public.account_consents (parent_id, version) values ('00000000-0000-0000-0000-0000000000f2','1')$$, 'row-level security');
select pg_temp.expect_error($$update public.account_consents set parent_id = '00000000-0000-0000-0000-0000000000f2'$$, 'row-level security');
select pg_temp.expect_error($$update public.account_consents set version = ''$$, 'account_consents_version_check');
select pg_temp.expect_error($$update public.account_consents set version = repeat('v', 21)$$, 'account_consents_version_check');
select pg_temp.expect_error($$delete from public.account_consents$$, 'permission denied');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}', true);
select pg_temp.check((select count(*) from public.account_consents) = 0, 'consents: another parent cannot read it');
update public.account_consents set version = 'x';
insert into public.account_consents (version) values ('2026-11');
select pg_temp.check((select count(*) from public.account_consents) = 1, 'consents: the other parent sees only their own row');
commit;
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.expect_error($$select * from public.account_consents$$, 'permission denied');
select pg_temp.expect_error($$insert into public.account_consents (parent_id, version) values ('00000000-0000-0000-0000-0000000000f1','1')$$, 'permission denied');
commit;
select pg_temp.check((select version from public.account_consents where parent_id = '00000000-0000-0000-0000-0000000000f1') = '2026-12', 'consents: other clients changed nothing');
select pg_temp.check((select c.relrowsecurity from pg_class c where c.oid = 'public.account_consents'::regclass), 'account_consents: RLS on');

-- deleting the account removes every family row (here as auth.admin.deleteUser does)
insert into public.task_results (id,child_id,parent_id,type,language,coins,stars,day,finished_at)
values ('tr-k1','k1','00000000-0000-0000-0000-0000000000f1','memory','uz',1,3,current_date,now());
delete from auth.users where id = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.check(not exists (select 1 from public.children where parent_id = '00000000-0000-0000-0000-0000000000f1')
  and not exists (select 1 from public.child_state where child_id = 'k1')
  and not exists (select 1 from public.task_results where child_id = 'k1')
  and not exists (select 1 from public.account_consents where parent_id = '00000000-0000-0000-0000-0000000000f1')
  and not exists (select 1 from public.deleted_children where parent_id = '00000000-0000-0000-0000-0000000000f1'),
  'delete account: children, child_state, results, consent and tombstones cascade');
select pg_temp.check((select count(*) from public.children where id = 'k2') = 1 and (select count(*) from public.account_consents) = 1, 'delete account: the other family is untouched');
-- every public table with a person in it cascades from auth.users or children
select pg_temp.check(not exists (
  select 1 from pg_class t
  where t.relkind = 'r' and t.relnamespace = 'public'::regnamespace
    and exists (select 1 from pg_attribute a where a.attrelid = t.oid and a.attnum > 0
                and not a.attisdropped and a.attname in ('parent_id','user_id','child_id'))
    and not exists (select 1 from pg_constraint con where con.conrelid = t.oid and con.contype = 'f'
                    and con.confdeltype = 'c' and con.confrelid in ('auth.users'::regclass, 'public.children'::regclass))
), 'delete account: every table with a parent, user or child cascades');

-- ===== Phase 45 (0019): admin overhaul
-- fixtures: four confirmed families, a second admin account (not an admin yet)
insert into auth.users (id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000451','p451@x.uz', now()),
 ('00000000-0000-0000-0000-000000000452','p452@x.uz', now()),
 ('00000000-0000-0000-0000-000000000453','p453@x.uz', now()),
 ('00000000-0000-0000-0000-000000000454','p454@x.uz', now()),
 ('00000000-0000-0000-0000-0000000004ad','Ad2@x.uz', now());
-- the admin sets up codes (audited); the launch codes are paused for these tests
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
insert into public.promo_codes (code, days, max_uses, note) values ('ONCE45', 5, 1, 'one family only');
insert into public.promo_codes (code, days, expires_at) values ('OLD45', 5, now() - interval '1 day');
insert into public.promo_codes (code, days, active) values ('OFF45', 5, false);
insert into public.promo_codes (code, days) values ('TEMP45', 5);
select pg_temp.expect_error($$insert into public.promo_codes (code, days, max_uses) values ('ZERO45', 5, 0)$$, 'promo_codes_max_uses_check');
select pg_temp.expect_error($$insert into public.promo_codes (code, days, note) values ('NOTE45', 5, repeat('n', 81))$$, 'promo_codes_note_check');
update public.promo_codes set active = false where code in ('KIDDO07','BOLAJON30');
update public.promo_codes set note = 'temporary' where code = 'TEMP45';
update public.promo_codes set note = 'temporary' where code = 'TEMP45';
delete from public.promo_codes where code = 'TEMP45';
select pg_temp.check((select admin_id = '00000000-0000-0000-0000-0000000000ad' and summary ->> 'max_uses' = '1' and summary ->> 'note' = 'one family only'
  from public.admin_audit where target = 'promo_codes' and action = 'insert' and target_key = 'ONCE45'), 'audit: promo insert logged with the admin and the new values');
select pg_temp.check((select count(*) = 1 and bool_and(summary = '{"note":"temporary"}'::jsonb) from public.admin_audit where target = 'promo_codes' and action = 'update' and target_key = 'TEMP45'), 'audit: promo update logs only the changed column (a no-op update is not logged)');
select pg_temp.check((select count(*) = 1 and bool_and(summary ->> 'code' = 'TEMP45') from public.admin_audit where target = 'promo_codes' and action = 'delete' and target_key = 'TEMP45'), 'audit: promo delete logged');
insert into public.app_settings (key, value) values ('phase45', '1') on conflict (key) do update set value = excluded.value;
insert into public.app_settings (key, value) values ('phase45', '2') on conflict (key) do update set value = excluded.value;
select pg_temp.check((select count(*) from public.admin_audit where target = 'app_settings' and target_key = 'phase45' and action = 'insert') = 1
  and (select summary -> 'value' from public.admin_audit where target = 'app_settings' and target_key = 'phase45' and action = 'update') = '2'::jsonb, 'audit: app_settings upsert logged (insert, then update with the new value)');
select pg_temp.expect_error($$insert into public.admin_audit (action, target) values ('insert', 'x')$$, 'permission denied');
select pg_temp.expect_error($$update public.admin_audit set target = 'x'$$, 'permission denied');
select pg_temp.expect_error($$delete from public.admin_audit$$, 'permission denied');
commit;
-- finished ad views for two families; claims made before the admin set limits
insert into public.ad_views (id,user_id,ad_id,started_at) values
 ('45000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000451','11111111-1111-1111-1111-111111111111', now() - interval '60 seconds'),
 ('45000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000452','11111111-1111-1111-1111-111111111111', now() - interval '60 seconds');
insert into public.promo_claims (user_id, code) values
 ('00000000-0000-0000-0000-000000000453','OLD45'),
 ('00000000-0000-0000-0000-000000000454','OFF45');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000451","role":"authenticated"}', true);
select pg_temp.check((select code from public.claim_promo('45000000-0000-0000-0000-000000000001')) = 'ONCE45', 'promo 0019: claim hands out only an open code (not expired, not inactive)');
select pg_temp.check((public.redeem_promo_code('ONCE45') ->> 'ok')::boolean, 'promo 0019: a max_uses=1 code works once');
select pg_temp.expect_error($$select * from public.admin_promo_usage()$$, 'not_admin');
select pg_temp.check((select count(*) from public.admin_audit) = 0, 'audit: a parent reads nothing');
select pg_temp.expect_error($$insert into public.admin_audit (action, target) values ('insert', 'x')$$, 'permission denied');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000452","role":"authenticated"}', true);
select pg_temp.expect_error($$select public.claim_promo('45000000-0000-0000-0000-000000000002')$$, 'no_codes');
commit;
-- the next family holds a claim on it from before the limit was set
insert into public.promo_claims (user_id, code) values ('00000000-0000-0000-0000-000000000452','ONCE45');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000452","role":"authenticated"}', true);
select pg_temp.check((public.redeem_promo_code('ONCE45') ->> 'error') = 'used_up', 'promo 0019: a used-up code is refused for the next family');
select pg_temp.check(not exists (select 1 from public.subscriptions), 'promo 0019: no PRO for the next family');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000453","role":"authenticated"}', true);
select pg_temp.check((public.redeem_promo_code('OLD45') ->> 'error') = 'expired', 'promo 0019: an expired code is refused');
select pg_temp.check(not exists (select 1 from public.subscriptions), 'promo 0019: no PRO from an expired code');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000454","role":"authenticated"}', true);
select pg_temp.check((public.redeem_promo_code('OFF45') ->> 'error') = 'invalid', 'promo 0019: an inactive code is refused (as invalid)');
commit;
-- the legacy wrapper refuses the same way (callable only by the server)
begin;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000453","role":"authenticated"}', true);
select pg_temp.expect_error($$select public.redeem_promo('OLD45')$$, 'expired');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000452","role":"authenticated"}', true);
select pg_temp.expect_error($$select public.redeem_promo('ONCE45')$$, 'used_up');
commit;
select pg_temp.check(not has_function_privilege('authenticated','public.promo_code_uses(text,uuid)','execute') and not has_function_privilege('anon','public.promo_code_open(text)','execute'), 'promo 0019: the use-count helpers are not callable by clients');
-- ads with a schedule
insert into public.ads (id,title,video_url,duration_s,starts_at,ends_at) values
 ('45000000-0000-0000-0000-0000000000a1','Later','https://x/l.mp4',20, now() + interval '1 day', null),
 ('45000000-0000-0000-0000-0000000000a2','Over','https://x/o.mp4',20, null, now() - interval '1 hour'),
 ('45000000-0000-0000-0000-0000000000a3','Now','https://x/n.mp4',20, now() - interval '1 hour', now() + interval '1 hour');
select pg_temp.expect_error($$insert into public.ads (title,video_url,duration_s,starts_at,ends_at) values ('Bad','https://x/b.mp4',20, now(), now() - interval '1 minute')$$, 'ads_schedule_check');
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000453","role":"authenticated"}', true);
select pg_temp.check((select count(*) from public.ads where id in ('45000000-0000-0000-0000-0000000000a1','45000000-0000-0000-0000-0000000000a2')) = 0, 'ads 0019: a parent cannot read an ad outside its schedule');
select pg_temp.check((select count(*) from public.ads where id = '45000000-0000-0000-0000-0000000000a3') = 1, 'ads 0019: a parent reads an ad inside its schedule');
select pg_temp.expect_error($$select public.start_ad_view('45000000-0000-0000-0000-0000000000a1')$$, 'no_ad');
select pg_temp.expect_error($$select public.start_ad_view('45000000-0000-0000-0000-0000000000a2')$$, 'no_ad');
select pg_temp.check(public.start_ad_view('45000000-0000-0000-0000-0000000000a3') is not null, 'ads 0019: start_ad_view works inside the schedule');
commit;
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.check((select count(*) from public.ads where id::text like '45000000-%') = 1, 'ads 0019: anon reads only the scheduled-now ad');
select pg_temp.expect_error($$select * from public.voice_reviews$$, 'permission denied');
select pg_temp.expect_error($$insert into public.voice_reviews (key, language, status) values ('a/b', 'uz', 'approved')$$, 'permission denied');
select pg_temp.expect_error($$select * from public.admin_audit$$, 'permission denied');
commit;
select pg_temp.check(not has_function_privilege('anon','public.admin_list()','execute') and not has_function_privilege('anon','public.admin_add(text)','execute')
  and not has_function_privilege('anon','public.admin_remove(uuid)','execute') and not has_function_privilege('anon','public.admin_retention(integer)','execute')
  and not has_function_privilege('anon','public.admin_promo_usage()','execute') and not has_function_privilege('authenticated','public.audit_admin_change()','execute'), 'admin 0019: anon cannot call the admin RPCs, nobody calls the audit trigger');
-- voice reviews: a parent can neither write nor read them
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000453","role":"authenticated"}', true);
select pg_temp.expect_error($$insert into public.voice_reviews (key, language, status) values ('letters/a.mp3', 'uz', 'approved')$$, 'row-level security');
commit;
-- admin: reads all ads, voice reviews, promo usage, manages admins
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select pg_temp.check((select count(*) from public.ads where id::text like '45000000-%') = 3, 'ads 0019: an admin reads every ad');
insert into public.voice_reviews (key, language, status, note, reviewed_by, reviewed_at) values ('letters/a.mp3', 'uz', 'approved', 'clear', '00000000-0000-0000-0000-000000000453', '2000-01-01');
insert into public.voice_reviews (key, language, status) values ('letters/a.mp3', 'uz', 'rejected') on conflict (language, key) do update set status = excluded.status;
select pg_temp.check((select status = 'rejected' and reviewed_by = '00000000-0000-0000-0000-0000000000ad' and reviewed_at > now() - interval '1 minute' from public.voice_reviews), 'voice 0019: an admin writes a review (server stamps who and when)');
select pg_temp.expect_error($$insert into public.voice_reviews (key, language, status) values ('Bad Key!', 'uz', 'approved')$$, 'voice_reviews_key_check');
select pg_temp.expect_error($$insert into public.voice_reviews (key, language, status) values ('a', 'de', 'approved')$$, 'voice_reviews_language_check');
select pg_temp.expect_error($$insert into public.voice_reviews (key, language, status) values ('a', 'en', 'maybe')$$, 'voice_reviews_status_check');
select pg_temp.check((select count(*) from public.admin_audit where target = 'voice_reviews' and target_key = 'uz/letters/a.mp3') = 2, 'audit: voice review insert and update logged');
select pg_temp.check((select used from public.admin_promo_usage() where code = 'ONCE45') = 2
  and (select used from public.admin_promo_usage() where code = 'OLD45') = 1
  and (select used from public.admin_promo_usage() where code = 'OFF45') = 1
  and (select count(*) from public.admin_promo_usage()) = (select count(*) from public.promo_codes), 'promo 0019: admin_promo_usage counts each account once, for every code');
select pg_temp.expect_error($$select * from public.admin_add('nobody@x.uz')$$, 'no_such_user');
select pg_temp.expect_error($$select public.admin_remove('00000000-0000-0000-0000-0000000000ad')$$, 'last_admin');
select pg_temp.check((select email from public.admin_add('  AD2@x.uz ')) = 'Ad2@x.uz', 'admins 0019: add by e-mail (any case)');
select pg_temp.check((select user_id from public.admin_add('ad2@x.uz')) = '00000000-0000-0000-0000-0000000004ad', 'admins 0019: adding again is idempotent');
select pg_temp.check((select count(*) from public.admin_list()) = 2 and (select added_at is not null from public.admin_list() where email = 'Ad2@x.uz'), 'admins 0019: list with e-mail and added_at');
select pg_temp.expect_error($$select public.admin_remove('00000000-0000-0000-0000-0000000000ad')$$, 'not_self');
select pg_temp.check(not public.admin_remove('00000000-0000-0000-0000-000000000453'), 'admins 0019: removing a non-admin changes nothing');
select pg_temp.check(public.admin_remove('00000000-0000-0000-0000-0000000004ad'), 'admins 0019: another admin can be removed');
select pg_temp.check((select count(*) from public.admins) = 1, 'admins 0019: one admin left');
select pg_temp.check((select count(*) from public.admin_audit where target = 'admins' and target_key = '00000000-0000-0000-0000-0000000004ad' and action = 'insert') = 1
  and (select count(*) from public.admin_audit where target = 'admins' and target_key = '00000000-0000-0000-0000-0000000004ad' and action = 'delete') = 1, 'audit: admin add and remove logged');
select pg_temp.check((select count(*) from public.admin_audit) > 0, 'audit: an admin reads the log');
commit;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000453","role":"authenticated"}', true);
select pg_temp.expect_error($$select * from public.admin_list()$$, 'not_admin');
select pg_temp.expect_error($$select * from public.admin_add('p453@x.uz')$$, 'not_admin');
select pg_temp.expect_error($$select public.admin_remove('00000000-0000-0000-0000-0000000000ad')$$, 'not_admin');
select pg_temp.expect_error($$select * from public.admin_retention(30)$$, 'not_admin');
select pg_temp.check((select count(*) from public.voice_reviews) = 0, 'voice 0019: a parent reads no reviews');
update public.promo_codes set max_uses = 100000;
commit;
select pg_temp.check((select max_uses from public.promo_codes where code = 'ONCE45') = 1, 'promo 0019: a parent cannot change a limit');
-- retention: the admin sees installs of the period and their day-2 / day-7 returns
create temp table ret45_before (installs bigint, eligible_day2 bigint, returned_day2 bigint, eligible_day7 bigint, returned_day7 bigint);
grant select, insert on ret45_before to authenticated;
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
insert into ret45_before select * from public.admin_retention(30);
commit;
insert into public.analytics_events (id, install_id, name, day, at) values
 ('ret45-0001','install-ret45-1','first_opened',(now() at time zone 'Asia/Tashkent')::date - 1, now()),
 ('ret45-0002','install-ret45-1','returned_day2',(now() at time zone 'Asia/Tashkent')::date, now()),
 ('ret45-0003','install-ret45-2','first_opened',(now() at time zone 'Asia/Tashkent')::date, now()),
 ('ret45-0004','install-ret45-3','returned_day7',(now() at time zone 'Asia/Tashkent')::date, now());
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select pg_temp.check((select r.installs - b.installs = 2 and r.eligible_day2 - b.eligible_day2 = 1 and r.returned_day2 - b.returned_day2 = 1
  and r.eligible_day7 = b.eligible_day7 and r.returned_day7 = b.returned_day7
  from public.admin_retention(30) r, ret45_before b), 'analytics 0019: admin_retention counts the cohort, the installs old enough to return, and their returns (a new install is not yet due; outside the cohort not counted)');
commit;
-- the launch codes run again (as the owner set them)
update public.promo_codes set active = true where code in ('KIDDO07','BOLAJON30');

-- ===== Phase 52 (0020): audit fixes
select pg_temp.check(not has_function_privilege('anon','public.is_birthday_week(text,text)','execute')
  and not has_function_privilege('authenticated','public.is_birthday_week(text,text)','execute'), 'audit 0020: nobody calls is_birthday_week directly');
insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-0000-0000-0000000052ad','unconfirmed52@x.uz', null);
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
select pg_temp.expect_error($$select * from public.admin_add('unconfirmed52@x.uz')$$, 'no_such_user');
commit;
select pg_temp.expect_error($$delete from public.admins where user_id = '00000000-0000-0000-0000-0000000000ad'$$, 'last_admin');
select pg_temp.expect_error($$delete from auth.users where id = '00000000-0000-0000-0000-0000000000ad'$$, 'last_admin');
select pg_temp.check((select count(*) from public.admins) = 1, 'audit 0020: the last admin stays, even when the account is deleted');
-- the daily cap for everyone: once it is reached, a new install adds nothing
insert into public.analytics_daily (day, events) values ((now() at time zone 'Asia/Tashkent')::date, 200000)
  on conflict (day) do update set events = 200000;
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.check(public.add_analytics_events(('['||'{"id":"evt-52-0001","install":"install-52-new","name":"app_opened","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||']')::jsonb) = 0, 'audit 0020: past the daily cap a new install adds nothing');
select pg_temp.expect_error($$select * from public.analytics_daily$$, 'permission denied');
commit;
update public.analytics_daily set events = 0 where day = (now() at time zone 'Asia/Tashkent')::date;
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.check(public.add_analytics_events(('['||'{"id":"evt-52-0002","install":"install-52-new","name":"app_opened","day":"'||(now() at time zone 'Asia/Tashkent')::date||'","at":"'||now()||'"}'||']')::jsonb) = 1, 'audit 0020: under the cap events are kept');
commit;
select pg_temp.check((select events from public.analytics_daily where day = (now() at time zone 'Asia/Tashkent')::date) = 1, 'audit 0020: the day counter counts what was kept');

-- ===== every security definer function pins search_path
select pg_temp.check(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.prosecdef and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
), 'all security definer functions set search_path');
\echo ALL-SQL-ASSERTIONS-PASSED
