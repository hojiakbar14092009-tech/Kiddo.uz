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

## Baseline (Phase 0, commit e93937e)

340 unit tests, 34 e2e pass; build OK; initial JS ≈ 237 KB gzip; R3F chunk 234 KB
gzip (lazy); 0 npm audit findings.

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
paths without ledger, two progress models, learnStore not synced, no route errorElement.
UI: home greeting bubble covers the daily plan, shop robot covers its button, landscape
games below the fold, parent header on phones.

## Blockers (owner)

B1 Supabase on Vercel prod? migrations applied? · B2 payment provider credentials ·
B3 service-role/Edge secrets · B4 TTS provider (real Uzbek voice) · B5 AI provider +
consent/data location · B6 product decisions (free voice set, offline grace, demo mode in
prod) · B7 promo policy.

## Phases

- [x] 0 Discovery & architecture (2026-10-22)
- [ ] 1 Foundation: errorElement/boundaries, responsive fixes from the audit, tokens
- [ ] 2 Design system primitives (Dialog, BottomSheet, Toast, ProgressBar, EmptyState, ProLock, RewardBurst)
- [ ] 3 Domain foundation (rewards ledger, progress facade, entitlements) + Supabase steps 1–2
- [ ] 4 Kiddo City, Adventure Map, Daily Quest, rewards UI
- [ ] 5 Smart Math, Tracing, Adaptive, Emotions, Creative Studio
- [ ] 6 Worlds: Explorer3D, Dinosaur, Uzbekistan
- [ ] 7 Pro + audio server-side (claims, private voice bucket), Music & Rhythm
- [ ] 8 Story Engine · 9 Parent Dashboard · 10 AI Friend · 11 responsive · 12 performance · 13 security

Done before Phase 0: 6 learning sections (words, help, tales, space, math, garden),
speaker-button fix (reads current question, uz/ru/en, no overlap, Pro-gated).

## Next

Phase 1 – start with: route `errorElement` + app error boundary; home bubble overlap
(`RoamingMascot`); shop robot over button; landscape layout of `TaskShell`/`LearnShell`;
parent header on phones; title behaviour of `TaskShell`.
