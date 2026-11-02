-- Phase 44: accounts. A parent may give each child a small photo, records
-- which version of the terms they accepted, and can delete the whole account.
--
--   * Bucket `child-photos` is PRIVATE (no public URLs; the app downloads or
--     signs its own objects). One JPEG of at most 256 KB per child, at exactly
--     `<parent uid>/<child id>.jpg`. The policies below let a signed-in parent
--     add or replace only that path, and only for a child row of their own;
--     read and delete only photo files in their own folder (so a removed
--     child's photo can still be removed).
--     `anon` has no policy on the bucket, so it sees nothing.
--   * public.account_consents: one row per account (terms/privacy version and
--     when it was accepted, by the server's clock). Own row only; no delete
--     (the row goes when the account goes).
--   * Deleting the account (Edge Function `delete-account`: photos first, then
--     auth.admin.deleteUser) removes every family row by `on delete cascade`.
--     Checked for every public table up to 0018:
--       - cascade from auth.users: children, child_state, task_results,
--         subscriptions, child_events, admins, payments, ad_views,
--         promo_claims, promo_redemptions, presence_heartbeats, reward_ledger,
--         child_learn, promo_attempts, resource_ledger, world_state,
--         achievements, audio_requests, learning_memory,
--         learning_misconceptions, ai_consent, deleted_children,
--         account_consents (this file);
--       - cascade from children (no parent_id column of their own):
--         learning_evidence, grandfathered_items;
--       - hold no person at all, so nothing to delete: analytics_events
--         (0016: random install id only, no account or child), ai_cache
--         (generic replies), ai_usage (operational telemetry), tts_cache
--         (spoken app texts), ai_provider_state, app_settings, promo_codes,
--         ads, shop_items, building_levels, building_costs, world_rules.
--     So no foreign key had to be added. Storage objects are not rows of a
--     family table: the function removes `child-photos/<uid>/` itself before
--     it deletes the user (and does not delete the user if that fails).
-- Re-runnable (on conflict / if not exists / drop … if exists / create or replace).

-------------------------------------------------------------------------------
-- 1. Private bucket for child photos
-------------------------------------------------------------------------------

-- `on conflict … do update set public = false`: if a bucket of that name was
-- ever created as public by hand, re-running this makes it private again.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('child-photos', 'child-photos', false, 262144, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- True when `p_name` is exactly `<caller uid>/<id of one of the caller's
-- children>.jpg`: one folder (the caller's own uid), a file name that is an
-- existing own child id plus `.jpg`, nothing before, after or between. The
-- folder check (storage.foldername) is redundant with the exact match but
-- keeps the rule strict even for a child id that contained a `/`.
-- Security invoker: it reads public.children under the caller's own RLS.
create or replace function public.is_own_child_photo(p_name text)
returns boolean
language sql stable set search_path = '' as $$
  select auth.uid() is not null
    and p_name is not null
    and coalesce(array_length(storage.foldername(p_name), 1), 0) = 1
    and (storage.foldername(p_name))[1] = auth.uid()::text
    and exists (
      select 1 from public.children c
      where c.parent_id = auth.uid()
        and p_name = auth.uid()::text || '/' || c.id || '.jpg'
    )
$$;
revoke all on function public.is_own_child_photo(text) from public;
revoke execute on function public.is_own_child_photo(text) from anon;
grant execute on function public.is_own_child_photo(text) to authenticated;

-- Reading and deleting need only the parent's own folder (a photo file there, one level,
-- `<uid>/<id>.jpg`): so a child's photo can still be removed after the child row is gone
-- (removed on another device, offline, or while signed out), and turning cloud photos off
-- can list and remove everything there. Adding and replacing still need an own child row.
create or replace function public.is_own_photo_folder(p_name text)
returns boolean
language sql stable set search_path = '' as $$
  select auth.uid() is not null
    and p_name is not null
    and coalesce(array_length(storage.foldername(p_name), 1), 0) = 1
    and (storage.foldername(p_name))[1] = auth.uid()::text
    and p_name ~ ('^' || auth.uid()::text || '/[A-Za-z0-9_-]{1,64}\.jpg$')
$$;
revoke all on function public.is_own_photo_folder(text) from public;
revoke execute on function public.is_own_photo_folder(text) from anon;
grant execute on function public.is_own_photo_folder(text) to authenticated;

drop policy if exists "parents read own child photos" on storage.objects;
create policy "parents read own child photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'child-photos' and public.is_own_photo_folder(name));

drop policy if exists "parents add own child photos" on storage.objects;
create policy "parents add own child photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'child-photos' and public.is_own_child_photo(name));

-- Both sides: the old row must be theirs and the new one too (no renaming a
-- photo onto another path or into another bucket).
drop policy if exists "parents replace own child photos" on storage.objects;
create policy "parents replace own child photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'child-photos' and public.is_own_child_photo(name))
  with check (bucket_id = 'child-photos' and public.is_own_child_photo(name));

drop policy if exists "parents delete own child photos" on storage.objects;
create policy "parents delete own child photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'child-photos' and public.is_own_photo_folder(name));

-------------------------------------------------------------------------------
-- 2. Which terms version the parent accepted
-------------------------------------------------------------------------------

create table if not exists public.account_consents (
  parent_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  version text not null check (char_length(version) between 1 and 20),
  accepted_at timestamptz not null default now()
);

-- The server's clock decides when it was accepted, not the device's.
create or replace function public.stamp_account_consent()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.accepted_at = now();
  return new;
end;
$$;
revoke all on function public.stamp_account_consent() from public;
revoke execute on function public.stamp_account_consent() from anon, authenticated;

drop trigger if exists account_consents_stamp on public.account_consents;
create trigger account_consents_stamp before insert or update on public.account_consents
  for each row execute function public.stamp_account_consent();

alter table public.account_consents enable row level security;

drop policy if exists "read own account consent" on public.account_consents;
create policy "read own account consent" on public.account_consents
  for select to authenticated using (parent_id = auth.uid());
drop policy if exists "add own account consent" on public.account_consents;
create policy "add own account consent" on public.account_consents
  for insert to authenticated with check (parent_id = auth.uid());
drop policy if exists "change own account consent" on public.account_consents;
create policy "change own account consent" on public.account_consents
  for update to authenticated using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- As in 0005: no grants for anon at all, and no delete for clients.
revoke all on public.account_consents from anon;
revoke delete, truncate on public.account_consents from authenticated;
grant select, insert, update on public.account_consents to authenticated;
