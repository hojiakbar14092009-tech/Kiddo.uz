# Phase 53: scale

Date: 2026-11-02. Goal: the same app holds tens of thousands of families on
one Supabase project and Vercel, without new servers. Migration
`0021_scale.sql`, the Edge Functions `analytics` and `worker`, and the
load test in `scripts/loadtest/`.

## How the load is carried (no load balancer to run)

- **The app** is static files on Vercel's CDN; any number of visitors costs
  no server of ours.
- **Database connections are pooled by Supabase.** The app and the Edge
  Functions talk to the database only over HTTP (PostgREST, `supabase-js`),
  which keeps its own small pool; nothing opens a direct Postgres connection
  per user. Any script, report tool or job that needs SQL uses the
  **transaction pooler** (Supavisor, port `6543`). The direct connection
  (`5432`) is for migrations only.
- **Edge Functions** scale out by themselves; each one is stateless and keeps
  its limits in the database.
- **The database** grows by a bigger compute size in Supabase (one click,
  no code change). Read replicas are not needed at this size.

## What changed

| Area               | Change                                                                                           | Why                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Indexes            | An index for every foreign key (15) and `task_results (child_id, finished_at desc)`              | Deleting a family and RLS filters by `parent_id` used to read whole tables; the restore pages results newest first |
| RLS                | `auth.uid()` and `is_admin()` are wrapped as `(select …)` in every policy                        | Read once per query instead of once per row (Supabase advisor lint `auth_rls_initplan`)                            |
| App queries        | The restore reads children with `parent_id = <account>` as a filter                              | "Own rows or an admin" in RLS cannot use the index by itself                                                       |
| Analytics summary  | `analytics_installs`: one row per install, kept by `add_analytics_events`                        | The funnel and retention no longer scan every event                                                                |
| Materialized views | `admin_exits_daily`, `admin_revenue_daily`                                                       | The admin's exits and income read a few hundred rows                                                               |
| Admin panel        | Children, states and subscriptions are read page by page; income comes from `admin_revenue_days` | One request returns at most 1000 rows on Supabase, so the panel showed wrong totals past 1000 families or payments |
| Queue              | `jobs` + `worker` Edge Function, started by pg_cron                                              | Work that talks to the outside (Telegram from Phase 56) is retried, never lost                                     |
| Analytics          | Only through the `analytics` Edge Function, limited per IP                                       | One script can no longer use up the day's cap for everyone (deferred from Phase 52)                                |

### Freshness of the admin's numbers

- Funnel and retention: live.
- Income: closed days from the view, everything since its last refresh live.
- "Where the app was closed": refreshed every 10 minutes. The panel says so.
- pg_cron refreshes the views every 10 minutes. The panel shows when they were
  last refreshed. The admin's own calls never refresh: a refresh on a big day
  could outlast their time limit. When the views are older than 15 minutes,
  the calls queue a `refresh_admin_stats` job for the worker (at most one per
  10 minutes) and show the numbers they have.
- A server without 0021 yet: the panel still opens and counts income from the
  newest payments, as before. Vercel deploys before the owner applies a
  migration.

## Load test

`scripts/loadtest/run.sh` builds a scratch database on a local PostgreSQL
(the Supabase stand-in of the SQL tests), seeds a year of a mid-size
audience and runs `pgbench` with each workload. The seed is 20 000 families,
40 000 children, 400 000 results, 400 000 rewards, 30 000 payments, and
1 000 000 analytics events from 50 000 installs.

```
PGHOST=/var/tmp/kiddo-pg/sock PGUSER=postgres sh scripts/loadtest/run.sh            # after
PGHOST=/var/tmp/kiddo-pg/sock PGUSER=postgres UPTO=20 sh scripts/loadtest/run.sh    # before
```

Results on the 2-core development machine, 8 clients, 15 s per workload.
These numbers compare the two versions. They are not production speed.

| Workload                                                 | Before (up to 0020) | After (0021)      |
| -------------------------------------------------------- | ------------------- | ----------------- |
| Restore as the app sent it before (children by RLS only) | 9.9 tps, 810 ms     | 644 tps, 12 ms    |
| Restore as the app sends it now (with the parent filter) | 2 687 tps, 3.0 ms   | 2 660 tps, 3.0 ms |
| A finished game (`record_reward`)                        | 1 310 tps, 6.1 ms   | 1 632 tps, 4.9 ms |
| An analytics batch of 5 events                           | 995 tps, 8.0 ms     | 953 tps, 8.4 ms   |
| Admin dashboard (funnel, retention, exits), 2 clients    | 3.4 tps, 582 ms     | 4 337 tps, 0.5 ms |
| Mix (restore 6 : game 3 : analytics 1)                   | 1 792 tps, 4.5 ms   | 1 843 tps, 4.3 ms |

Taken together, the app's restore goes from about 10 to about 2 700 per
second, and the admin dashboard from over half a second to half a millisecond.
An analytics batch costs a few per cent more, because it keeps the
per-install summary up to date. Runs differ by about ±10 % on this machine.

## The job queue

- `enqueue_job(kind, payload, run_at, dedupe_key, max_attempts)` adds a job.
  With a dedupe key, the job is added only once. Only the service role can
  call it.
- `claim_jobs` hands due jobs to a worker with a lease (`for update skip
locked`). Two runs never get the same job. A run that dies gives its jobs
  back when the lease ends.
- The worker claims 3 jobs at a time, with a 75 s lease: longer than 3 jobs
  at their 15 s time limit, so a lease never runs out while its job is still
  being done.
- `finish_job` and `fail_job` take the try number (`attempts`) the run was
  given. A run whose lease ran out, and whose job went to another run,
  changes nothing.
- A job whose last try never reported back (the run died) is marked dead, not
  tried for ever.
- A failed job is tried again after 30 s, 1, 2, 4 … minutes (at most an
  hour). It becomes `dead` after `max_attempts`, or at once for a job that
  can never succeed (`PermanentJobError`, or an unknown kind).
- Done jobs are deleted after 7 days, dead jobs after 30 (`prune_jobs`,
  daily).
- `kick_worker()` runs every minute from pg_cron. It calls the `worker`
  function only when a job is due.
- To add a kind of job, put a handler in `supabase/functions/worker/index.ts`
  and enqueue jobs of that kind. Phase 56 adds the Telegram messages this way.

## Analytics per IP

- The app posts `{ events }` to `/functions/v1/analytics` (keepalive on
  leaving).
- The function stores an HMAC of `day|ip` keyed with `ANALYTICS_IP_SALT`. The
  address itself is never stored, and the hash changes every day.
- The address comes only from headers the platform writes: `cf-connecting-ip`,
  then `x-real-ip`, then the last hop of `x-forwarded-for`. The first hop of
  `x-forwarded-for` is whatever the client wrote, so it is never used; a forged
  value cannot open a new window. If no address is present, each device gets
  its own window, never one shared by everyone. After deploying, check once in
  the function logs that real requests carry `cf-connecting-ip`.
- The limit is the number of events per IP per hour (`ANALYTICS_IP_EVENTS_PER_HOUR`,
  default 3 000). It counts events, not requests, because many families share
  one mobile carrier address (CGNAT). A device sends a few dozen events a day.
- Over the limit, the answer is 429 and the device keeps the events for later.
  A 400 means the data itself was refused, and the device drops it.
- The day cap of 0020 (200 000 events) still applies to everyone together.

## Owner actions (in this order)

1. Function secrets (Dashboard → Edge Functions → Secrets):
   - `ANALYTICS_IP_SALT`: a random string of 32+ characters.
   - `WORKER_SECRET`: a random string of 40+ characters.
   - `ALLOWED_ORIGINS`: the production domain.
   - Optionally `ANALYTICS_IP_EVENTS_PER_HOUR`.
2. Deploy the functions:
   `supabase functions deploy analytics` and `supabase functions deploy worker`.
   Both use `verify_jwt = false` (`supabase/config.toml`).
3. Enable the extensions `pg_cron` and `pg_net` (Dashboard → Database →
   Extensions).
4. Put two secrets in Vault (SQL editor):
   `select vault.create_secret('https://<ref>.supabase.co', 'kiddo_project_url');`
   `select vault.create_secret('<the WORKER_SECRET>', 'kiddo_worker_secret');`
5. Apply `0021_scale.sql`. It schedules the three cron jobs when pg_cron is
   enabled. If pg_cron is enabled later, run 0021 again; it is safe to re-run.

If 0021 is applied before the `analytics` function is deployed, nothing is
lost: devices keep their events (up to two days) and send them once the function answers. A device still running the app from
before Phase 53 (an old cached PWA) is refused by the database until it
updates. Its waiting events are retried, but the "leaving" events of such a
device are lost.

Until the Vault secrets exist and match `WORKER_SECRET`, `kick_worker` sends
nothing and queued jobs wait. After step 4, check in the `jobs` table that
`refresh_admin_stats` jobs get a `done_at`.
