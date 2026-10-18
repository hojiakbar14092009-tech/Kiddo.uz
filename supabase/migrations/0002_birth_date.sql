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
