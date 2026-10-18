-- Promo codes earned by watching an ad.
--
-- The codes are private: only admins can read the table. A parent gets one
-- code (once per account) from claim_promo(), and only after the server saw
-- an ad view that lasted the whole ad. Codes are redeemed on the server too,
-- so the browser never holds the list of codes.

-- Promo codes no longer live in the public app_settings table.
delete from public.app_settings where key = 'promoCodes';

create table if not exists public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  days integer not null check (days between 1 and 365),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
drop policy if exists "admins manage promo codes" on public.promo_codes;
create policy "admins manage promo codes" on public.promo_codes
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.promo_codes (code, days) values ('KIDDO07', 7), ('BOLAJON30', 30)
on conflict (code) do nothing;

-- Ads the admin puts up. Everyone may read the active ones (they are not secret).
create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  video_url text not null,
  duration_s numeric not null check (duration_s > 0 and duration_s <= 600),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.ads enable row level security;
drop policy if exists "everyone reads active ads" on public.ads;
create policy "everyone reads active ads" on public.ads
  for select using (active or public.is_admin());
drop policy if exists "admins manage ads" on public.ads;
create policy "admins manage ads" on public.ads
  for all using (public.is_admin()) with check (public.is_admin());

-- One row per started ad view; the server's own clock decides if it was watched to the end.
create table if not exists public.ad_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ad_id uuid not null references public.ads (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.ad_views enable row level security;
drop policy if exists "admins read ad views" on public.ad_views;
create policy "admins read ad views" on public.ad_views for select using (public.is_admin());

-- The one code each account got.
create table if not exists public.promo_claims (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null references public.promo_codes (code) on delete cascade,
  claimed_at timestamptz not null default now()
);
alter table public.promo_claims enable row level security;
drop policy if exists "read own claim" on public.promo_claims;
create policy "read own claim" on public.promo_claims
  for select using (user_id = auth.uid() or public.is_admin());

-- Codes each account has used (each code works once per account).
create table if not exists public.promo_redemptions (
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  redeemed_at timestamptz not null default now(),
  primary key (user_id, code)
);
alter table public.promo_redemptions enable row level security;
drop policy if exists "read own redemptions" on public.promo_redemptions;
create policy "read own redemptions" on public.promo_redemptions
  for select using (user_id = auth.uid() or public.is_admin());

-- Starts watching an ad; returns the view id the claim must show.
create or replace function public.start_ad_view(p_ad uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from ads where id = p_ad and active) then
    raise exception 'no_ad';
  end if;
  insert into ad_views (user_id, ad_id) values (auth.uid(), p_ad) returning id into v_id;
  return v_id;
end $$;

-- After the whole ad: hands out one code, once per account.
create or replace function public.claim_promo(p_view uuid)
returns table (code text, days integer)
language plpgsql security definer set search_path = public as $$
declare
  v_view ad_views;
  v_duration numeric;
  v_code text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;

  if exists (select 1 from promo_claims c where c.user_id = auth.uid()) then
    raise exception 'already_claimed';
  end if;

  select * into v_view from ad_views v
  where v.id = p_view and v.user_id = auth.uid() and v.completed_at is null;
  if not found then raise exception 'no_view'; end if;

  select a.duration_s into v_duration from ads a where a.id = v_view.ad_id;
  -- a little slack for network delay, never more than two seconds
  if now() - v_view.started_at < make_interval(secs => greatest(v_duration - 2, 1)) then
    raise exception 'not_finished';
  end if;

  select p.code into v_code from promo_codes p
  where p.active
    and not exists (
      select 1 from promo_redemptions r where r.user_id = auth.uid() and r.code = p.code
    )
  order by random()
  limit 1;
  if v_code is null then raise exception 'no_codes'; end if;

  update ad_views set completed_at = now() where id = p_view;
  insert into promo_claims (user_id, code) values (auth.uid(), v_code);
  return query select p.code, p.days from promo_codes p where p.code = v_code;
end $$;

-- The code this account already got (to show it again).
create or replace function public.my_promo_claim()
returns table (code text, days integer, claimed_at timestamptz)
language sql security definer set search_path = public as $$
  select c.code, p.days, c.claimed_at
  from promo_claims c join promo_codes p on p.code = c.code
  where c.user_id = auth.uid();
$$;

-- Uses a code: adds its days to the family's PRO. Returns the new end date.
create or replace function public.redeem_promo(p_code text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(p_code));
  v_days integer;
  v_sub subscriptions;
  v_end timestamptz;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;

  select p.days into v_days from promo_codes p where p.code = v_code and p.active;
  if v_days is null then raise exception 'invalid'; end if;

  if exists (select 1 from promo_redemptions r where r.user_id = auth.uid() and r.code = v_code) then
    raise exception 'used';
  end if;

  select * into v_sub from subscriptions s where s.parent_id = auth.uid();
  if found and v_sub.expires_at is null then raise exception 'lifetime'; end if;

  v_end := greatest(coalesce(v_sub.expires_at, now()), now()) + make_interval(days => v_days);
  insert into subscriptions (parent_id, plan, source, expires_at)
  values (auth.uid(), coalesce(v_sub.plan, 'monthly'), 'promo', v_end)
  on conflict (parent_id) do update
    set expires_at = excluded.expires_at, source = 'promo';
  insert into promo_redemptions (user_id, code) values (auth.uid(), v_code);
  return v_end;
end $$;

revoke all on function public.start_ad_view(uuid) from public;
revoke all on function public.claim_promo(uuid) from public;
revoke all on function public.my_promo_claim() from public;
revoke all on function public.redeem_promo(text) from public;
grant execute on function public.start_ad_view(uuid) to authenticated;
grant execute on function public.claim_promo(uuid) to authenticated;
grant execute on function public.my_promo_claim() to authenticated;
grant execute on function public.redeem_promo(text) to authenticated;

-- Ad videos the admin uploads: public to watch, only admins write.
insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do nothing;

drop policy if exists "admins upload ads" on storage.objects;
create policy "admins upload ads" on storage.objects
  for insert to authenticated with check (bucket_id = 'ads' and public.is_admin());
drop policy if exists "admins change ads" on storage.objects;
create policy "admins change ads" on storage.objects
  for update to authenticated using (bucket_id = 'ads' and public.is_admin());
drop policy if exists "admins delete ads" on storage.objects;
create policy "admins delete ads" on storage.objects
  for delete to authenticated using (bucket_id = 'ads' and public.is_admin());
