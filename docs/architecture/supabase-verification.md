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

## 7. Applying 0007 and private voice

`supabase/migrations/0007_audio.sql` and the Edge Functions `voice-url` and `tts`
make voice a PRO feature the server enforces (contract:
`docs/architecture/audio-security.md`). 0007 adds:

- the **private** Storage bucket `voice` (mp3 only, 2 MB per file) with **no**
  `storage.objects` policy, so no client (not even an admin's browser) can list or
  download it; only the service role inside the functions can, and browsers only get
  5-minute signed URLs for single clips;
- `is_pro_active(uuid)` (security definer, empty `search_path`): `subscriptions`
  row with `status = 'active'` and `expires_at` null or in the future. Executable by
  `service_role` **only** – a version for signed-in clients would let any parent
  probe another account's PRO, and the app already reads its own row through RLS;
- `audio_requests` + `audio_rate_ok(uid, kind, limit, window_seconds)` (service role
  only): a per-user, per-kind (`auth`, `voice`, `tts`) sliding window; refused calls
  are not recorded; rows older than a day are removed as it runs. `auth` counts every
  signed-in call before the PRO check, so a Free account cannot hammer it;
- `audio_daily_count(kind)` (service role only): all users' requests of a kind since
  00:00 UTC – the global TTS cap (`TTS_DAILY_CAP`, default 2000/day → 429);
- `tts_cache` (language, sha256 of `language || text`, path `tts/<lang>/<hash>.mp3`,
  voice that made it): RLS on, no policies, no client grants;
- `tts_cache_expired(days, limit)` (service role only, read-only): paths of cached
  sentences older than `days`, for the 30-day cleanup below.

Verified here only against the local PostgreSQL stand-in (`supabase/tests/run.sh`:
0001–0007 apply in order, 0007 applies twice, bucket/RPC/grant/rate/daily-count/expiry
assertions pass) and `deno check` of both functions. `supabase/config.toml` holds only
`project_id` (the CLI's local name, required by its config loader) and
`[functions.voice-url]` / `[functions.tts]` with `verify_jwt = true`; every other
setting keeps the CLI default. Nothing has been applied or deployed to the real
project.

Order matters – the site must keep the public clips until the private ones work:

```bash
cd kiddo.uz
supabase link --project-ref <ref>
supabase db push                       # applies 0007 (after 0005/0006, sections 3 and 6)

supabase functions deploy voice-url tts

# Edge Function secrets. SUPABASE_URL, SUPABASE_ANON_KEY and
# SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically – do not set them.
supabase secrets set ALLOWED_ORIGINS=https://kiddo-uz.vercel.app
# optional limits (defaults per user: auth 300 / 60 s – counted before the PRO check –,
# voice 120 / 60 s, tts 30 / 3600 s; and tts 2000 per UTC day for all users together)
#   supabase secrets set AUTH_RATE_LIMIT=300 AUTH_RATE_WINDOW_S=60 \
#     VOICE_RATE_LIMIT=120 VOICE_RATE_WINDOW_S=60 TTS_RATE_LIMIT=30 TTS_RATE_WINDOW_S=3600 \
#     TTS_DAILY_CAP=2000
# TTS sends sentences (never the child's name: docs/architecture/audio-security.md) to
# the provider and keeps their audio 30 days: set a provider only after owner
# blocker B5 (consent text, data location) is decided.
# TTS is off (503 unavailable) until a provider is set. Only Azure is implemented;
# each voice must belong to its own language (uz-UZ-… for uz), otherwise that
# language stays unavailable – an Uzbek sentence is never read by another voice:
#   supabase secrets set TTS_PROVIDER=azure TTS_API_KEY=<azure speech key> TTS_REGION=<region> \
#     TTS_VOICE_UZ=uz-UZ-MadinaNeural TTS_VOICE_RU=ru-RU-SvetlanaNeural TTS_VOICE_EN=en-US-AnaNeural
supabase secrets list                  # names only

# Upload the recorded clips to the private bucket. Keys only in the shell
# environment of this one command – never in .env files or the repo.
node scripts/voices/upload-private.mjs --dry-run            # counts only
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  node scripts/voices/upload-private.mjs                    # skips clips already there
```

The script refuses a public bucket and a non-service-role key, never overwrites or
deletes, and exits non-zero if any upload failed (run it again: it continues).

Smoke test before switching the site (a PRO parent's access token from DevTools →
Application → Local Storage `kiddo.auth`, then a free account's token):

```bash
curl -s -X POST https://<ref>.supabase.co/functions/v1/voice-url \
  -H "Authorization: Bearer <access token>" -H "apikey: <anon key>" \
  -H "Content-Type: application/json" -d '{"keys":["uz/000cef41"]}'
# PRO  → {"urls":{"uz/000cef41":"https://…/object/sign/voice/uz/000cef41.mp3?token=…"},"expiresIn":300}
# Free → 403 {"error":"not_pro"} · no token → 401 · bad key → 400 {"error":"bad_request"}
# tts without a provider → 503 {"error":"unavailable"}
```

Then switch the site: Vercel → Project → Settings → Environment Variables → add
`VITE_VOICE_PRIVATE` = `true` for Production (`vercel env add VITE_VOICE_PRIVATE production`)
and **redeploy** (Vite inlines it at build time). Without it the site keeps the
public clips (mode `public`).

After the switch: older Vercel deployments still serve `public/audio/voice` at their
own deployment URLs. Turn on Vercel Deployment Protection for preview/older
deployments (Settings → Deployment Protection) or delete them, otherwise the clips
stay downloadable there.

### Post-apply checklist (SQL editor, read-only)

```sql
-- bucket exists and is private (expect public = false, 2097152, {audio/mpeg})
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'voice';

-- EVERY storage.objects policy – not only those that mention "voice": a policy that
-- does not pin one bucket (no bucket_id test, bucket_id <> …, bucket_id in (…), an OR,
-- a helper function, `true`) can open the voice bucket without naming it.
-- Expect on every row: pinned_bucket filled and not 'voice', ok = true.
with p as (
  select policyname, cmd, roles, permissive, qual, with_check,
         coalesce(qual, '') || ' ' || coalesce(with_check, '') as rule
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
)
select policyname, cmd, roles, permissive,
       substring(rule from 'bucket_id = ''([^'']+)''::text') as pinned_bucket,
       (rule ~ 'bucket_id = ''[^'']+''::text'
        and rule !~ '''voice'''
        and rule !~* 'bucket_id\s*(<>|!=|in\M|like|~|is)'
        and rule !~* '\mor\M') as ok,
       qual, with_check
from p
order by policyname;
-- Read every row as well: each policy must AND exactly one other bucket
-- (`bucket_id = 'ads'::text AND …`) with its other conditions. A row with ok = false
-- or an empty pinned_bucket is a blocker – fix or drop that policy before switching
-- the site to private voice. (Today, from 0004: only the three "admins … ads" rows.)

-- functions: security definer, empty search_path, service role only
-- (expect 4 rows: prosecdef true, search_path="", anon_exec false, auth_exec false,
--  service_exec true)
select p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'execute') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
       has_function_privilege('service_role', p.oid, 'execute') as service_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_pro_active', 'audio_rate_ok', 'audio_daily_count', 'tts_cache_expired');

-- server-only tables: RLS on, no policies, no client grants (expect true, 0 rows, all false)
select c.relname, c.relrowsecurity from pg_class c
where c.oid in ('public.tts_cache'::regclass, 'public.audio_requests'::regclass);
select tablename, policyname from pg_policies
where schemaname = 'public' and tablename in ('tts_cache', 'audio_requests');
select t, has_table_privilege('anon', 'public.' || t, 'select') as anon_sel,
          has_table_privilege('authenticated', 'public.' || t, 'select') as auth_sel,
          has_table_privilege('authenticated', 'public.' || t, 'insert') as auth_ins
from unnest(array['tts_cache', 'audio_requests']) as t;

-- clips uploaded (expect about 7178 after the script; tts/ grows with use)
select split_part(name, '/', 1) as folder, count(*) from storage.objects
where bucket_id = 'voice' group by 1 order by 1;

-- TTS volume today (what TTS_DAILY_CAP compares with) and sentences past the 30-day TTL
select public.audio_daily_count('tts') as tts_today;
select count(*) as expired_now from public.tts_cache_expired(30, 10000);
```

### Live check with a signed-in user's token (must fail)

SQL does not prove what Storage serves. With the access token of an ordinary
signed-in parent – a PRO and a Free account, each – (DevTools → Application → Local
Storage `kiddo.auth`, `access_token`), against the real project:

```bash
T=<user access token>; A=<anon key>; U=https://<ref>.supabase.co
# download through the authenticated endpoint → 400/404 "not found", never audio/mpeg
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' \
  -H "Authorization: Bearer $T" -H "apikey: $A" \
  "$U/storage/v1/object/authenticated/voice/uz/000cef41.mp3"
# listing the bucket → [] (or an error), never file names
curl -s -X POST -H "Authorization: Bearer $T" -H "apikey: $A" -H 'Content-Type: application/json' \
  -d '{"prefix":"uz","limit":5}' "$U/storage/v1/object/list/voice"
curl -s -X POST -H "Authorization: Bearer $T" -H "apikey: $A" -H 'Content-Type: application/json' \
  -d '{"prefix":"tts/uz","limit":5}' "$U/storage/v1/object/list/voice"
# the public endpoint → 400 (bucket not public)
curl -s -o /dev/null -w '%{http_code}\n' "$U/storage/v1/object/public/voice/uz/000cef41.mp3"
# the server-only functions → permission denied (401/403/404), never a number
curl -s -X POST -H "Authorization: Bearer $T" -H "apikey: $A" -H 'Content-Type: application/json' \
  -d '{"p_kind":"tts"}' "$U/rest/v1/rpc/audio_daily_count"
```

Any `200` with `audio/mpeg`, or a non-empty list, is a blocker: some storage policy
opens the bucket – go back to the policy query above.

### TTS cache cleanup (30-day TTL)

Generated sentences are kept 30 days. SQL alone cannot delete the files (Storage
objects are removed through the Storage API), so the cleanup is a script with the
service-role key only in the shell environment of that one command:

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  node scripts/voices/cleanup-tts.mjs --dry-run        # count only
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  node scripts/voices/cleanup-tts.mjs                  # --days=30 is the default
```

It removes the objects first and only then their `tts_cache` rows (via
`tts_cache_expired`), so a failed run is simply repeated. Schedule it weekly – a
GitHub Actions `schedule:` job with the two values as repository secrets, or `cron`
on the owner's machine – or run it by hand at least monthly while TTS is on. With TTS
off (no `TTS_PROVIDER`) nothing is generated and nothing needs cleaning.

Behaviour check in the browser (PRO parent, cloud mode, after the redeploy): playing
a word shows a `POST /functions/v1/voice-url` (200) and then a GET of
`/storage/v1/object/sign/voice/…`; `https://kiddo-uz.vercel.app/audio/voice/uz/000cef41.mp3`
no longer returns audio. A free account gets the PRO lock, never another voice.

## 8. Applying 0009 and 0010 (balance authority, integrity hardening)

`0009_balance_authority.sql` makes the coin balance the sum of the reward ledger
(with one opening entry per child for coins earned before the ledger existed,
and the outfits and pets owned then kept). `0010_integrity_hardening.sql`
closes the Phase 13 audit's findings: backdated resource uploads, unpaid city
upgrades, ad and promo farming, child-id reuse, `child_events` ownership, the
anon grants, per-account audio limits. Both are safe to run twice;
`docs/architecture/security.md` explains the whole trust boundary.

```bash
supabase db push                       # applies 0009, 0010 after 0001–0008
```

Check (SQL editor):

```sql
-- every stored balance equals its ledger
select count(*) from public.child_state s
where s.coins <> public.child_coin_balance(s.child_id);          -- expect 0
-- the city's prices are on the server
select count(*) from public.building_levels;                       -- expect 42
```

Redeploy the Edge Functions afterwards (`supabase functions deploy tts voice-url`):
they call the five-argument `audio_rate_ok` that 0010 adds. Optional secrets:
`VOICE_USER_DAILY` (300), `TTS_USER_DAILY` (200), `SYNTH_USER_DAILY` (100).
A promo claim now needs a confirmed e-mail address: keep "Confirm email" on in
Supabase Auth.

## Report back

Send the output of `vercel env ls`, `supabase migration list`, the two RLS
queries (no keys needed), the post-apply checklist of section 6, and whether step 5 showed requests. Phase 3 starts from
those facts.
