-- 0008 – Phase 10: Kiddo's own learning memory and the AI tutor's server state
-- (docs/architecture/ai-tutor.md). Safe to re-run.
--
-- 1. learning_memory / learning_misconceptions: per child and skill, mastery,
--    misconceptions with an evidence threshold, review schedule. Parents read
--    their own children's rows; nobody writes them directly: the only way in
--    is record_learning_evidence(), which runs the same rules as the client
--    (src/domain/learningMemory/memory.ts): a browser can never set a score or
--    a status directly. It can only send evidence (questions it says were
--    answered), which the rules weigh; forged evidence affects only that
--    parent's own child.
-- 2. learning_evidence: idempotency (one row per counted question) + a daily cap.
-- 3. ai_consent: the parent's switch for the AI tutor, per child (server truth).
-- 4. audio_rate_ok / audio_daily_count learn the kind 'ai' (tutor requests).
-- 5. ai_provider_state (cool-down after a used-up free quota), ai_cache
--    (generic replies only), ai_usage (operational telemetry without people
--    or text), and ai_housekeeping() for retention.

-------------------------------------------------------------------------------
-- 1. Learning memory
-------------------------------------------------------------------------------

create table if not exists public.learning_memory (
  child_id text not null references public.children (id) on delete cascade,
  parent_id uuid not null references auth.users (id) on delete cascade,
  skill_key text not null check (skill_key ~ '^[a-z][a-z0-9-]{0,15}:[a-z0-9-]{1,24}(:[a-z0-9-]{1,24})?$'),
  level smallint check (level between 1 and 5),
  mastery numeric(4, 3) not null default 0 check (mastery between 0 and 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  success_streak integer not null default 0 check (success_streak >= 0),
  status text not null default 'new'
    check (status in ('new', 'observed', 'confirmed', 'improving', 'resolved')),
  first_at timestamptz not null,
  last_practiced_at timestamptz not null,
  last_error_at timestamptz,
  retained boolean not null default false,
  next_review_at timestamptz,
  review_step smallint not null default 0 check (review_step between 0 and 3),
  review_count integer not null default 0 check (review_count >= 0),
  hints_recent smallint[] not null default '{}' check (cardinality(hints_recent) <= 10),
  corrected_after_hint integer not null default 0 check (corrected_after_hint >= 0),
  mastered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, skill_key)
);
create index if not exists learning_memory_review_idx
  on public.learning_memory (child_id, next_review_at) where next_review_at is not null;
create index if not exists learning_memory_parent_idx on public.learning_memory (parent_id);

create table if not exists public.learning_misconceptions (
  child_id text not null,
  skill_key text not null,
  code text not null check (code ~ '^[a-z][a-z0-9-]{0,31}$' and code <> 'other'),
  parent_id uuid not null references auth.users (id) on delete cascade,
  count integer not null default 1 check (count >= 1),
  items text[] not null default '{}' check (cardinality(items) between 1 and 5),
  -- the sessions (runs) it happened in: confirmed needs two different ones
  runs text[] not null default '{}' check (cardinality(runs) <= 5),
  first_at timestamptz not null,
  last_at timestamptz not null,
  status text not null check (status in ('observed', 'confirmed', 'improving', 'resolved')),
  resolved_at timestamptz,
  primary key (child_id, skill_key, code),
  foreign key (child_id, skill_key)
    references public.learning_memory (child_id, skill_key) on delete cascade
);
-- (re-run safe: a database with an earlier draft of this table gets the column)
alter table public.learning_misconceptions
  add column if not exists runs text[] not null default '{}';
create index if not exists learning_misconceptions_parent_idx
  on public.learning_misconceptions (parent_id);

create table if not exists public.learning_evidence (
  child_id text not null references public.children (id) on delete cascade,
  evidence_id text not null check (evidence_id ~ '^[A-Za-z0-9_|:.-]{1,96}$'),
  skill_key text not null,
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  primary key (child_id, evidence_id)
);
create index if not exists learning_evidence_received_idx
  on public.learning_evidence (child_id, received_at);

alter table public.learning_memory enable row level security;
alter table public.learning_misconceptions enable row level security;
alter table public.learning_evidence enable row level security;

drop policy if exists "read own learning memory" on public.learning_memory;
create policy "read own learning memory" on public.learning_memory
  for select to authenticated using (parent_id = auth.uid() or public.is_admin());
drop policy if exists "read own misconceptions" on public.learning_misconceptions;
create policy "read own misconceptions" on public.learning_misconceptions
  for select to authenticated using (parent_id = auth.uid() or public.is_admin());
-- learning_evidence: no policy at all (ids only, for the server).

-- No write policies and no write privileges: only record_learning_evidence().
revoke all on public.learning_memory from anon;
revoke all on public.learning_misconceptions from anon;
revoke all on public.learning_evidence from anon, authenticated;
revoke insert, update, delete, truncate on public.learning_memory from authenticated;
revoke insert, update, delete, truncate on public.learning_misconceptions from authenticated;
grant select on public.learning_memory to authenticated;
grant select on public.learning_misconceptions to authenticated;

-- One finished question, as the game engine saw it. Idempotent by p_id.
-- Errors: not_signed_in, bad_id, bad_skill, bad_item, bad_hint, bad_level,
-- bad_time (no time), no_child, not_your_child. A device clock ahead of the
-- server is clamped to now(), and evidence over the daily cap is ignored (the
-- current row comes back), so neither fills the client's dead-letter list.
drop function if exists public.record_learning_evidence(
  text, text, text, text, integer, timestamptz, boolean, boolean, text[], integer, boolean);
create or replace function public.record_learning_evidence(
  p_child text,
  p_id text,
  p_skill text,
  p_item text,
  p_level integer,
  p_at timestamptz,
  p_first_try boolean,
  p_helped_before boolean,
  p_errors text[],
  p_max_hint integer,
  p_review boolean
)
returns public.learning_memory
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_parent uuid;
  v_at timestamptz;
  v_row public.learning_memory;
  v_inserted integer;
  v_today integer;
  v_score numeric;
  v_independent boolean := p_first_try and not p_helped_before;
  v_codes text[] := '{}';
  v_code text;
  v_was_active boolean;
  v_now_active boolean;
  v_streak integer;
  v_retention boolean;
  v_step integer;
  v_days integer[] := array[1, 3, 7, 14];
  v_m public.learning_misconceptions;
  v_items text[];
  v_runs text[];
  v_run text := split_part(p_id, '|', 1);
  v_status text;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if p_id is null or p_id !~ '^[A-Za-z0-9_|:.-]{1,96}$' then
    raise exception 'bad_id' using errcode = '22023';
  end if;
  if p_skill is null or p_skill !~ '^[a-z][a-z0-9-]{0,15}:[a-z0-9-]{1,24}(:[a-z0-9-]{1,24})?$' then
    raise exception 'bad_skill' using errcode = '22023';
  end if;
  if p_item is null or p_item !~ '^[a-z0-9-]{1,16}(:[0-9a-z+=?<>-]{1,16}){1,3}$' then
    raise exception 'bad_item' using errcode = '22023';
  end if;
  if p_max_hint is null or p_max_hint not between 0 and 4
     or p_first_try is null or p_helped_before is null or p_review is null
     or p_errors is null or cardinality(p_errors) > 8 then
    raise exception 'bad_hint' using errcode = '22023';
  end if;
  if p_level is not null and p_level not between 1 and 5 then
    raise exception 'bad_level' using errcode = '22023';
  end if;
  if p_at is null then
    raise exception 'bad_time' using errcode = '22023';
  end if;
  v_at := least(greatest(p_at, now() - interval '365 days'), now());

  select c.parent_id into v_parent from public.children c where c.id = p_child;
  if v_parent is null then
    raise exception 'no_child' using errcode = '22023';
  end if;
  if v_parent <> v_uid then
    raise exception 'not_your_child' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('learning:' || p_child));

  select count(*) into v_today from public.learning_evidence e
  where e.child_id = p_child and e.received_at > now() - interval '1 day';
  if v_today >= 3000 then
    select * into v_row from public.learning_memory m
    where m.child_id = p_child and m.skill_key = p_skill;
    return v_row;
  end if;

  insert into public.learning_evidence (child_id, evidence_id, skill_key, observed_at)
  values (p_child, p_id, p_skill, v_at)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select * into v_row from public.learning_memory m
    where m.child_id = p_child and m.skill_key = p_skill;
    return v_row;
  end if;

  -- the error codes that say something (as meaningfulCodes() in memory.ts)
  if not p_first_try then
    foreach v_code in array p_errors loop
      if v_code ~ '^[a-z][a-z0-9-]{0,31}$' and v_code <> 'other' and not (v_code = any (v_codes)) then
        v_codes := v_codes || v_code;
      end if;
    end loop;
  end if;

  select * into v_row from public.learning_memory m
  where m.child_id = p_child and m.skill_key = p_skill
  for update;
  if not found then
    insert into public.learning_memory (child_id, parent_id, skill_key, first_at, last_practiced_at)
    values (p_child, v_parent, p_skill, v_at, v_at)
    returning * into v_row;
  end if;

  -- an observation that never got confirmed is forgotten after 14 days
  delete from public.learning_misconceptions x
  where x.child_id = p_child and x.skill_key = p_skill
    and x.status = 'observed' and x.last_at < v_at - interval '14 days';

  v_score := case
    when v_independent then 1
    when p_first_try then 0.6
    when p_max_hint <= 2 then 0.5
    else 0.25 end;
  v_row.mastery := round(least(1, greatest(0, case
    when v_row.evidence_count = 0 then v_score
    else v_row.mastery + 0.3 * (v_score - v_row.mastery) end)), 3);
  v_row.level := coalesce(p_level, v_row.level);
  v_row.evidence_count := v_row.evidence_count + 1;
  v_row.last_practiced_at := v_at;
  v_row.hints_recent := (v_row.hints_recent || p_max_hint::smallint)[
    greatest(1, cardinality(v_row.hints_recent) + 1 - 9):];
  if not p_first_try and p_max_hint between 1 and 3 then
    v_row.corrected_after_hint := v_row.corrected_after_hint + 1;
  end if;

  select exists (
    select 1 from public.learning_misconceptions x
    where x.child_id = p_child and x.skill_key = p_skill and x.status in ('confirmed', 'improving')
  ) into v_was_active;

  if not p_first_try then
    foreach v_code in array v_codes loop
      select * into v_m from public.learning_misconceptions x
      where x.child_id = p_child and x.skill_key = p_skill and x.code = v_code;
      if not found or v_m.status = 'resolved' then
        -- new, or a slip after the child got past it: a single observation again
        insert into public.learning_misconceptions
          (child_id, skill_key, code, parent_id, count, items, runs, first_at, last_at, status)
        values (p_child, p_skill, v_code, v_parent, 1, array[p_item], array[v_run], v_at, v_at, 'observed')
        on conflict (child_id, skill_key, code) do update set
          count = 1, items = array[p_item], runs = array[v_run], first_at = v_at, last_at = v_at,
          status = 'observed', resolved_at = null;
      else
        v_items := array_append(array_remove(v_m.items, p_item), p_item);
        if cardinality(v_items) > 5 then
          v_items := v_items[cardinality(v_items) - 4:];
        end if;
        v_runs := array_append(array_remove(v_m.runs, v_run), v_run);
        if cardinality(v_runs) > 5 then
          v_runs := v_runs[cardinality(v_runs) - 4:];
        end if;
        -- different items in different sessions (as withError() in memory.ts)
        v_status := case
          when (cardinality(v_items) >= 2 and cardinality(v_runs) >= 2)
            or v_m.status in ('confirmed', 'improving') then 'confirmed'
          else 'observed' end;
        update public.learning_misconceptions x set
          count = v_m.count + 1, items = v_items, runs = v_runs, last_at = v_at, status = v_status
        where x.child_id = p_child and x.skill_key = p_skill and x.code = v_code;
      end if;
    end loop;
    -- at most 6 misconceptions per skill: active ones and the newest stay
    delete from public.learning_misconceptions x
    where x.child_id = p_child and x.skill_key = p_skill and x.code in (
      select y.code from public.learning_misconceptions y
      where y.child_id = p_child and y.skill_key = p_skill
      order by (y.status in ('confirmed', 'improving')) desc, y.last_at desc, y.code asc
      offset 6
    );
    select exists (
      select 1 from public.learning_misconceptions x
      where x.child_id = p_child and x.skill_key = p_skill and x.status in ('confirmed', 'improving')
    ) into v_now_active;
    v_row.success_streak := 0;
    v_row.last_error_at := v_at;
    v_row.retained := false;
    if v_now_active and (not v_was_active or p_review or v_row.next_review_at is null) then
      v_row.review_step := 0;
      v_row.next_review_at := v_at + interval '1 day';
    end if;
    if p_review then
      v_row.review_count := v_row.review_count + 1;
    end if;
  elsif v_independent then
    v_streak := v_row.success_streak + 1;
    v_retention := v_row.retained or (
      p_review and v_row.last_error_at is not null
      and v_at - v_row.last_error_at >= interval '20 hours');
    update public.learning_misconceptions x set
      status = case when v_streak >= 3 and v_retention then 'resolved' else 'improving' end,
      resolved_at = case when v_streak >= 3 and v_retention then v_at else null end
    where x.child_id = p_child and x.skill_key = p_skill and x.status in ('confirmed', 'improving');
    select exists (
      select 1 from public.learning_misconceptions x
      where x.child_id = p_child and x.skill_key = p_skill and x.status in ('confirmed', 'improving')
    ) into v_now_active;
    v_row.success_streak := v_streak;
    v_row.retained := v_retention;
    if p_review then
      v_step := least(v_row.review_step + 1, 3);
      v_row.review_count := v_row.review_count + 1;
      v_row.review_step := v_step;
      v_row.next_review_at := case
        when v_now_active then v_at + make_interval(days => v_days[v_step + 1]) else null end;
    elsif not v_now_active then
      v_row.next_review_at := null;
    end if;
  end if;

  select exists (
    select 1 from public.learning_misconceptions x
    where x.child_id = p_child and x.skill_key = p_skill and x.status in ('confirmed', 'improving')
  ) into v_now_active;
  if v_row.mastered_at is null and v_row.mastery >= 0.85 and v_row.evidence_count >= 5
     and not v_now_active then
    v_row.mastered_at := v_at;
  elsif v_row.mastered_at is not null and v_row.mastery < 0.6 then
    v_row.mastered_at := null;
  end if;

  select coalesce((
    select s from (values (1, 'confirmed'), (2, 'improving'), (3, 'resolved'), (4, 'observed')) as v(o, s)
    where exists (
      select 1 from public.learning_misconceptions x
      where x.child_id = p_child and x.skill_key = p_skill and x.status = v.s)
    order by o limit 1), 'new') into v_row.status;

  update public.learning_memory m set
    level = v_row.level,
    mastery = v_row.mastery,
    evidence_count = v_row.evidence_count,
    success_streak = v_row.success_streak,
    status = v_row.status,
    last_practiced_at = v_row.last_practiced_at,
    last_error_at = v_row.last_error_at,
    retained = v_row.retained,
    next_review_at = v_row.next_review_at,
    review_step = v_row.review_step,
    review_count = v_row.review_count,
    hints_recent = v_row.hints_recent,
    corrected_after_hint = v_row.corrected_after_hint,
    mastered_at = v_row.mastered_at,
    updated_at = now()
  where m.child_id = p_child and m.skill_key = p_skill
  returning * into v_row;

  -- at most 120 skills per child: the least recently practised go
  delete from public.learning_memory m
  where m.child_id = p_child and m.skill_key in (
    select y.skill_key from public.learning_memory y where y.child_id = p_child
    order by y.last_practiced_at desc offset 120);

  return v_row;
end;
$$;
revoke all on function public.record_learning_evidence(
  text, text, text, text, integer, timestamptz, boolean, boolean, text[], integer, boolean)
  from public, anon;
grant execute on function public.record_learning_evidence(
  text, text, text, text, integer, timestamptz, boolean, boolean, text[], integer, boolean)
  to authenticated;

-------------------------------------------------------------------------------
-- 3. AI consent (server truth)
-------------------------------------------------------------------------------

create table if not exists public.ai_consent (
  child_id text primary key references public.children (id) on delete cascade,
  parent_id uuid not null references auth.users (id) on delete cascade,
  granted boolean not null,
  policy_version text not null check (policy_version ~ '^[0-9]{1,4}$'),
  updated_at timestamptz not null default now()
);
alter table public.ai_consent enable row level security;
drop policy if exists "read own ai consent" on public.ai_consent;
create policy "read own ai consent" on public.ai_consent
  for select to authenticated using (parent_id = auth.uid());
revoke all on public.ai_consent from anon;
revoke insert, update, delete, truncate on public.ai_consent from authenticated;
grant select on public.ai_consent to authenticated;

-- The parent switches the AI tutor on or off for one of their children.
-- Errors: not_signed_in, bad_version, no_child, not_your_child.
create or replace function public.set_ai_consent(p_child text, p_granted boolean, p_version text)
returns public.ai_consent
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_parent uuid;
  v_row public.ai_consent;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '28000';
  end if;
  if p_granted is null or p_version is null or p_version !~ '^[0-9]{1,4}$' then
    raise exception 'bad_version' using errcode = '22023';
  end if;
  select c.parent_id into v_parent from public.children c where c.id = p_child;
  if v_parent is null then
    raise exception 'no_child' using errcode = '22023';
  end if;
  if v_parent <> v_uid then
    raise exception 'not_your_child' using errcode = '42501';
  end if;
  insert into public.ai_consent (child_id, parent_id, granted, policy_version, updated_at)
  values (p_child, v_parent, p_granted, p_version, now())
  on conflict (child_id) do update set
    granted = excluded.granted, policy_version = excluded.policy_version, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.set_ai_consent(text, boolean, text) from public, anon;
grant execute on function public.set_ai_consent(text, boolean, text) to authenticated;

-- For the tutor Edge Function (service role): is this the caller's child, and
-- has the parent switched the AI tutor on for it, for this policy version? A
-- new tutor policy needs the parent's consent again.
drop function if exists public.ai_consent_ok(uuid, text);
create or replace function public.ai_consent_ok(p_uid uuid, p_child text, p_version text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ai_consent a
    join public.children c on c.id = a.child_id
    where a.child_id = p_child and a.granted and a.policy_version = p_version
      and c.parent_id = p_uid and a.parent_id = p_uid
  );
$$;
revoke all on function public.ai_consent_ok(uuid, text, text) from public, anon, authenticated;
grant execute on function public.ai_consent_ok(uuid, text, text) to service_role;

-------------------------------------------------------------------------------
-- 4. Rate limits learn the kind 'ai'
-------------------------------------------------------------------------------

alter table public.audio_requests drop constraint if exists audio_requests_kind_check;
alter table public.audio_requests
  add constraint audio_requests_kind_check check (kind in ('voice', 'tts', 'auth', 'ai'));

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
  if p_kind is null or p_kind not in ('voice', 'tts', 'auth', 'ai') then
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

create or replace function public.audio_daily_count(p_kind text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_kind is null or p_kind not in ('voice', 'tts', 'auth', 'ai') then
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
-- 5. Provider state, cache, telemetry (service role only)
-------------------------------------------------------------------------------

create table if not exists public.ai_provider_state (
  provider text primary key check (provider ~ '^[a-z0-9-]{1,32}$'),
  cooldown_until timestamptz
);

-- Generic replies only (requests without learning memory); never a person.
create table if not exists public.ai_cache (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  language text not null check (language in ('uz', 'ru', 'en')),
  reply jsonb not null check (pg_column_size(reply) <= 2048),
  created_at timestamptz not null default now()
);
create index if not exists ai_cache_created_idx on public.ai_cache (created_at);

-- What happened, not who or what was said.
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  provider text not null check (char_length(provider) <= 32),
  model text not null check (char_length(model) <= 64),
  outcome text not null
    check (outcome in ('ok', 'cached', 'invalid', 'quota', 'transient', 'blocked', 'config')),
  latency_bucket text not null check (latency_bucket in ('lt1s', '1to3s', '3to8s', 'gt8s')),
  prompt_tokens integer check (prompt_tokens >= 0),
  output_tokens integer check (output_tokens >= 0),
  policy_version text not null check (char_length(policy_version) <= 8),
  problem text check (problem is null or problem ~ '^[a-z-]{1,24}$')
);
create index if not exists ai_usage_at_idx on public.ai_usage (at);

alter table public.ai_provider_state enable row level security;
alter table public.ai_cache enable row level security;
alter table public.ai_usage enable row level security;
-- No policies: clients see and write nothing; the service role bypasses RLS.
revoke all on public.ai_provider_state from anon, authenticated;
revoke all on public.ai_cache from anon, authenticated;
revoke all on public.ai_usage from anon, authenticated;
grant select, insert, update, delete on public.ai_provider_state to service_role;
grant select, insert, update, delete on public.ai_cache to service_role;
grant select, insert, delete on public.ai_usage to service_role;

-- Retention: cached replies 30 days, telemetry 90 days, evidence ids 180 days.
-- Returns how many rows went. Run daily (scheduled task or pg_cron).
create or replace function public.ai_housekeeping()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  v_n integer;
begin
  delete from public.ai_cache c where c.created_at < now() - interval '30 days';
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;
  delete from public.ai_usage u where u.at < now() - interval '90 days';
  get diagnostics v_n = row_count;
  v_total := v_total + v_n;
  delete from public.learning_evidence e where e.received_at < now() - interval '180 days';
  get diagnostics v_n = row_count;
  return v_total + v_n;
end;
$$;
revoke all on function public.ai_housekeeping() from public, anon, authenticated;
grant execute on function public.ai_housekeeping() to service_role;
