-- A finished game: the server records the coins once (idempotent per ref).
\set p random(1, 20000)
\set r random(1, 1000000000)
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-' || lpad(to_hex(:p), 12, '0'), 'role', 'authenticated')::text, true);
select coins from public.record_reward('c' || :p || '-2', 3, 'task', 'load-' || :r);
commit;
