# Kiddo – project state

Read this first in a new session; open only the files the next task needs.
Full Phase 0 audit and target architecture: `docs/architecture/phase-0.md`.

## Stack

React 19 · react-router 7 (lazy routes, `src/app/routes.tsx`) · Vite 8 · TS 6 strict
(`noUncheckedIndexedAccess`) · Tailwind 4 (`@theme` tokens in `src/styles/index.css`)
· Zustand 5 `persist` (localStorage `kiddo.*`) · i18next uz/ru/en (`src/i18n/locales`,
uz is the source type) · framer-motion · three/R3F/drei (lazy) · Howler · supabase-js
(dynamic import) · vite-plugin-pwa · Vitest + Testing Library · Playwright · oxlint ·
Prettier. Vercel deploys `main` automatically (kiddo-uz.vercel.app).

## Commands

`npm run check` (format, lint, typecheck, unit tests, build) · `npm run test:e2e`
(phone + tablet; builds and serves on :4180) · voices:
`npx tsx --tsconfig tsconfig.app.json scripts/voices/collect.ts > scripts/voices/phrases.json && python3 scripts/voices/generate.py`
(Piper models in `/tmp/tts`). Commits end with the Co-Authored-By / Claude-Session lines.

## Map

- `src/features/*`: onboarding, profiles, age (levels 4–6, themes), home (dailyPlan,
  JourneyPath), alphabet, tasks (4 games incl. TraceCanvas, rules.ts coins), exam,
  learn (shared engine for the 6 new sections: learnStore, session, review,
  LearnShell, SpeakButton, speakable), firstWords, helpMascot, math, space, tales,
  garden, mascot, pets, shop, stickers, rest, parent, pro, promo, admin.
- Stores: `familyStore` (children, homework, active child), `progressStore` (per child:
  coins, learned, results, stickers, outfits, pets), `learn/learnStore` (per child:
  attempts, skills, sessions, stages, rewarded), `subscriptionStore` (`canUse`,
  `useCanUse`), `settingsStore`, `appSettingsStore`, `parentStore`, promo/ads/payments,
  `services/sync/syncQueue`.
- Audio: `services/audio/audioManager` (single voice, status, outcomes, `canUse('audio')`),
  `useSpeechStatus`, `learn/speakable` (`useSpeakable`, `LearnShell speak`), recorded
  clips only (`public/audio/voice`, manifest by phrase hash).
- Supabase: `supabase/migrations/0001–0004`, `services/supabase`, `services/sync`
  (push-only backup in cloud mode; cloud mode only if `VITE_SUPABASE_*` are set).

## Baseline

Phase 0 (e93937e): 340 unit, 34 e2e; initial JS ≈ 237 KB gzip; R3F 234 KB gzip (lazy).
Phase 1: 350 unit, 34 e2e; initial JS ≈ 240 KB gzip.
Phase 2: 368 unit, 34 e2e.

## UI foundation (Phase 1)

- Errors: root route `errorElement` → `app/errors/RouteErrorScreen`; `AppErrorBoundary`
  around the router; `vite:preloadError` + stale-chunk errors reload once
  (`app/errors/staleBuild.ts`, never loops, no reload if storage is blocked); 3D viewers
  wrapped in `ErrorBoundary` with a still fallback.
- Tokens (`styles/index.css @theme`): `rounded-tile|card|panel`, `shadow-press-sm|press|
press-lg|press-primary|press-coin`, `ease-pop|soft`, `animate-pop-in|fade-in`;
  `styles/motion.ts` for framer-motion. Use them in new/changed code; ~65 old literals remain.
- `short:` variant = `@media (max-height: 500px)` (phone held sideways); shared classes in
  `components/layout/shortScreen.ts`; TopBar is not sticky on short screens.
- Home greeting: reserved spot `data-roam="home-greet"`, placement in
  `mascot/greetPlacement.ts` (robot + bubble always inside the screen, never over content).
- `Mascot` has an `aside` slot; `SegmentedTabs showLabels="always"` = labelled scrolling pills.
- LearnShell scrolls to top only when the kind of screen changes (title + steps).

## Design system (Phase 2) – use these, don't hand-roll

`src/components/ui`: `Dialog` / `BottomSheet` (portal, focus trap + restore, Escape and
Tab only for the top dialog via `dialogStack.ts`, backdrop closes on a full outside tap
only if `dismissible`, scroll lock, placements `center|sheet|full`, `media` slot above
the title, `onKeyDown`, `role="alertdialog"` for questions); `toast()` + `Toaster`
(moves to the top while a dialog is open); `ProgressBar`, `StepDots`; `EmptyState`;
`ProBadge` + `useProLabel` (control label says "(PRO)", chip is aria-hidden);
`RewardBurst` (one short burst, reduced-motion aware); `Img3D`. Icons: one stroke family in
`components/icons` (Chart, Child, Clipboard, Gear, Shirt, Paw, Album, Bulb, Crown, …) –
no emoji as UI icons (emoji only as decoration in mascot bubbles). Colour tokens added:
`oops-shadow`, `night`. All 10 former hand-made dialogs use Dialog.

## Key decisions

- Incremental: new `src/domain/{rewards,progress,entitlements,quests}` wrap existing
  stores; no rewrite; old import paths re-export.
- One reward entry point (`grantReward` with idempotency) and one capability check
  (`canUse(feature)`); components never read the plan.
- Supabase is the source of truth for entitlements, payments and rewards in cloud mode;
  demo/device mode keeps working without Supabase env.
- Supabase hardening (rollout steps 1–2) moved into Phase 3 because of the critical findings.
- New worlds copy the `features/space` shape; 3D always lazy + error boundary + still fallback.

## Open risks (from Phase 0)

Critical: Pro is client-only (localStorage, Demo PRO switch in prod, mock payment);
voice clips are public. High: parents can write `payments`; public presence channel leaks
child names; device admin PIN 2026; published promo codes, no rate limit. Arch: two reward
paths without ledger, two progress models, learnStore not synced.
UI leftovers (low): Koinot lesson card scrolls on 844×390; 8-object garden board shows one
row above the fold on 844×390; tabs have no arrow-key navigation (was never there);
motion tokens not yet adopted; board height caps are per-component calc values.

## Blockers (owner)

**Phase 3 blocker – Supabase not verified.** Evidence (2026-10-22): the deployed
`assets/client-*.js` has `isSupabaseConfigured` compiled to `false` and no `*.supabase.co`
address → production is built without `VITE_SUPABASE_*` and runs device/demo mode only
(no reads/writes to Supabase). This environment has no Vercel env access (connector lacks
env tools), no Supabase credentials, and the sandbox cannot reach either API. The owner
must run `docs/architecture/supabase-verification.md` (vercel env ls, supabase migration
list, RLS queries, network check) before Phase 3 starts.

B1 Supabase on Vercel prod (see above) · B2 payment provider credentials ·
B3 service-role/Edge secrets · B4 TTS provider (real Uzbek voice) · B5 AI provider +
consent/data location · B6 product decisions (free voice set, offline grace, demo mode in
prod) · B7 promo policy.

## Phases

- [x] 0 Discovery & architecture (2026-10-22)
- [x] 1 Foundation: error screens, responsive fixes from the audit, tokens (2026-10-22)
- [x] 2 Design system primitives + migration of all dialogs, PRO chips, step dots, tab icons (2026-10-22)
- [ ] 3 Domain foundation (rewards ledger, progress facade, entitlements) + Supabase steps 1–2
- [ ] 4 Kiddo City, Adventure Map, Daily Quest, rewards UI
- [ ] 5 Smart Math, Tracing, Adaptive, Emotions, Creative Studio
- [ ] 6 Worlds: Explorer3D, Dinosaur, Uzbekistan
- [ ] 7 Pro + audio server-side (claims, private voice bucket), Music & Rhythm
- [ ] 8 Story Engine · 9 Parent Dashboard · 10 AI Friend · 11 responsive · 12 performance · 13 security

Done before Phase 0: 6 learning sections (words, help, tales, space, math, garden),
speaker-button fix (reads current question, uz/ru/en, no overlap, Pro-gated).

## Next

Phase 3 – domain foundation. Blocked part: Supabase rollout steps 1–2 need the owner's
verification (docs/architecture/supabase-verification.md). Unblocked part can start:
`src/domain/rewards` (ledger + `grantReward` with idempotency; migrate the 5 coin paths:
progressStore.completeTask, learnStore.finishSession, pro/purchase gift, CoinPenaltyPanel,
admin), `src/domain/progress` (mastery facade over progressStore + learnStore; clean
learnStore on child removal), `src/domain/entitlements` (features, `useEntitlement`,
replace the remaining direct `useIsPro()` reads), `src/domain/quests` types.
Leftovers from Phase 2 (low): `toast()`/`EmptyState` not yet used by screens; RewardPage
stars pop twice (burst + per-star); body scroll-lock restores the overflow saved at open.
