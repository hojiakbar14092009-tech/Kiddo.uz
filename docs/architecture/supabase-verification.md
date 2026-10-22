# Supabase production verification (required before Phase 3)

Status on 2026-10-22: **not configured in production** (indirect evidence, see 0).
Points 1–5 below must be confirmed by the owner, who has the Vercel and Supabase
access this environment lacks. Nothing here changes data; every step only reads.

## 0. What was checked from here

- The deployed service worker (`https://kiddo-uz.vercel.app/sw.js`) lists the
  Supabase client chunk `assets/client-*.js`. In the deployed file
  `isSupabaseConfigured` is compiled to the constant `false` and `getSupabase()`
  always returns `null`, and no `*.supabase.co` address appears. Vite inlines
  `VITE_*` variables at build time, so the production build was made **without**
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Consequence: the live app runs only in device/demo mode. It does not read
  from or write to Supabase; all data stays in the browser's localStorage.
- Not checkable from here: the Vercel project settings, which Supabase project
  exists, its migrations and RLS policies (no Vercel env access through the
  connector, no Supabase credentials, the sandbox cannot reach either API).

## 1. Vercel environment variables

```bash
npm i -g vercel            # if not installed
vercel login
cd kiddo.uz && vercel link # choose the kiddo-uz project
vercel env ls              # look for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in "Production"
```

Expected for cloud mode: both listed for **Production** (and Preview if wanted).
If they are missing, add them and redeploy (`vercel env add VITE_SUPABASE_URL production`, then the same for the anon key; redeploy from the dashboard or push).
Never add the service-role key as a `VITE_*` variable.

## 2. The right Supabase project

```bash
npm i -g supabase
supabase login
supabase projects list     # note the project ref and region
```

Check that `VITE_SUPABASE_URL` is `https://<that-ref>.supabase.co`, and that the region
is acceptable for children's data (blocker B5).

## 3. Migrations 0001–0004 applied

```bash
cd kiddo.uz
supabase link --project-ref <ref>
supabase migration list    # "Remote" column must show 0001, 0002, 0003, 0004
```

Or in the dashboard SQL editor:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
-- and the tables the app expects:
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
-- expected: ad_views, admins, ads, app_settings, child_events, child_state, children,
-- payments, promo_claims, promo_codes, promo_redemptions, subscriptions, task_results
```

## 4. RLS active and safe

```sql
-- every public table must say rls_enabled = true
select c.relname as table, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- the policies themselves
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

-- security definer functions must pin search_path
select p.proname, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by 1;
```

Known problems to look for (Phase 0): `payments` has a parent `for all` policy
(should be select-only); the `kiddo-online` Realtime presence channel is public;
promo codes `KIDDO07` / `BOLAJON30` are active.

## 5. Is the live app really using Supabase?

In a desktop browser on https://kiddo-uz.vercel.app:

1. DevTools → Network, filter `supabase.co`, sign in to the parent area with
   e-mail (not "Demo"). Cloud mode shows requests to `/auth/v1/token` and
   `/rest/v1/...`; no requests means device mode.
2. DevTools → Application → Local Storage: key `kiddo.parent` shows
   `"mode":"cloud"` only in cloud mode; `kiddo.auth` exists only when signed in
   to Supabase.
3. In Supabase → Table editor → `children`: a child added on the device appears
   within a minute in cloud mode.

## Report back

Send the output of `vercel env ls`, `supabase migration list`, and the two RLS
queries (no keys needed), and whether step 5 showed requests. Phase 3 starts from
those facts.
