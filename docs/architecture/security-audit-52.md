# Phase 52: security audit

Date: 2026-11-02. Scope: the web app, the Vercel headers, the Supabase
migrations 0001–0019 (fixes in 0020), the Edge Functions and the npm packages. Real payments,
SMS and store releases are out of scope.

## Summary

| #   | Finding                                                        | Severity | Status                       |
| --- | -------------------------------------------------------------- | -------- | ---------------------------- |
| 1   | Every `VITE_` variable of a build was copied into the app code | High     | Fixed                        |
| 2   | No `Strict-Transport-Security` header                          | Medium   | Fixed                        |
| 3   | Build-time packages with known advisories (vite-plugin-pwa)    | Low      | Accepted, documented         |
| 4   | Outdated runtime packages (patch/minor)                        | Low      | Updated                      |
| 5   | `style-src 'unsafe-inline'` in the CSP                         | Low      | Accepted (animation library) |
| 6   | The admin's sign-in stayed on the device after the tab closed  | Medium   | Fixed                        |
| 7   | Anyone could flood the analytics table with new install ids    | Medium   | Fixed (0020)                 |
| 8   | `is_birthday_week` callable by anyone who knows a child id     | Low      | Fixed (0020)                 |
| 9   | Admin rights for an unconfirmed e-mail; last admin deletable   | Low      | Fixed (0020)                 |
| 10  | `record_opening_balance` trusts the client's first balance     | Low      | Accepted, documented         |

No Critical findings. No High or Medium finding remains open. Findings 6–10
came from an independent review of this audit.

## 1. Build variables leaked into the bundle (High, fixed)

`src/config/demo.ts` passed the whole `import.meta.env` object to a function.
Vite then inlines the complete env object, so every `VITE_` variable set for
the build ends up in the shipped JavaScript. Verified: a production build with
`VITE_ADMIN_PIN=LEAKCHECK9876` contained that string in `features-*.js`.

The device admin PIN itself was never accepted by a production build
(`adminPin()` returns `null` unless `MODE` is `e2e`), so the leak did not open
the admin panel. But anyone who set a secret as a `VITE_` variable in Vercel
would have published it.

Fix: the two demo flags are read by name. After the fix the same build
contains no PIN; the only `VITE_` names left are the two flag keys.
Regression test: `src/config/envUsage.test.ts` fails if any source file uses
`import.meta.env` as a whole object.

Rule for the owner: a `VITE_` variable is public by definition. Only
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public by design, protected
by RLS) belong there. Google, ElevenLabs and Telegram keys go only into
Supabase function secrets.

## 2. HSTS (Medium, fixed)

`vercel.json` now sends `Strict-Transport-Security: max-age=63072000;
includeSubDomains`. `preload` is left out on purpose: it is hard to undo and
is an owner decision once the final domain is fixed. Test:
`src/app/securityHeaders.test.ts`.

## 3. Packages (Low)

- Runtime dependencies: `npm audit --omit=dev` reports 0 vulnerabilities.
- Dev/build: 10 advisories (2 low, 8 moderate), all inside the
  `vite-plugin-pwa → workbox-build` chain (ejs, jake, minimatch, glob, ...).
  They run only on the build machine with our own files as input, never in the
  user's browser. npm's only offered fix is a breaking downgrade of
  vite-plugin-pwa; accepted until upstream ships a fixed workbox.
- `npm audit fix` applied the non-breaking fixes (fast-uri, serialize-javascript).
- Updated within their ranges: vite 8.3.5, zustand 5.0.16, framer-motion,
  i18next, react-i18next, react-router-dom, oxlint.
- Not updated: `@playwright/test` (must match the installed browser),
  TypeScript 7 and `@types/node` 26 (major versions, separate task).

## 6. Admin sign-in left on the device (Medium, fixed)

The admin panel signed in through the parent app's Supabase client, whose
session lives in `localStorage` (`kiddo.auth`) and refreshes itself. Only the
panel's own flag lasted for the tab. On a shared tablet, the child app (and its
cloud sync) then ran as the admin after the tab was closed.

Fix: the panel has its own client, `getAdminSupabase()`
(`src/services/supabase/client.ts`): key `kiddo.admin.auth`, stored in
`sessionStorage`. Closing the tab ends the admin session; the parent's session
is untouched. Test: `src/services/supabase/client.test.ts`. An admin who signed
in before this change should sign out once in the parent area to clear the
old stored session.

## 7. Analytics flood (Medium, fixed in 0020)

`add_analytics_events` is open to `anon` (the app sends events before any
account exists). Its cap was per install id, which the caller chooses. 0020
adds a cap for everyone together: at most 200 000 events a day, counted in
`analytics_daily` (no client access). The number is a constant in the function,
to be raised with the audience. A per-IP limit would need an Edge Function in
front; left for Phase 53 (scale).

## 8–9. Small database fixes (Low, fixed in 0020)

- `is_birthday_week` is no longer callable by `anon`/`authenticated` (0014 only
  revoked it from `public`, which leaves Supabase's default grants).
- `admin_add` accepts only an account with a confirmed e-mail.
- A trigger keeps the last admin: deleting the last row of `admins`, also
  through account deletion, fails with `last_admin`. The last admin must add
  another admin before deleting their account.

## 10. Opening balance (Low, accepted)

On a child's first sync, `record_opening_balance` takes the coins (up to
20 000) and items the device reports, without proof. That is the offline-first
design: a family that played offline keeps its savings. It is limited to the
parent's own children and to one opening per child; no other family is
affected. Revisit if nuts ever gain money value.

## Checked and in order

- **Keys server-only.** The repo and its git history contain no service-role
  key, Google/ElevenLabs/Telegram token or private key. `.env*` is ignored
  except `.env.example` (URL and anon key only). The Edge Functions read their
  secrets with `Deno.env.get`.
- **Admin rights.** A production build has no PIN admin and no demo admin; admin
  rights come only from a signed-in account listed in `public.admins`
  (`is_admin()`). The `admins` table has RLS with a select-only policy for
  admins; changes go through `admin_add` / `admin_remove`, which check
  `is_admin()` and are audited (0019). Every `admin_*` function checks
  `is_admin()`.
- **RLS.** Every table created in the migrations enables row level security.
  Every `security definer` function sets `search_path`. The SQL test suite
  (`supabase/tests/rls_test.sql`) checks child data isolation between parents.
- **XSS.** No `dangerouslySetInnerHTML` or `innerHTML` in the app; all text goes
  through React. No user-supplied URL reaches an `href`. CSP:
  `script-src 'self'`, no `unsafe-eval`, `object-src 'none'`,
  `frame-ancestors 'none'`, `base-uri 'self'`.
- **Rate limiting.** The Edge Functions (tts, voice-url, tutor) rate-limit per
  user (`audio_rate_ok`, per-call `auth` count, hourly and daily caps, a global
  daily synthesis cap), cap request bodies at 4 KB, echo CORS only for listed
  origins and never cache answers. Sign-in is rate-limited by Supabase Auth.
- **Admin preview (Phase 51).** The sandbox swaps storage before any store
  loads, fails closed, and turns off Supabase, sync, analytics, AI, audio
  functions and admin messages.

## Owner actions

1. Apply migration 0020 after 0014–0019.
2. In Vercel, keep only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and the
   demo flags) as `VITE_` variables. Remove any `VITE_ADMIN_PIN`.
3. Set `ALLOWED_ORIGINS` for the Edge Functions to the production domain.
4. Decide on HSTS `preload` once the final domain is fixed.
