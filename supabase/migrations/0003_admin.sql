-- Kiddo admin panel: who is an admin, payments, app settings, and admin access.
--
-- Make someone an admin (once, in the SQL editor):
--   insert into public.admins (user_id) select id from auth.users where email = 'admin@example.com';

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "admins see admins" on public.admins;
create policy "admins see admins" on public.admins for select using (public.is_admin());

-- Every PRO payment. In test mode the app writes its own (mock) payment;
-- with a real provider the payment callback on the server writes it.
create table if not exists public.payments (
  id text primary key,
  parent_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  family text not null default '',
  plan text not null check (plan in ('monthly', 'yearly', 'lifetime')),
  provider text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create index if not exists payments_created_idx on public.payments (created_at desc);
alter table public.payments enable row level security;

drop policy if exists "own payments" on public.payments;
create policy "own payments" on public.payments
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- Prices, PRO gift coins and promo codes, editable from the admin panel.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "everyone reads settings" on public.app_settings;
create policy "everyone reads settings" on public.app_settings for select using (true);
drop policy if exists "admins write settings" on public.app_settings;
create policy "admins write settings" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Admins see every family's data and can change PRO and coins.
drop policy if exists "admins read children" on public.children;
create policy "admins read children" on public.children for select using (public.is_admin());

drop policy if exists "admins manage child state" on public.child_state;
create policy "admins manage child state" on public.child_state
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read results" on public.task_results;
create policy "admins read results" on public.task_results for select using (public.is_admin());

drop policy if exists "admins read payments" on public.payments;
create policy "admins read payments" on public.payments for select using (public.is_admin());

drop policy if exists "admins manage subscriptions" on public.subscriptions;
create policy "admins manage subscriptions" on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

-- Grants made from the admin panel are stored with source 'admin'.
alter table public.subscriptions drop constraint if exists subscriptions_source_check;
alter table public.subscriptions add constraint subscriptions_source_check
  check (source in ('payment', 'promo', 'admin'));

-- Live payment notifications in the admin panel.
do $$
begin
  alter publication supabase_realtime add table public.payments;
exception when others then null;
end $$;
