-- Kiddo: cloud copy of a family's child profiles and progress.
-- Every row belongs to one parent (auth.users) and Row Level Security makes
-- sure a parent can only ever read and write their own family's rows.

-- Child profiles (1–3 per parent; the limit is enforced by a trigger below).
create table if not exists public.children (
  id text primary key,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  age smallint not null check (age between 3 and 6),
  gender text not null check (gender in ('girl', 'boy')),
  mascot text not null check (mascot in ('girl', 'boy')),
  daily_limit_minutes smallint not null default 30 check (daily_limit_minutes between 5 and 180),
  homework jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists children_parent_idx on public.children (parent_id);

-- Coins, learned letters, stickers, clothes and minutes per day: one row per child.
create table if not exists public.child_state (
  child_id text primary key references public.children (id) on delete cascade,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  learned jsonb not null default '{}'::jsonb,
  struggles jsonb not null default '{}'::jsonb,
  stickers text[] not null default '{}',
  outfits text[] not null default '{}',
  wearing jsonb not null default '{}'::jsonb,
  minutes_by_day jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Every finished game or test, for the parent report.
create table if not exists public.task_results (
  id text primary key,
  child_id text not null references public.children (id) on delete cascade,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('find-letter', 'find-picture', 'memory', 'trace', 'exam')),
  language text not null check (language in ('uz', 'ru', 'en')),
  letter_ids text[] not null default '{}',
  mistakes smallint not null default 0 check (mistakes >= 0),
  mistake_details jsonb not null default '[]'::jsonb,
  coins smallint not null check (coins >= 0),
  stars smallint not null check (stars between 1 and 3),
  sticker_id text,
  day date not null,
  finished_at timestamptz not null
);

create index if not exists task_results_child_day_idx on public.task_results (child_id, day desc);

-- PRO status. Clients may only read it: it is written by a trusted server
-- (payment provider callback / promo service) using the service role key.
create table if not exists public.subscriptions (
  parent_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly', 'lifetime')),
  source text not null check (source in ('payment', 'promo')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists children_touch on public.children;
create trigger children_touch before update on public.children
  for each row execute function public.touch_updated_at();

drop trigger if exists child_state_touch on public.child_state;
create trigger child_state_touch before update on public.child_state
  for each row execute function public.touch_updated_at();

-- At most three children per parent. An upsert of an existing child is an
-- update, not a new child, so it must never be blocked by the limit.
create or replace function public.limit_children()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.children where id = new.id) then
    return new;
  end if;
  if (select count(*) from public.children where parent_id = new.parent_id) >= 3 then
    raise exception 'A family has at most 3 child profiles';
  end if;
  return new;
end;
$$;

drop trigger if exists children_limit on public.children;
create trigger children_limit before insert on public.children
  for each row execute function public.limit_children();

-- Row Level Security: owners only.
alter table public.children enable row level security;
alter table public.child_state enable row level security;
alter table public.task_results enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "own children" on public.children;
create policy "own children" on public.children
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

drop policy if exists "own child state" on public.child_state;
create policy "own child state" on public.child_state
  for all using (parent_id = auth.uid())
  with check (
    parent_id = auth.uid()
    and exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

drop policy if exists "own results" on public.task_results;
create policy "own results" on public.task_results
  for all using (parent_id = auth.uid())
  with check (
    parent_id = auth.uid()
    and exists (select 1 from public.children c where c.id = child_id and c.parent_id = auth.uid())
  );

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (parent_id = auth.uid());
