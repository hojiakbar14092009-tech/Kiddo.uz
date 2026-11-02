# Admin preview of the child app (Phase 51)

The admin panel's **"Ilovani ochish"** button (header of `/admin`, only inside a signed-in admin
session) opens the child app in a new tab, in a sandbox: a throwaway child **"Mehmon"** (6 years,
Uzbek, onboarded, tours off) and an Uzbek bar on top, "Admin ko‘rish rejimi / Bu sinov profili.
Hech narsa saqlanmaydi." with **Chiqish** (closes the tab; where the browser refuses, a full load
of `/admin` without the sandbox).

## Mechanism

1. The button: `window.open('/home?kiddoPreview=1', '_blank', 'noopener')`. With `noopener` the
   new tab gets neither `window.opener` nor a copy of the panel's sessionStorage (so not the admin
   session either).
2. `src/app/preview/adminPreview.ts` is the first import of `main.tsx` and installs itself on
   evaluation: when the URL has the flag (or this tab's sessionStorage has `kiddo.adminPreview`), it
   replaces `window.localStorage` (`Object.defineProperty`) with an in-memory `MemoryStorage`
   seeded with the sandbox child, remembers the flag in sessionStorage (per tab: reloads and
   in-app navigation stay in the sandbox, other tabs never are) and drops the flag from the address.
   A reload starts the sandbox fresh; closing the tab forgets everything.
3. Order matters: the stores hydrate on import and zustand `persist` keeps the Storage object it
   saw then. The install must therefore live in its own module, not in `main.tsx` or a file inlined
   into the entry chunk (the bundler runs the entry chunk's own code after every chunk it imports).
   **Fail closed:** if the Storage cannot be replaced the module throws; `main.tsx` refuses to
   render in a sandbox tab whose family store does not hold the sandbox child.
4. `isAdminPreview()` is the one switch for the server: `getSupabase()` returns `null` (every
   `supabase.from/rpc`: sync, restore, consent, `record_reward`, presence, promo, app settings),
   `SyncManager` never loads sync, analytics are never sent (`supabaseAnalyticsSender`,
   `sendOnLeave`), `callEdgeFunction` (private voices, tutor) returns `null`, the AI tutor is
   `no-server`. Rewards stay local and idempotent as everywhere.
5. Other device channels: the Studio gallery uses its in-memory backend (not IndexedDB), and
   `postAdminMessage` is silent (the admin panel does not see "Mehmon" playing or a sandbox payment).
   `storage` events from real tabs are ignored by the existing `storageArea` checks.

The query flag needs no protection: anyone who types it gets an empty sandbox, nothing of the
family, nothing saved, nothing sent.

## Layout

The bar is in the page flow above the app (it pushes the app down rather than covering its back
button or top bar; on a long page it scrolls away with the page). Chiqish is at least 44 × 44 px;
nothing animates. It is lazy-loaded (`PreviewBanner.tsx`), so the normal first screen only carries
the tiny `adminPreview.ts`.

## Tests

`src/app/preview/adminPreview.test.ts` (storage, flag, seed, real storage untouched, exit),
`src/app/preview/previewGating.test.tsx` (with a mocked cloud backend: no client, no sync, no
analytics, no Edge Function, no tutor, no admin broadcast), `e2e/phase51.spec.ts` (admin → popup →
sandbox child, nuts earned, the family's localStorage byte-for-byte unchanged, no server request).

Known limits: `lang-preload.js` (a classic script in `<head>`) still reads the real stored
language to preload a chunk (read only); ad videos are still read from the device's IndexedDB
(admin content, not child data).
