-- Phase 56: the parents' Telegram bot.
--
-- A parent links a Telegram chat to the family account with a one-time link
-- made in the parent area (t.me/<bot>?start=<code>), never with a child's
-- name: a name is not a secret, and many children share one.
--
--   * public.telegram_link_codes: one row per link. Only the SHA-256 of the
--     code is kept; the code itself is shown once to the parent. A code works
--     once and for 10 minutes. A parent may make 10 codes an hour.
--   * public.telegram_links: one row per linked chat (mother and father link
--     their own; at most 5 chats per family). The chat id never leaves the
--     server: the app sees only the row id and the settings.
--   * The bot's webhook (Edge Function `telegram`) claims codes and unlinks
--     chats (/stop) with the service role. The worker sends the messages
--     (`telegram_send` jobs); enqueue_telegram_messages, run hourly by
--     pg_cron, queues them at each chat's chosen hour (Tashkent time).
--   * What a message holds: a child's first name, age and short results
--     (days, minutes, letters). Never a photo, a voice, a surname or answers.
--   * Both tables cascade from auth.users: deleting the account removes the
--     links and codes (the list in 0018 holds for this file too).
-- Re-runnable (if not exists / create or replace / drop … if exists).

-------------------------------------------------------------------------------
-- 1. Tables (no direct access for the app: functions only)
-------------------------------------------------------------------------------

create table if not exists public.telegram_link_codes (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  parent_id uuid not null references auth.users (id) on delete cascade,
  language text not null default 'uz' check (language in ('uz', 'ru', 'en')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists telegram_link_codes_parent_idx
  on public.telegram_link_codes (parent_id, created_at desc);
alter table public.telegram_link_codes enable row level security;
revoke all on public.telegram_link_codes from anon, authenticated;

create table if not exists public.telegram_links (
  id bigint generated always as identity primary key,
  parent_id uuid not null references auth.users (id) on delete cascade,
  chat_id bigint not null unique,
  language text not null default 'uz' check (language in ('uz', 'ru', 'en')),
  weekly boolean not null default true,
  daily boolean not null default false,
  reminders boolean not null default true,
  send_hour smallint not null default 19 check (send_hour between 7 and 21),
  last_reminder_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists telegram_links_parent_idx on public.telegram_links (parent_id);
alter table public.telegram_links enable row level security;
revoke all on public.telegram_links from anon, authenticated;

-------------------------------------------------------------------------------
-- 2. The parent (signed in): make a link, see and change the linked chats
-------------------------------------------------------------------------------

create or replace function public.telegram_code_hash(p_code text)
returns text
language sql immutable set search_path = '' as $$
  select encode(pg_catalog.sha256(pg_catalog.convert_to(p_code, 'UTF8')), 'hex')
$$;

-- A day from the app's minutes-per-day keys, or null for anything that is not a real
-- date ("2026-02-30"): one family's bad key must never stop the others' messages.
create or replace function public.telegram_day(p_key text)
returns date
language plpgsql immutable set search_path = '' as $$
begin
  if p_key !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return p_key::date;
exception when others then
  return null;
end;
$$;

-- What a message calls a child: the first word of the name only (never a surname).
create or replace function public.telegram_first_name(p_name text)
returns text
language sql immutable set search_path = '' as $$
  select split_part(btrim(p_name), ' ', 1)
$$;

-- A new one-time code (32 hex characters, 122 random bits) for this parent.
create or replace function public.telegram_link_code(p_language text default 'uz')
returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_parent uuid := (select auth.uid());
  v_code text;
begin
  if v_parent is null then
    raise exception 'not_signed_in';
  end if;
  if p_language is null or p_language not in ('uz', 'ru', 'en') then
    raise exception 'bad_language';
  end if;
  -- one at a time per parent, so the hourly limit holds
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('telegram:' || v_parent::text));
  -- the parent's spent and expired codes go; ten fresh ones an hour at most
  delete from public.telegram_link_codes c
   where c.parent_id = v_parent and c.expires_at < now() - interval '1 hour';
  if (select count(*) from public.telegram_link_codes c
       where c.parent_id = v_parent and c.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_codes';
  end if;
  v_code := replace(gen_random_uuid()::text, '-', '');
  insert into public.telegram_link_codes (code_hash, parent_id, language, expires_at)
  values (public.telegram_code_hash(v_code), v_parent, p_language, now() + interval '10 minutes');
  return v_code;
end;
$$;

-- This parent's linked chats (no chat ids).
create or replace function public.telegram_my_links()
returns table (id bigint, language text, weekly boolean, daily boolean, reminders boolean,
               send_hour smallint, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.id, l.language, l.weekly, l.daily, l.reminders, l.send_hour, l.created_at
    from public.telegram_links l
   where l.parent_id = (select auth.uid())
   order by l.created_at
$$;

create or replace function public.telegram_update_link(
  p_id bigint, p_language text, p_weekly boolean, p_daily boolean, p_reminders boolean,
  p_send_hour smallint)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_language not in ('uz', 'ru', 'en') or p_send_hour not between 7 and 21
     or p_weekly is null or p_daily is null or p_reminders is null then
    raise exception 'bad_settings';
  end if;
  update public.telegram_links l
     set language = p_language, weekly = p_weekly, daily = p_daily,
         reminders = p_reminders, send_hour = p_send_hour
   where l.id = p_id and l.parent_id = (select auth.uid());
  return found;
end;
$$;

create or replace function public.telegram_unlink(p_id bigint)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  delete from public.telegram_links l where l.id = p_id and l.parent_id = (select auth.uid());
  return found;
end;
$$;

-------------------------------------------------------------------------------
-- 3. The bot (service role): claim a code, unlink, read a chat
-------------------------------------------------------------------------------

-- The children a message may name: first name and age, oldest profile first.
create or replace function public.telegram_children(p_parent uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', public.telegram_first_name(c.name),
           'age', coalesce(extract(year from age((now() at time zone 'Asia/Tashkent')::date, c.birth_date))::int, c.age::int))
         order by c.created_at, c.id), '[]'::jsonb)
    from public.children c
   where c.parent_id = p_parent
$$;

-- Uses a code once: {status: linked | invalid | too_many, language, children}.
create or replace function public.telegram_claim(p_code text, p_chat_id bigint)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_parent uuid;
  v_language text;
begin
  if p_code is null or p_code !~ '^[0-9a-f]{32}$' or p_chat_id is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  -- the code row is locked: a second claim of the same code waits, then finds it used
  select c.parent_id, c.language into v_parent, v_language
    from public.telegram_link_codes c
   where c.code_hash = public.telegram_code_hash(p_code)
     and c.used_at is null and c.expires_at > now()
     for update;
  if v_parent is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  -- two codes of one family claimed at once cannot both pass the count
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('telegram:' || v_parent::text));
  if (select count(*) from public.telegram_links l
       where l.parent_id = v_parent and l.chat_id <> p_chat_id) >= 5 then
    -- the code is not spent: after unlinking a chat, the same link works
    return jsonb_build_object('status', 'too_many', 'language', v_language);
  end if;
  update public.telegram_link_codes c set used_at = now()
   where c.code_hash = public.telegram_code_hash(p_code);
  -- a chat belongs to one family: linking it again moves it, with fresh settings
  insert into public.telegram_links as l (parent_id, chat_id, language)
  values (v_parent, p_chat_id, v_language)
  on conflict (chat_id) do update
    set parent_id = excluded.parent_id, language = excluded.language, weekly = true,
        daily = false, reminders = true, send_hour = 19, last_reminder_at = null,
        created_at = now();
  return jsonb_build_object('status', 'linked', 'language', v_language,
                            'children', public.telegram_children(v_parent));
end;
$$;

create or replace function public.telegram_unlink_chat(p_chat_id bigint)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  delete from public.telegram_links l where l.chat_id = p_chat_id;
  return found;
end;
$$;

create or replace function public.telegram_set_language(p_chat_id bigint, p_language text)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_language not in ('uz', 'ru', 'en') then
    raise exception 'bad_language';
  end if;
  update public.telegram_links l set language = p_language where l.chat_id = p_chat_id;
  return found;
end;
$$;

-- A linked chat: its row, language and the family's PRO (status and end only).
create or replace function public.telegram_chat(p_chat_id bigint)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'link_id', l.id,
           'language', l.language,
           'pro', (select jsonb_build_object('plan', s.plan, 'expires_at', s.expires_at)
                     from public.subscriptions s
                    where s.parent_id = l.parent_id
                      and (s.expires_at is null or s.expires_at > now())))
    from public.telegram_links l
   where l.chat_id = p_chat_id
$$;

-------------------------------------------------------------------------------
-- 4. What a message says: each child's short results for a week or a day
-------------------------------------------------------------------------------

-- {chat_id, language, kind, days, children: [{name, age, days_active, minutes,
-- tasks, letters, hard, last_day}]}; null when the chat is no longer linked.
create or replace function public.telegram_report(p_link_id bigint, p_kind text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_link public.telegram_links;
  v_today date := (now() at time zone 'Asia/Tashkent')::date;
  v_from date;
  v_children jsonb;
begin
  if p_kind not in ('weekly', 'daily', 'reminder') then
    raise exception 'bad_kind';
  end if;
  select * into v_link from public.telegram_links l where l.id = p_link_id;
  if not found then
    return null;
  end if;
  v_from := case when p_kind = 'daily' then v_today else v_today - 6 end;
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', public.telegram_first_name(c.name),
           'age', coalesce(extract(year from age(v_today, c.birth_date))::int, c.age::int),
           'days_active', (
             select count(distinct d) from (
               select r.day as d from public.task_results r
                where r.child_id = c.id and r.day between v_from and v_today
               union
               select public.telegram_day(m.key) from jsonb_each_text(coalesce(s.minutes_by_day, '{}'::jsonb)) m
                where m.value ~ '^\d+(\.\d+)?$' and m.value::numeric > 0
                  and public.telegram_day(m.key) between v_from and v_today) days),
           'minutes', (
             select coalesce(round(sum(m.value::numeric)), 0)::int
               from jsonb_each_text(coalesce(s.minutes_by_day, '{}'::jsonb)) m
              where m.value ~ '^\d+(\.\d+)?$'
                and public.telegram_day(m.key) between v_from and v_today),
           'tasks', (
             select count(*) from public.task_results r
              where r.child_id = c.id and r.day between v_from and v_today),
           'letters', (
             select coalesce(jsonb_agg(x.letter order by x.letter), '[]'::jsonb) from (
               select distinct u.letter from public.task_results r, unnest(r.letter_ids) u(letter)
                where r.child_id = c.id and r.day between v_from and v_today and r.stars >= 2
                order by u.letter limit 12) x),
           'hard', (
             select coalesce(jsonb_agg(x.letter order by x.letter), '[]'::jsonb) from (
               select distinct u.letter from public.task_results r, unnest(r.letter_ids) u(letter)
                where r.child_id = c.id and r.day between v_from and v_today
                  and r.stars = 1 and r.mistakes >= 2
                order by u.letter limit 5) x),
           'last_day', (
             select max(d) from (
               select max(r.day) as d from public.task_results r where r.child_id = c.id
               union all
               select max(public.telegram_day(m.key)) from jsonb_each_text(coalesce(s.minutes_by_day, '{}'::jsonb)) m
                where m.value ~ '^\d+(\.\d+)?$' and m.value::numeric > 0) last))
         order by c.created_at, c.id), '[]'::jsonb)
    into v_children
    from public.children c
    left join public.child_state s on s.child_id = c.id
   where c.parent_id = v_link.parent_id;
  return jsonb_build_object('chat_id', v_link.chat_id, 'language', v_link.language,
                            'kind', p_kind, 'days', v_today - v_from + 1, 'children', v_children);
end;
$$;

-------------------------------------------------------------------------------
-- 5. When messages go: hourly, at each chat's own hour (Tashkent time)
-------------------------------------------------------------------------------

-- Weekly on Sunday, daily when chosen, and a gentle "come back" note once a week
-- when no child of the family has played for 3 days. Returns the jobs queued.
create or replace function public.enqueue_telegram_messages(p_now timestamptz default now())
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_local timestamp := p_now at time zone 'Asia/Tashkent';
  v_hour int := extract(hour from v_local)::int;
  v_day date := v_local::date;
  v_link record;
  v_count integer := 0;
  v_last date;
begin
  for v_link in
    select l.* from public.telegram_links l where l.send_hour = v_hour
  loop
   -- one chat's trouble never stops the others' messages
   begin
    if v_link.weekly and extract(isodow from v_day) = 7 then
      perform public.enqueue_job('telegram_send',
        jsonb_build_object('link_id', v_link.id, 'kind', 'weekly'), p_now,
        'tg:weekly:' || v_link.id || ':' || v_day);
      v_count := v_count + 1;
    end if;
    if v_link.daily then
      perform public.enqueue_job('telegram_send',
        jsonb_build_object('link_id', v_link.id, 'kind', 'daily'), p_now,
        'tg:daily:' || v_link.id || ':' || v_day);
      v_count := v_count + 1;
    end if;
    if v_link.reminders and (v_link.last_reminder_at is null
                             or v_link.last_reminder_at < p_now - interval '7 days') then
      select max(d) into v_last from (
        select max(r.day) as d from public.task_results r where r.parent_id = v_link.parent_id
        union all
        select max(public.telegram_day(m.key)) from public.child_state s,
               jsonb_each_text(coalesce(s.minutes_by_day, '{}'::jsonb)) m
         where s.parent_id = v_link.parent_id
           and m.value ~ '^\d+(\.\d+)?$' and m.value::numeric > 0) last;
      -- only for a family that has played before and then stopped
      if v_last is not null and v_last <= v_day - 3 then
        perform public.enqueue_job('telegram_send',
          jsonb_build_object('link_id', v_link.id, 'kind', 'reminder'), p_now,
          'tg:reminder:' || v_link.id || ':' || v_day);
        update public.telegram_links l set last_reminder_at = p_now where l.id = v_link.id;
        v_count := v_count + 1;
      end if;
    end if;
   exception when others then
    raise warning 'telegram: chat row % skipped: %', v_link.id, sqlerrm;
   end;
  end loop;
  -- spent and expired codes go after a day
  delete from public.telegram_link_codes c where c.expires_at < p_now - interval '1 day';
  return v_count;
end;
$$;

-------------------------------------------------------------------------------
-- 6. Who may call what
-------------------------------------------------------------------------------

revoke all on function public.telegram_code_hash(text) from public, anon, authenticated;
revoke all on function public.telegram_day(text) from public, anon, authenticated;
revoke all on function public.telegram_first_name(text) from public, anon, authenticated;
revoke all on function public.telegram_link_code(text) from public, anon;
revoke all on function public.telegram_my_links() from public, anon;
revoke all on function public.telegram_update_link(bigint, text, boolean, boolean, boolean, smallint) from public, anon;
revoke all on function public.telegram_unlink(bigint) from public, anon;
grant execute on function public.telegram_link_code(text) to authenticated;
grant execute on function public.telegram_my_links() to authenticated;
grant execute on function public.telegram_update_link(bigint, text, boolean, boolean, boolean, smallint) to authenticated;
grant execute on function public.telegram_unlink(bigint) to authenticated;

revoke all on function public.telegram_children(uuid) from public, anon, authenticated;
revoke all on function public.telegram_claim(text, bigint) from public, anon, authenticated;
revoke all on function public.telegram_unlink_chat(bigint) from public, anon, authenticated;
revoke all on function public.telegram_set_language(bigint, text) from public, anon, authenticated;
revoke all on function public.telegram_chat(bigint) from public, anon, authenticated;
revoke all on function public.telegram_report(bigint, text) from public, anon, authenticated;
revoke all on function public.enqueue_telegram_messages(timestamptz) from public, anon, authenticated;
grant execute on function public.telegram_claim(text, bigint) to service_role;
grant execute on function public.telegram_unlink_chat(bigint) to service_role;
grant execute on function public.telegram_set_language(bigint, text) to service_role;
grant execute on function public.telegram_chat(bigint) to service_role;
grant execute on function public.telegram_report(bigint, text) to service_role;
grant execute on function public.enqueue_telegram_messages(timestamptz) to service_role;

do $$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    perform cron.schedule('kiddo-telegram', '5 * * * *', 'select public.enqueue_telegram_messages()');
  end if;
end $$;
