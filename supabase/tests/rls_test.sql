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

-- ===== every security definer function pins search_path
select pg_temp.check(not exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname='public' and p.prosecdef and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
), 'all security definer functions set search_path');
\echo ALL-SQL-ASSERTIONS-PASSED
