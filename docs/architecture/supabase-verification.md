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

## 6. Applying 0005 (security hotfix)

`supabase/migrations/0005_security.sql` closes the Phase 0 "high" findings on the
server side: payments become select-only for parents, presence moves from the public
Realtime channel to a private `presence_heartbeats` table (no names), coins get an
append-only `reward_ledger` written only through `record_reward()` (ownership check,
reason allow-list, sign by reason, per-entry bounds, 500 coins/child/day cap on play
rewards, `pro-gift` only from the service role or an admin, idempotent by
`(child, reason, ref)`), learning data gets `child_learn`, promo redeeming goes
through the new `redeem_promo_code()`: a code works only for the account that claimed
it after watching an ad (`promo_claims`, one per account), and 5 failed codes per
account per 10 minutes block further tries. The old `redeem_promo()` can no longer be
called by signed-in clients (its failures rolled back and could not be counted). The
launch codes `KIDDO07`/`BOLAJON30` stay **active** (owner decision); without an ad
claim they answer `invalid` like any wrong code. jsonb columns get size limits and
`anon` loses its grants on family tables.

**Not a security boundary yet:** the coin balance the app shows
(`child_state.coins`) is still written by the device during sync, so a modified
client can still set any balance. The ledger and its daily cap are the audit trail
and the base for deriving the balance on the server (rollout step 5); until then
they bound the ledger only. Making `child_state.coins` read-only now would break the
device→cloud sync of coins, so it is deliberately left for that step.

Verified here only against a local PostgreSQL 16 with a minimal Supabase stand-in
(roles `anon`/`authenticated`/`service_role`, `auth.uid()` from
`request.jwt.claims`): 0001–0005 apply in order, 0005 applies a second time without
errors, and RLS/RPC assertions pass. It has **not** been applied to the real project.

Apply 0001–0004 first (section 3), then **one** of:

```bash
# CLI (recommended: records the version in supabase_migrations.schema_migrations)
cd kiddo.uz
supabase link --project-ref <ref>
supabase db push              # applies every local migration the remote lacks
supabase migration list       # "Remote" now shows 0005 too
```

or Dashboard → SQL Editor → paste the whole file → Run (it runs in one transaction;
re-running is safe). The SQL editor does not record the migration version: run
`supabase migration repair --status applied 0005` afterwards if you also use the CLI.

Then, in the dashboard:

1. **Realtime → Settings (required):** disable public channel access – turn off
   "Allow public access" so only private channels (with Realtime authorization) are
   allowed. Otherwise anyone with the anon key can still join the old `kiddo-online`
   presence channel that older cached app versions keep announcing child names on.
   The new app no longer uses Realtime presence. Admin live payments use
   `postgres_changes` on `payments`, which stays protected by RLS.
2. **Admin panel → Promokodlar:** check the active codes; `KIDDO07`/`BOLAJON30` stay
   active by decision and are only redeemable after the ad claim.
3. Nothing to revoke by hand: 0005 already revokes the old `redeem_promo(text)` from
   `authenticated` (the app falls back to it only on servers without 0005).

### Post-apply checklist (SQL editor, read-only)

```sql
-- payments: parents may only SELECT their own rows; writes only for admins
-- (the service role bypasses RLS). Expect "read own payments" (SELECT),
-- "admins read payments" (SELECT), "admins write payments" (ALL, is_admin()).
-- There must be NO "own payments" policy any more.
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'payments';

-- presence table exists, RLS on, own rows + admin read
select c.relname, c.relrowsecurity from pg_class c
where c.oid = 'public.presence_heartbeats'::regclass;
select policyname, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename = 'presence_heartbeats';
-- no name column:
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'presence_heartbeats';

-- reward_ledger: only a SELECT policy, and no insert/update/delete privilege for
-- clients, so the only way in is record_reward(). Expect one row, cmd = SELECT:
select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'reward_ledger';
-- expect false, false, false:
select has_table_privilege('authenticated', 'public.reward_ledger', 'insert') as ins,
       has_table_privilege('authenticated', 'public.reward_ledger', 'update') as upd,
       has_table_privilege('authenticated', 'public.reward_ledger', 'delete') as del;

-- record_reward / redeem_promo_code are security definer with an empty search_path,
-- executable by authenticated only (not anon):
select p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'execute') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('record_reward', 'redeem_promo_code', 'redeem_promo', 'owns_child', 'is_admin');

-- anon has no access to family tables (expect all false):
select t, has_table_privilege('anon', 'public.' || t, 'select') as anon_select
from unnest(array['children', 'child_state', 'task_results', 'payments', 'subscriptions',
                  'presence_heartbeats', 'reward_ledger', 'child_learn']) as t;

-- launch codes stay active (owner decision) but need an ad claim; the old RPC is
-- not callable by clients (expect active = true, legacy_callable = false):
select code, active from public.promo_codes where code in ('KIDDO07', 'BOLAJON30');
select has_function_privilege('authenticated', 'public.redeem_promo(text)', 'execute')
  as legacy_callable;
```

Dashboard check: **Realtime → Settings** shows public access disabled (private
channels only). From a browser console with only the anon key, joining
`kiddo-online` must fail or receive nothing.

Behaviour check as a real parent (browser, cloud account, DevTools → Network):

1. Play a game: a `POST /rest/v1/rpc/record_reward` returns 200; repeating the same
   request returns the same row (idempotent).
2. While a child plays, `POST /rest/v1/presence_heartbeats` about once a minute; no
   `realtime/v1/websocket` join to `kiddo-online`.
3. Paying in test mode in cloud mode no longer writes `payments`; PRO comes only from
   the `subscriptions` row (deleting that row as admin turns the device back to Free
   within 6 h, or at once on the next app resume). Without any successful server
   read for 7 days, the device treats cloud PRO as Free; signing out of the cloud
   account clears it on the device.

## Report back

Send the output of `vercel env ls`, `supabase migration list`, the two RLS
queries (no keys needed), the post-apply checklist of section 6, and whether step 5 showed requests. Phase 3 starts from
those facts.
