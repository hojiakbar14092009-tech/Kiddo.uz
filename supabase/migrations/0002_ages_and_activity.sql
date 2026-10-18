-- Children now have a birth date; the app opens games by age (4, 5 and 6).
-- `age` stays as the age on the last sync, and may grow past 6 over time.
alter table public.children drop constraint if exists children_age_check;
alter table public.children add constraint children_age_check check (age between 3 and 12);
alter table public.children add column if not exists birth_date date;
alter table public.children add column if not exists celebrated_level smallint not null default 4
  check (celebrated_level between 4 and 6);

-- No limit on the number of child profiles any more.
drop trigger if exists children_limit on public.children;
drop function if exists public.limit_children();

-- When a child leaves the app or comes back, for the parent's activity list.
create table if not exists public.child_events (
  id text primary key,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  child_id text not null references public.children (id) on delete cascade,
  kind text not null check (kind in ('left', 'returned')),
  at timestamptz not null
);
create index if not exists child_events_child_idx on public.child_events (child_id, at desc);
alter table public.child_events enable row level security;
drop policy if exists "own child events" on public.child_events;
create policy "own child events" on public.child_events
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- Pets adopted in the shop, and the one walking with the robot.
alter table public.child_state add column if not exists pets jsonb not null default '[]'::jsonb;
alter table public.child_state add column if not exists pet text;
