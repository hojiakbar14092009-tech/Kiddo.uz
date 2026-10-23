-- 0007: Private voice (Phase 7) – docs/architecture/audio-security.md.
--
-- Voice is a PRO feature the server enforces. The recorded clips move to the
-- private Storage bucket `voice`; only the service role (inside the Edge
-- Functions `voice-url` and `tts`) reads or writes it, after checking PRO with
-- is_pro_active() and the per-user rate limit audio_rate_ok(). Browsers only
-- ever get short-lived signed URLs for single objects.
--
-- Nothing in this file is callable or readable by `anon` or `authenticated`:
--   * no storage.objects policy mentions the `voice` bucket, so RLS hides its
--     objects from every client (the service role bypasses RLS);
--   * is_pro_active / audio_rate_ok / audio_daily_count / tts_cache_expired are
--     executable by service_role only;
--   * audio_requests / tts_cache have RLS on, no policies and no client grants.
--
-- Re-runnable (if not exists / drop … if exists / create or replace / on conflict).

-------------------------------------------------------------------------------
-- 1. Private bucket
-------------------------------------------------------------------------------

-- `on conflict … do update set public = false`: if a bucket of that name was
-- ever created as public by hand, re-running this makes it private again.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', false, 2097152, array['audio/mpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Deliberately NO policies on storage.objects for bucket_id = 'voice'.

-------------------------------------------------------------------------------
-- 2. PRO check
-------------------------------------------------------------------------------

-- True when the account has an active subscription row: status 'active' (0005:
-- anything else means Free) and expires_at null (lifetime) or in the future.
--
-- Executable by service_role only. A version for `authenticated` would have to
-- ignore p_uid (else any parent could probe another account's PRO); the app
-- already reads its own row through the "read own subscription" policy, so the
-- safer choice is to keep this function server-only.
create or replace function public.is_pro_active(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.parent_id = p_uid
      and s.status = 'active'
      and (s.expires_at is null or s.expires_at > now())
  );
$$;
revoke all on function public.is_pro_active(uuid) from public, anon, authenticated;
grant execute on function public.is_pro_active(uuid) to service_role;

-------------------------------------------------------------------------------
-- 3. Rate limit
-------------------------------------------------------------------------------

create table if not exists public.audio_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  at timestamptz not null default now()
);
-- kind: 'voice' (voice-url), 'tts' (tts), 'auth' (every signed-in call, counted
-- before the PRO check so a free account cannot hammer it). Named constraint,
-- re-created so a re-run picks up a changed list.
alter table public.audio_requests drop constraint if exists audio_requests_kind_check;
alter table public.audio_requests
  add constraint audio_requests_kind_check check (kind in ('voice', 'tts', 'auth'));
create index if not exists audio_requests_user_kind_at_idx
  on public.audio_requests (user_id, kind, at desc);
create index if not exists audio_requests_at_idx on public.audio_requests (at);
create index if not exists audio_requests_kind_at_idx on public.audio_requests (kind, at);

alter table public.audio_requests enable row level security;
-- No policies: clients see and write nothing; the service role bypasses RLS.
revoke all on table public.audio_requests from anon, authenticated;
grant select, insert, delete on table public.audio_requests to service_role;

-- Counts this user's requests of this kind in the last p_window_seconds. Under
-- p_limit: records one more and returns true. At the limit: records nothing
-- and returns false (a blocked caller does not extend its own block).
-- A per-(user, kind) transaction lock makes concurrent calls count correctly.
-- Rows older than a day are useless (the window is at most a day) and are
-- removed: the caller's own on every call, everyone's on about 1 call in 100.
-- Errors: bad_user, bad_kind, bad_limit, bad_window.
drop function if exists public.audio_rate_ok(uuid, text, integer, integer);
create or replace function public.audio_rate_ok(
  p_uid uuid,
  p_kind text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_used integer;
begin
  if p_uid is null then
    raise exception 'bad_user';
  end if;
  if p_kind is null or p_kind not in ('voice', 'tts', 'auth') then
    raise exception 'bad_kind';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100000 then
    raise exception 'bad_limit';
  end if;
  if p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'bad_window';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('audio_rate:' || p_uid::text || ':' || p_kind, 0)
  );

  delete from public.audio_requests r
  where r.user_id = p_uid and r.at < now() - interval '1 day';
  if pg_catalog.random() < 0.01 then
    delete from public.audio_requests r where r.at < now() - interval '1 day';
  end if;

  select count(*) into v_used
  from public.audio_requests r
  where r.user_id = p_uid
    and r.kind = p_kind
    and r.at > now() - pg_catalog.make_interval(secs => p_window_seconds);

  if v_used >= p_limit then
    return false;
  end if;

  insert into public.audio_requests (user_id, kind) values (p_uid, p_kind);
  return true;
end;
$$;
revoke all on function public.audio_rate_ok(uuid, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.audio_rate_ok(uuid, text, integer, integer) to service_role;

-- All users' requests of one kind since the start of the current UTC day: the
-- global daily cap of the `tts` function (TTS_DAILY_CAP) compares with it.
-- Rows of the current day are never removed by audio_rate_ok (it removes rows
-- older than a day only), so the count is complete. Errors: bad_kind.
create or replace function public.audio_daily_count(p_kind text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_kind is null or p_kind not in ('voice', 'tts', 'auth') then
    raise exception 'bad_kind';
  end if;
  return (
    select count(*)::integer
    from public.audio_requests r
    where r.kind = p_kind
      and r.at >= pg_catalog.date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
  );
end;
$$;
revoke all on function public.audio_daily_count(text) from public, anon, authenticated;
grant execute on function public.audio_daily_count(text) to service_role;

-------------------------------------------------------------------------------
-- 4. TTS cache
-------------------------------------------------------------------------------

-- One row per generated sentence: text_hash = sha256(language || text) in hex,
-- the audio is in bucket `voice` at `path` (tts/<language>/<text_hash>.mp3).
-- `voice` is the provider voice that made it; when the configured voice
-- changes, the function makes the clip again and overwrites the row.
create table if not exists public.tts_cache (
  language text not null check (language in ('uz', 'ru', 'en')),
  text_hash text not null check (text_hash ~ '^[0-9a-f]{64}$'),
  path text not null check (path = 'tts/' || language || '/' || text_hash || '.mp3'),
  voice text not null default '' check (char_length(voice) <= 128),
  created_at timestamptz not null default now(),
  primary key (language, text_hash)
);
alter table public.tts_cache add column if not exists voice text not null default '';

alter table public.tts_cache enable row level security;
-- No policies: the cache index is server-only like the audio itself.
revoke all on table public.tts_cache from anon, authenticated;
grant select, insert, update, delete on table public.tts_cache to service_role;

-- Paths of cached sentences older than p_days (1–3650), oldest first, at most
-- p_limit (1–10000) of them. Read-only: the cleanup
-- (scripts/voices/cleanup-tts.mjs, docs/architecture/supabase-verification.md
-- §7) removes the Storage objects through the Storage API first and only then
-- deletes these rows, so a failed removal is retried on the next run. TTL: 30
-- days. Errors: bad_days, bad_limit.
create or replace function public.tts_cache_expired(p_days integer, p_limit integer default 1000)
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_days is null or p_days < 1 or p_days > 3650 then
    raise exception 'bad_days';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 10000 then
    raise exception 'bad_limit';
  end if;
  return query
    select c.path
    from public.tts_cache c
    where c.created_at < now() - pg_catalog.make_interval(days => p_days)
    order by c.created_at
    limit p_limit;
end;
$$;
revoke all on function public.tts_cache_expired(integer, integer) from public, anon, authenticated;
grant execute on function public.tts_cache_expired(integer, integer) to service_role;
