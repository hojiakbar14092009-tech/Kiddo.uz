-- Phase 16: Mistake Garden. A skill the child got past keeps that fact.
--
-- A slip on a resolved misconception starts a single observation again (as
-- before) but keeps `resolved_at`, and when that observation goes stale it
-- returns to `resolved` instead of being forgotten. The garden shows such a
-- skill as a flower ("I learned this"), not as nothing. Mirrors withError()
-- and forgetStale() in src/domain/learningMemory/memory.ts. Only the body of
-- record_learning_evidence changes; its signature and grants stay (0008).

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

  -- an observation that never got confirmed is forgotten after 14 days; a slip on
  -- something the child had already got past goes back to resolved (Phase 16)
  update public.learning_misconceptions x set status = 'resolved'
  where x.child_id = p_child and x.skill_key = p_skill
    and x.status = 'observed' and x.resolved_at is not null
    and x.last_at < v_at - interval '14 days';
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
          status = 'observed';
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
      resolved_at = case when v_streak >= 3 and v_retention then v_at else x.resolved_at end
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
