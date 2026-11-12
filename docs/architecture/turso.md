# Turso + one Vercel function (MVP)

- **One function**: `api/index.ts` → `server/router.ts`. `vercel.json` rewrites `/api/:path*` to `/api?path=…`
  (Hobby: 12 functions max; we use 1). Dev / `vite preview`: `scripts/dev-api.ts` serves the same router from `.env.local`.
- **Database**: Turso "kiddo" (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`), libsql over HTTPS (no WebSocket in serverless).
  Migrations in `server/migrations.ts`, applied once per cold start (`schema_migrations`), **only add** tables/indexes.
- **Supabase stays in the repo** (code, migrations, functions) but the MVP build does not use it; `SyncManager` runs only
  when Supabase env is set, `CloudSyncBridge` only when it is not.

## Tables (migration 1)
| table | holds |
|---|---|
| `users` | account: email / google_sub / phone / telegram_id (each unique), name |
| `sessions` | SHA-256 of the session cookie token, 30 days sliding (`last_seen_at` written ≤ once a day) |
| `auth_codes` | email / Telegram codes: hash, 5 min, one use, attempt counter |
| `telegram_logins` | one-time `/start` token (hash) → phone, status, sends (resend limit), 10 min |
| `user_state` | family progress, one row per (user, store): `rev` + JSON (≤ 512 KB) |
| `rate_limits` | fixed-window counters for sensitive routes |
| `subscriptions`, `payments` | Pro (server truth), test-mode payments with idempotency key |

## Security
Session = random 256-bit token in an httpOnly cookie (`__Host-` on https, SameSite), new token on every sign-in;
same-origin check on every non-webhook route (CSRF); `user_id` always from the session, never the request; parameterised SQL;
coarse in-memory IP limit (300/min) + per-route limits; errors log route + error name only.

## Sync (`src/services/cloud`)
Device first (zustand persist), cloud follows: changes batched (15 s debounce, ≤ 2 min, flush on tab hide), offline queue
in `kiddo.cloud`, revision-checked writes (stale → 409 + server copy → merge → retry). Engine loads only after sign-in.

## Load test (local libSQL file, `scripts/loadtest/api-load.mjs`, 2026-11-12)
Each VU: one PUT every 2 s (the app sends one per 15 s–2 min). One local Node process + SQLite file:
| VUs | req/s | errors | p50 | p95 |
|---|---|---|---|---|
| 50 | 24 | 0 % | 58 ms | 384 ms |
| 200 | 77 | 0 % | 364 ms | 1460 ms |
| 1000 | 196 | 60 % (timeouts; 409 = correct stale refusals after a timed-out write) | 1756 ms | 14 s |
Ceiling ≈ 200 req/s on one process ≈ 3 000 children playing at once at the app's real pace. Vercel scales instances;
Turso's write lock is the shared limit — re-measure against a Turso branch before a big launch.
