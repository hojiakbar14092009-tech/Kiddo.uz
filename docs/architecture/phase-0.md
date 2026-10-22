# Kiddo – Phase 0: discovery and architecture

Date: 2026-10-22 · Baseline commit: `e93937e` · Scope: read-only audit, no app code changed.

This document records what Kiddo is today, what is risky, and how the planned
"Kiddo Universe" work (Master Prompt phases 1–13) builds on it. The short,
always-current summary lives in `.claude/kiddo-project-state.md`.

## 1. Baseline

| Check                            | Result                                                            |
| -------------------------------- | ----------------------------------------------------------------- |
| `npm ls`                         | OK (one extraneous dev package: `vite-plugin-singlefile`, unused) |
| `npm audit --omit=dev`           | 0 vulnerabilities                                                 |
| format / lint / typecheck        | pass                                                              |
| unit tests (vitest)              | 47 files, 340 tests pass                                          |
| e2e (Playwright, phone + tablet) | 34 pass                                                           |
| production build                 | pass                                                              |
| initial JS (gzip)                | ≈ 237 KB (entry 112 KB + framer-motion 74 KB + shared chunks)     |
| largest lazy chunk               | R3F/three 234 KB gzip, only on 3D screens                         |
| static media                     | voice clips 106 MB (7 181 mp3), 3D pictures 1.6 MB                |

No baseline failures. Every later phase compares against these numbers.

## 2. What exists today

Stack: React 19, react-router 7 (lazy routes), Vite 8, TypeScript 6 (strict,
`noUncheckedIndexedAccess`), Tailwind 4 (`@theme` tokens in CSS), Zustand 5
with `persist`, i18next (uz default, ru, en), framer-motion, three + R3F +
drei (lazy), Howler, supabase-js (dynamically imported), vite-plugin-pwa,
Vitest + Testing Library, Playwright, oxlint, Prettier. Deployed on Vercel.

Building blocks the master plan can grow from (not rebuild):

| Planned feature   | Existing base                                                                           |
| ----------------- | --------------------------------------------------------------------------------------- |
| Kiddo City        | `features/home/HomePage.tsx`, `features/learn/LearnHome.tsx`, `learn/sections.ts`       |
| Adventure Map     | `features/home/JourneyPath.tsx`                                                         |
| Daily Quest       | `features/home/dailyPlan.ts`, homework in `familyStore`                                 |
| Rewards           | coins (`progressStore`), stickers, outfits, pets, shop, `RewardPage`, `LearnResult`     |
| Smart Math        | `features/math` (generators, plan, stages, review)                                      |
| Tracing           | `features/tasks/TraceCanvas.tsx`, `traceScoring.ts` (letters only)                      |
| Adaptive learning | `features/learn/review.ts`, `learnStore` skills/weak/strong, `reviewSection.ts`         |
| Story Engine      | `features/tales` (9 tales, 3D scene, reader, check)                                     |
| 3D Explorer/Space | `features/space` (R3F planets, lessons, checks, scoped theme)                           |
| Mascot system     | `features/mascot` (events → moods, bubble, 2D/3D robot, roaming)                        |
| Parent Dashboard  | `features/parent` (gate, login, report, homework, Pro, settings, learn results)         |
| Pro / audio       | `subscriptionStore` (`canUse('audio')`), `audioManager`, SpeakButton, promo, ads, admin |

## 3. Findings

### Security and data (Supabase audit)

Critical

1. Pro is decided only in the browser: editing `localStorage['kiddo.subscription']`,
   the "Demo PRO" switch shipped in the parent area (`ProSection.tsx`), or the mock
   payment all give lifetime Pro. The server `subscriptions` row never downgrades
   a device (`SyncManager.tsx`).
2. The "PRO-only" voice clips are public static files (`public/audio/voice`,
   106 MB), addressable through the bundled `voiceManifest.json`.

High 3. Parents can insert/update/delete their own `payments` rows
(`0003_admin.sql` policy `for all`), so revenue in the admin panel can be forged. 4. The Realtime presence channel `kiddo-online` (`app/PresenceBeacon.tsx`) is public:
anyone with the anon key can see every family's online child names and screens. 5. Device-mode admin PIN defaults to `2026` and is published in the README. 6. Promo codes are published (README, migration seed) and `redeem_promo` has no rate limit.

Medium: coins/rewards are client-authoritative and the device overwrites admin
edits; admin and parent share one Supabase session on a device; the parent
session flag is not tied to the real Supabase auth state; the sync queue drops
an operation silently after 8 failures; full birth dates are stored server-side;
jsonb fields have no size limits.

Good: RLS on all 13 tables; promo/ads RPCs use `security definer` with
`search_path` and `auth.uid()` checks; no `dangerouslySetInnerHTML`; no secrets in
the repo; TTS key read only from the environment by a script.

Unknown (blocker B1): whether production on Vercel is built with
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` and whether migrations 0001–0004 are applied.

### Architecture

1. Two reward paths and no ledger: legacy games pay through
   `progressStore.completeTask`, new sections through `learnStore.finishSession` →
   `grantCoins`, plus Pro gifts, parent penalties and admin – nothing records why
   coins changed; only the new sections guard against paying twice.
2. Two progress models: `progressStore` (results, learned, struggles) and
   `learnStore` (attempts, skills, sessions). The daily plan reads only the first.
3. `learnStore` is not synced and not cleaned when a child is removed.
4. No route `errorElement` and no app-level error boundary; a stale lazy chunk
   after a deploy or a crash in the planet/picture 3D viewers shows the router's
   default error page.
5. Design system: colour and font tokens only (no radius/shadow/motion tokens,
   ~140 hex literals in TSX); ten hand-made dialogs; no shared Dialog,
   BottomSheet, Toast, ProgressBar, EmptyState or ProLock; `Img3D` lives in a feature.
6. Seven components read `useIsPro()` directly instead of `canUse()`.
7. Coupling: `features/learn` is a de-facto shared engine; stores import feature
   modules; `dayKey` exists three times; two identical `useStable.ts`.
8. Large files to split before extending: `AdminSections.tsx` (861),
   `MathPage.tsx` (491), `GardenPage.tsx` (450), `AdminPage.tsx` (431).

### UI / responsive

See §7.

## 4. Target architecture (incremental, no rewrite)

```text
src/
  domain/                 pure logic + one store each, wrapping today's stores
    rewards/              ledger, grantReward(), catalogs (stickers, outfits, pets, coin rules)
    progress/             mastery facade over progressStore + learnStore, attempts
    entitlements/         features, canUse/useEntitlement (Pro + age + server claims)
    quests/               daily quest built from DAILY_PLANS, review and homework
    universe/             worlds, achievements, story progress (later phases)
  services/
    supabase/             client, auth, config (existing)
    sync/                 queue (existing) + intent ops + snapshot pull
    entitlements/         server claims fetch/refresh (Edge Function)
    voice/                signed voice URLs + offline packs (Edge Function)
    ai/                   AI friend client (Edge Function only)
  components/ui/          + Dialog, BottomSheet, Toast, ProgressBar, StepDots,
                          EmptyState, ProLock, RewardBurst, Img3D (moved)
  features/
    city/                 Kiddo City hub (evolves home)
    adventure/            Adventure Map (evolves JourneyPath)
    worlds/{dino,uzbekistan}/  copy the features/space shape; shared Explorer3D
    …existing features stay where they are
```

Rules:

- New domains wrap existing stores first (balances stay in `progressStore` until
  the ledger is server-backed), callers migrate one by one, old paths re-export.
- Every reward goes through `domain/rewards.grantReward({childKey, reason, refId})`
  with an idempotency key; nothing else changes coins.
- Every paid capability goes through `domain/entitlements.canUse(feature)`;
  components never read the plan.
- 3D stays lazy and wrapped in an error boundary with a static fallback.

## 5. Supabase target: server is the source of truth

Principle: the device is an offline cache with optimistic UI; Supabase owns
entitlements, payments and the reward ledger; the family owns profile and
cosmetic data. Demo/device mode keeps working unchanged when Supabase is not
configured.

Schema (migration 0005+):

- Extend: `subscriptions` (status, provider ids, period end – server-written only),
  `payments` (select-only for parents, provider txn id unique), `children`
  (uuid ids, birth year-month instead of full date), `child_state` (becomes a
  projection; coins derived from the ledger).
- Add: `families`, `family_members`; `entitlements` (+ view `active_entitlements`);
  `payment_events` (webhook inbox); `reward_ledger` (append-only, idempotency key);
  `inventory`; `catalog_items` (server prices); `attempts` and `mastery`;
  `quests`, `daily_quests`, `achievements`, `child_achievements`; `worlds`,
  `world_progress`, `story_progress`; `tts_requests`, `ai_requests`, `admin_audit`.
- RLS: `owns_child(child_id)` / `is_family_member(family_id)` helpers
  (`security definer`, `search_path = ''`). Parents read their family's rows and
  write only profile/cosmetic fields; everything that changes value goes through
  RPCs: `submit_attempt`, `buy_item`, `complete_quest`, `claim_daily_bonus`,
  `redeem_promo` (rate-limited), `admin_grant` (audited). Daily caps on coins and
  attempts. `anon` keeps read access only to `app_settings`, active ads, catalog.
- Edge Functions (keys only in Supabase secrets): `payment-webhook-{click,payme,uzum}`,
  `checkout-create`, `entitlements` (signed claims with expiry), `voice-url`
  (signed URLs for a private `voice-pro` bucket), `tts` (live TTS with quota and
  cache), `ai-friend` (entitlement, quota, moderation, PII scrub, audit).
- Pro audio: a small free sample set stays public; Pro clips move to a private
  bucket; the PWA caches them under stable keys with an offline grace period and
  clears them when the entitlement ends. Honest limit: a paying user can still
  copy files; the goal is to stop free/anonymous access.
- Client entitlement layer: `canUse(feature)` = active child and a server claim
  for that feature that is not expired (with an offline grace window) in cloud
  mode; the current local logic only in device/demo mode. Refresh on start,
  sign-in, resume, after payment/promo, every 6 h.
- Sync: intent operations (attempt, purchase, quest, promo) go to RPCs with
  idempotency keys and the server response replaces local values; state
  operations (profile, homework, cosmetics, settings) stay field-level
  last-write-wins; a snapshot pull restores a family on a new device; rejected
  operations go to a visible "sync issues" list instead of being dropped.

Rollout (each step shippable on its own):

1. Hotfix migration 0005: payments select-only, stop client payment upserts in
   cloud mode, deactivate the published promo codes in cloud, rate-limit
   `redeem_promo`, make presence private (or off).
2. Client: server subscription is authoritative in cloud mode; hide Demo PRO and the
   device admin PIN in cloud production builds; tie the parent session to
   `supabase.auth.onAuthStateChange`.
3. `families` + `entitlements` + `entitlements` Edge Function + client layer.
4. Private `voice-pro` bucket + `voice-url` + service-worker change (flag
   `VITE_VOICE_SOURCE=public|signed`).
5. Reward ledger + `submit_attempt` / `buy_item` RPCs, opening balances backfilled.
6. Snapshot pull + dead-letter list; sync `learnStore`.
7. Payment provider webhooks; mock payment removed from production.
8. Universe tables (worlds, quests, achievements, story, mastery) on the RPC model.
9. AI friend and live TTS functions with quotas and moderation.

Steps 1–2 need no new credentials beyond a configured Supabase project. Steps
3–9 need the owner's decisions and secrets (§8).

## 6. Phase plan (Master Prompt order, adjusted)

| Phase | Content                                                                                                                                                                                                                                                                                                                                     | Notes                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 0     | Discovery, architecture, baseline                                                                                                                                                                                                                                                                                                           | this document                                                        |
| 1     | Foundation: error boundaries/`errorElement`, responsive fixes from §7, safe areas, loading/error primitives, tokens (radius/shadow/motion)                                                                                                                                                                                                  | no new features                                                      |
| 2     | Design system: Dialog, BottomSheet, Toast, ProgressBar/StepDots, EmptyState, ProLock, RewardBurst, Img3D moved; migrate the ten hand-made dialogs                                                                                                                                                                                           |                                                                      |
| 3     | Domain foundation: `domain/rewards` (ledger + grantReward, all five coin paths migrated), `domain/progress` (mastery facade, learnStore cleanup + sync), `domain/entitlements` (features, useEntitlement, replace 7 `useIsPro` reads), `domain/quests` types; **Supabase rollout steps 1–2** (hotfix migration, authoritative subscription) | security moved earlier than Phase 7 because of the critical findings |
| 4     | Kiddo City + Adventure Map + Daily Quest + reward presentation                                                                                                                                                                                                                                                                              |                                                                      |
| 5     | Smart Math (subtraction, missing numbers, drag at age 4), Tracing (numbers, shapes), Adaptive rules, Emotions, Creative Studio                                                                                                                                                                                                              |                                                                      |
| 6     | Premium worlds: shared Explorer3D, Dinosaur, Uzbekistan                                                                                                                                                                                                                                                                                     |                                                                      |
| 7     | Pro + audio: entitlements server claims, private voice bucket, upgrade UX, Music & Rhythm (Supabase steps 3–4)                                                                                                                                                                                                                              | needs B1–B4                                                          |
| 8     | Story Engine (data-driven tales, 2–5 min stories)                                                                                                                                                                                                                                                                                           |                                                                      |
| 9     | Parent Dashboard (mastery, ledger, settings, permissions)                                                                                                                                                                                                                                                                                   |                                                                      |
| 10    | AI Friend (Edge Function) or documented blocker                                                                                                                                                                                                                                                                                             | needs B5                                                             |
| 11–13 | Full responsive audit, performance pass, security/privacy review                                                                                                                                                                                                                                                                            |                                                                      |

Each phase ends with targeted tests, an independent critic review, an update to
`.claude/kiddo-project-state.md`, and a push only after the quality gates pass.

## 7. UI / responsive audit

Local production build (identical to the deployed commit), 28 app states × 11
viewports (320×568 … 1440×900, plus 844×390 landscape), 308 measurements.

What works: no horizontal overflow anywhere, no console or page errors, every
route loads, touch targets are generous almost everywhere, the 3D icon set and
the Koinot theme look polished.

| Severity | Where                                              | Issue                                                                                                                                                                                   | Likely source                                |
| -------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| High     | `/home`, all sizes                                 | the roaming mascot's greeting bubble covers the "Bugungi reja" stops (phones), the Matematika/Koinot cards (tablet) and the heading (landscape); the robot is cut off at the right edge | `features/mascot/RoamingMascot.tsx`          |
| High     | `/shop`                                            | the robot preview sits on top of its own "Robot o‘ynayapti — chaqirish" button; that button is 40 px tall                                                                               | `features/shop/ShopPage.tsx`                 |
| High     | landscape phone 844×390, `/tasks/*`, garden lesson | the mascot + instruction row takes ~60 % of the height, the game starts below the fold; the sticky header covers the garden's listen/help buttons                                       | `TaskShell.tsx`, `LearnShell.tsx`, garden    |
| Medium   | `/home` 320 px                                     | the child-switch avatar link shrinks to 18–38 px wide                                                                                                                                   | `HomePage.tsx` (`min-w-0`)                   |
| Medium   | `/tasks/*` 360–430 px                              | game titles truncated to "Ju…"; new learn pages show the title in the page instead – two behaviours                                                                                     | `TaskShell.tsx`                              |
| Medium   | ≤ 390 px                                           | inline thought bubbles wrap one word per line                                                                                                                                           | `MascotThoughtBubble.tsx`                    |
| Medium   | `/parent/*` phones                                 | wordmark floats above the icon, "Ota-ona bo‘limi" wraps to 3 lines, tabs show only emoji                                                                                                | `ParentShell.tsx`, `ParentDashboardPage.tsx` |
| Medium   | Koinot lesson 1440×900, landscape                  | the "Keyingisi" button is cut at the bottom                                                                                                                                             | `space/Lesson.tsx`, `space.css`              |
| Medium   | garden, tales                                      | the same instruction appears in the bubble and in the heading/card                                                                                                                      | `GardenPage.tsx`, `TaleView.tsx`             |
| Low      | tales list, parent Pro                             | "Ertaklar ro‘yxati" link 119×24, demo-PRO switch 64×36                                                                                                                                  |                                              |
| Low      | `/home` age 4, 320 px                              | cards text-dense                                                                                                                                                                        |                                              |

Visual consistency: older pages (alphabet, shop) use a large left-aligned title,
new learn and task pages a centred title with a mascot row – choose one; platform
emoji are used as icons (shop tabs, parent tabs, 💡, bubble emoji) next to the
custom 3D illustrations and outline icons – replace with one icon family.

## 8. Blockers and owner decisions

- B1. Supabase in production: are the `VITE_SUPABASE_*` variables set on Vercel,
  which project/region, are migrations 0001–0004 applied, who is admin?
- B2. Payment provider (Click / Payme / Uzum): merchant ids, secrets, webhook
  URLs, test mode, one-off vs recurring, refunds.
- B3. Supabase service-role key and Edge Function secrets (owner sets them; never
  `VITE_*`).
- B4. TTS provider and key (a real Uzbek voice), budget and quotas.
- B5. AI provider, moderation, data retention, parental consent text; data
  location for children's data.
- B6. Product: which voice stays free, offline grace period, whether demo mode and
  the device admin PIN stay in production, Pro per family or per child.
- B7. Promo policy: shared vs single-use codes, maximum uses.
