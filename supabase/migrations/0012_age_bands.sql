-- 0012: no learning ceiling by age (Phase 15). Kiddo adapts to the child's
-- answers; age bands (4–6, 7–9, 10–12, 13–15, 16+) only shape the
-- presentation and where a strand starts. The app's form takes children 4 to
-- 18; the synced age keeps growing with birthdays, so the database allows up
-- to 25 (as 0002 left room above the form's limit).
-- Safe to run twice.
alter table public.children drop constraint if exists children_age_check;
alter table public.children add constraint children_age_check check (age between 3 and 25);
