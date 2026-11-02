-- A device's analytics batch (five events), as the analytics Edge Function sends it.
\set i random(1, 5000000)
\set r random(1, 1000000000)
select public.add_analytics_events(jsonb_build_array(
  jsonb_build_object('id', 'l-' || :r || '-1', 'install', 'load-install-' || :i, 'name', 'app_opened', 'day', (now() at time zone 'Asia/Tashkent')::date, 'at', now()),
  jsonb_build_object('id', 'l-' || :r || '-2', 'install', 'load-install-' || :i, 'name', 'activity_opened', 'day', (now() at time zone 'Asia/Tashkent')::date, 'at', now(), 'screen', '/tasks/memory'),
  jsonb_build_object('id', 'l-' || :r || '-3', 'install', 'load-install-' || :i, 'name', 'activity_finished', 'day', (now() at time zone 'Asia/Tashkent')::date, 'at', now()),
  jsonb_build_object('id', 'l-' || :r || '-4', 'install', 'load-install-' || :i, 'name', 'activity_opened', 'day', (now() at time zone 'Asia/Tashkent')::date, 'at', now(), 'screen', '/math-lab'),
  jsonb_build_object('id', 'l-' || :r || '-5', 'install', 'load-install-' || :i, 'name', 'app_closed', 'day', (now() at time zone 'Asia/Tashkent')::date, 'at', now(), 'screen', '/home')));
