# Security and trust boundary (Phase 13)

Who decides what in Kiddo, what is protected, and what is not. Read with
`audio-security.md` (voice clips, TTS) and `supabase-verification.md` (how the
owner applies the migrations).

## Two modes, two kinds of protection

|                 | Device mode (production today)                        | Cloud mode (`VITE_SUPABASE_*` set)                               |
| --------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| PRO             | `kiddo.subscription` in the browser: an honour system | the `subscriptions` row; the device only caches it               |
| Coins           | device ledger (`kiddo.rewards`)                       | `reward_ledger`; `child_state.coins` is its sum (0009)           |
| Resources, city | device (`kiddo.universe`)                             | `resource_ledger`, `world_state` via RPCs (0006, 0010, 0011)     |
| Voice clips     | public files in `dist/audio/voice`                    | private bucket, signed URLs for PRO (0007, `VITE_VOICE_PRIVATE`) |
| Admin           | none in production builds                             | an account in `admins`, checked by `is_admin()`                  |

**Device mode cannot protect anything.** Production runs without Supabase
(blocker B1), so everything a browser holds can be edited by that browser:
PRO, coins, and every PRO text and model in the bundle. That is by design
until the owner turns cloud mode on; it is not something code can fix.

**In cloud mode the browser never decides money or entitlements.** It asks;
the database decides (row-level security plus `security definer` RPCs, every
one with `search_path = ''`). Content the server delivers (voice clips, TTS,
the tutor) is checked on the server. Content compiled into the app (PRO
stories, PRO 3D worlds, PRO lessons) is only gated in the client: a modified
browser can show it. Serving that content from the server is future work.

## What the server enforces (cloud mode)

- **Payments, subscriptions**: clients read their own rows only; no client
  insert/update/delete. PRO gifts and admin grants: service role / admins.
- **Coins** (0005, 0009): one append-only ledger, written only by
  `record_reward` — idempotent per `(child, reason, ref)`, sign fixed by the
  reason, play rewards capped at 500 a day, spending never below zero, an
  outfit or a pet at exactly its price from `shop_items` and only once. The
  stored balance is recomputed from the ledger on every write; paid outfits
  and pets stay only with a purchase in the ledger (or owned before 0009). A
  family that signs up later brings each child's device balance and items
  once (`record_opening_balance`: no ledger rows yet, ≤ 5000 coins, shop items
  only), sent by the first sync before the child's state.
- **Resources and the city** (0006, 0010): `record_resource` — idempotent,
  daily caps per earned day; what a device earned before the account existed
  has one lifetime budget, later entries may arrive up to 30 days late; a quest
  crystal for its own day or the day before (yesterday's quest claimed today). `record_building_level` — only real
  buildings, the full price of the level spent under its ref, stars earned.
  The connected world (0011): a find, a planted seed and a journey reward only
  as listed in `world_rules`, with their exact amount, once, and only after
  the step before is in the child's ledger.
- **Children** (0010): a deleted child id never comes back (its ledgers would
  restart with fresh caps); at most five new profiles a day per family,
  counted by the server's own `registered_at`. Deleting a whole account still
  cascades everything (no tombstone is kept for a family that is gone).
- **Promo codes and ads** (0004, 0005, 0010): server-side validation, five
  failed attempts then a pause, one claim per account, a confirmed e-mail for
  a claim, new ads at least 15 s long, 10 ad starts an hour / 30 a day.
- **Audio, TTS, tutor** (0007, 0008, 0010): JWT checked by `getUser`, PRO and
  consent checked on the server, per-account short-window and daily limits, a
  global daily ceiling that counts only real speech synthesis.
- **Child data**: every child-owned table cascades on delete; the device
  clears its own copies (rewards, universe, memory, learn, studio, activity,
  screen time, AI consent).

Tested by `supabase/tests/rls_test.sql` (cross-family read/write, anonymous,
forged child ids, duplicate rewards, fake payments, promo brute force, the
private voice bucket, every Phase 13 fix) on a local PostgreSQL:
`PGHOST=… PGUSER=postgres sh supabase/tests/run.sh`.

## Browser

- Security headers for every response in `vercel.json` (CSP with
  `script-src 'self'`, no framing, `nosniff`, a short referrer, no camera /
  microphone / location); checked against the running app (27 routes, no
  violation) and kept by `src/app/securityHeaders.test.ts`. The stored
  language's chunk is preloaded by `/lang-preload.js`, a file, so no inline
  script is needed.
- Production builds have no device admin (`adminSession.ts`): a PIN compiled
  into an app is readable by anyone. The browser tests build with `--mode e2e`.
- The child's name never reaches a cloud voice: the server TTS gets name-free
  sentences only, and a device voice that is not local gets the name-free
  version or stays silent (`speech.ts`).
- The cloud PRO cache lapses after 7 days without a server answer, and at once
  when its stored times come from the future or the clock was set back (a
  device whose clock was ahead and then corrected also waits for the next
  server answer: one successful read restores PRO).

## Known limits and owner actions

- **B1/B3**: apply migrations 0005–0011, set Vercel `VITE_SUPABASE_*`, deploy
  the Edge Functions, upload the voice clips and set `VITE_VOICE_PRIVATE=true`.
  Until then the table above's left column is what production has.
- **No account deletion in the app**: removing a whole family needs a
  service-role function (delete the `auth.users` row; everything cascades).
  Payments may have to be kept for accounting: decide before building it.
- **Child-id probing**: the RPCs answer `no_child` and `not_your_child`
  differently; ids are random UUIDs, so this is not practical to exploit.
- **Promo codes in device mode** are only obscured in the bundle; they are the
  owner's public launch codes (decision in Phase 3).
- **Rotations**: no real secret was found in the repository or its history
  (Phase 13 scan); nothing needs rotating.
