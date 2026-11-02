# Accounts, two-way sync, photos and deleting an account (Phase 44)

## Signing in

- `/parent/login`: **Google** (`signInWithOAuth`), an **e-mail sign-in link** (`signInWithOtp`, no
  password) or e-mail and password; or demo mode on this device.
- Google and the link come back to **`/parent/auth`** (`AuthReturnPage`) with a one-time `code`
  (supabase-js `flowType: 'pkce'`, `detectSessionInUrl: false`): it is exchanged once, removed from
  the address, and the parent goes on to the dashboard. The code works only in the browser that
  asked for it (`other-browser`) and only for a short while (`link-expired`).
- **Consent**: anything that may create an account (sign-up, Google, the link) needs the parent's
  consent first (checkbox + "What is kept?"). It is remembered on the device for a week
  (localStorage, so the link opened in a new tab or the trip to Google keep it) and a sign-up or
  a link also carries it in the account's metadata. On every cloud sign-in `ConsentGate` checks
  the account's `account_consents` row (version `CONSENT_VERSION`, server time): a consent given
  before is saved now; without one the parent is asked before the parent area opens. A new
  version asks again. When the cloud cannot be read the area opens (asked next time).
- Back from Google the page has reloaded, so the parent gate (in memory) asks its question again;
  the `?code` waits in the address until then (a cancelled gate means signing in again).
- Cancelling at Google shows "cancelled", not "link expired".
- Telegram login: later, through a server function (needs the bot).

## Guest → account

A family's profiles and progress already live on the device; at the first sign-in to an account
they go up once as its snapshot (`trackCloud`: profiles, an opening balance per child, results,
learning data, the universe ledger; the server caps and checks them). A guest without a profile
starts fresh every time the app opens (by design: nothing is kept for an unnamed child).

## Two-way sync (`services/sync/restore.ts`)

On every sign-in (once per app session, after the queue has been sent once, so removals made here
reach the cloud first) the account's children this device lacks come down (a device that has
them all reads one small list and stops):
profile, coins, learned letters, struggles, stickers, clothes, pets, screen time, the latest 300
results, the learning data, and the reward ledger's run ids (`rememberRewards`; each child read on
its own, 1000 rows per request, the newest 2000 plus every one-time reward — achievements,
birthdays, the nut conversion, quests, PRO gifts — however old): a run played and paid on another
device is never paid again here. A child already on the device keeps its own (newer) data; a child
removed here whose removal is queued or was given up on stays removed (taken before reading); a
parent who signs out while reading gets nothing of that account. The restored rows are sent back
once as ordinary upserts (the same values; no coins are paid twice: the server's ledger is keyed
by run id). Not brought back yet: the universe (stars, crystals, buildings), achievements state,
birthday-gift years and learning-memory evidence (their one-time rewards are remembered, so they
cannot pay again); a profile stored before birth dates existed gets 1 January of its age's year.

## Children's photos (`services/sync/photos.ts`, migration 0018)

Off by default, per account (`cloudPhotosFor`: another parent signing in on the device has not
turned it on). Then the small 256 × 256 JPEG goes to the private bucket `child-photos` at
`<parent id>/<child id>.jpg`. Adding or replacing needs a child row of that parent; reading and
removing need only the parent's own folder, so a removed child's photo can still be removed (SQL
tests). A new child's photo is tried again (3 s, 15 s, 60 s) until its profile is in the cloud,
and every photo is sent again at each sign-in; a removal that fails, or one made while signed out,
is remembered (`photoRemovals`) and done at the next sign-in. Turning it off lists and empties the
whole folder (the setting stays on if that fails); a photo not sent yet is said, not hidden.

## Deleting the account

Parent area → Settings → Account: type `DELETE`. The `delete-account` Edge Function (JWT, body
`{"confirm":"DELETE"}`) removes the photos first, then the auth user; every family row cascades
(checked for every table in 0018's header and the SQL tests). If the photos cannot be removed the
account is not deleted (502). Optionally the device forgets the family too; the sync queue and the
session are cleared either way.

## Owner steps

Apply `0018_accounts.sql`; deploy `delete-account`; in Supabase Auth enable Google (Google Cloud
OAuth client) and e-mail links, and add `<site>/parent/auth` to the redirect URLs; test deleting one
test account on the real project.

## Known limits (backlog)

- Cloud photos are switched on per device and account; turning them off on one device empties the
  cloud folder, but another device where they are still on sends its photos again at its next start.
  Keeping the switch on the account (a column) would fix it.
- A child removed on a device where cloud photos are off: its photo is removed only when photos are
  turned off elsewhere or the account is deleted.
- The consent given before signing in belongs to the device for a week (a shared device).
- Every photo is sent again at each start while cloud photos are on (fine for up to 3 small photos).
- Not restored yet: the universe, achievements state, birthday-gift years, learning evidence.
