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
Phase 3: 419 unit, 34 e2e, 62 SQL assertions
Phase 4+5a: 552 unit, 34 e2e, 119 SQL assertions
Phase 5: 606 unit, 58 e2e
Phase 6: 667 unit, 70 e2e
Phase 7: 743 unit, 70 e2e, 189 SQL assertions (`supabase/tests/run.sh`, local Postgres).
Phase 8: 790 unit, 80 e2e.

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

## Domain + security (Phase 3)

- `src/domain/ledger` generic idempotent append-only ledger; `domain/rewards`
  (`grantReward`, `spendCoins`, `subscribeRewards`, `kiddo.rewards`) = the ONLY way coins
  change (tasks, daily bonus, learn sessions, pro gift, penalty, admin, shop);
  `domain/progress` (`useMastery`, `childActivityForDay`); `domain/entitlements`
  (`canUse/useCanUse/useEntitlement/useProTier`; `useIsPro` deprecated);
  `domain/quests/types`. Child removal clears ledger + learn data.
- Migration `0005_security.sql` (NOT applied to prod – blocker): payments select-only,
  `presence_heartbeats` (no names) replaces public Realtime presence, append-only
  `reward_ledger` via `record_reward` RPC (sign/bounds/daily cap, pro-gift service-role
  only), `child_learn`, promo needs an ad claim + rate limit, anon revoked.
  KIDDO07/BOLAJON30 stay active (owner's launch codes).
- Cloud mode: server subscription authoritative (downgrade, 7-day offline grace, cleared
  on sign-out); sync queues ledger entries and learn data; dead-letter + auth pause.
- Production builds: no Demo PRO (ignored even if persisted), no mock payment
  (`services/payments/availability.ts`; e2e may set `VITE_PAYMENTS_MOCK`), device admin
  only with `VITE_ADMIN_PIN` (inlined, not a secret).
- Known gap: `child_state.coins` is still client-written; the cap is not a security
  boundary until coins derive from the ledger (rollout step 5).

## Universe (Phase 4 + 5a)

- `src/domain/universe` (store `kiddo.universe`): `grantResource`/`spendResources`,
  `emitActivity(e) → AwardSummary` (rules.ts pure: stars by quality, crystal for 3 stars,
  part for number 3-star, scroll for tales; Studio always 1 star, no crystals),
  `tryClaimDailyQuest` (yesterday's finished quest claimable until today's is claimed),
  `BUILDINGS`/`upgradeBuilding` (cost in resources), achievements, `useAdventure`,
  cross-tab rehydrate (`reloadFromOtherTabs`). New features MUST emit through it.
- UI: `/city` (KiddoCity, UpgradeSheet, DailyQuestCard), `/adventure`, `/collection`,
  `/trace` (numbers/shapes tracing), `/studio` + `/studio/gallery` (IndexedDB),
  `components/reward/ActivityReward`, `TitleTopBar`.
- `0006_universe.sql` (NOT applied): `resource_ledger` + `record_resource` (caps per
  earned day, device history uploaded oldest-first on first sign-in, ≤1 year back),
  `record_building_level` checks payment; world/achievements read-only.
- Known: device ledger keeps 1000 entries (older history can't be uploaded in full);
  `familyStore.removeChild` gallery delete errors are not retried.

## Adaptive (Phase 5)

- `src/domain/learner`: strand level 1–5 in universe child `strands`; start by age
  (4→1, 5→2, 6→3, guest→2, re-seeded until 2 runs); moves after 2 strong/weak runs.
  Only `emitActivity` events with `level` == current level move it (Math Lab, Feelings).
  `useChallengeLevel(strand)`. Device-only until Phase 14.
- `/math-lab` (Math Land building): levels 1–5, basket tap/drag, emits `mistake.made`
  events (not stored yet → Mistake Garden must store). `/feelings` (Friendship House):
  faces, scenes, kindness choices with pictures, calm corner (no reward).
- i18next TS2589 limit close: don't use `ReturnType<typeof useTranslation>['t']`.

## Worlds (Phase 6)

- `src/components/explorer3d`: `Explorer3D({ model: ExplorerModelDef, label, onHotspot })`;
  still picture first, R3F view lazy, builders lazy (`load()`), demand frameloop, idle
  spin stops after 1 turn/6 s, WebGL fail → still + hotspot buttons. Low-end devices
  get quality 'low' and no auto-open (`canCreateWebGL`, `isLowEndDevice`).
- `/worlds/dino` (dino-park): 6 procedural models (T. rex, Triceratops free), dig + quiz
  (strand science). `/worlds/uzbekistan` (uzbekistan-gate): 6 landmarks (Registon,
  tandir free), map, dasturxon (language), patterns (logic, PRO).
- PRO: `premiumWorlds` gates 3D explore + facts (also direct URLs). Decision: quiz/dig
  may name and picture all six animals (no PRO model/fact reachable; test guards it).
- Stills: `scripts/render-dinos.mjs`, `scripts/render-uzbekistan.mjs` → public/3d/worlds.

## Audio security (Phase 7) – docs/architecture/audio-security.md

- Modes: `public` (default, device mode: /audio/voice in the build) and `private`
  (cloud mode + `VITE_VOICE_PRIVATE=true`: clips leave dist; signed URLs from Edge
  Function `voice-url`, memory-only). `canUse('audio')` still first; server `not_pro` → locked.
- `0007_audio.sql` (NOT applied): private bucket `voice`, `is_pro_active` (service role),
  rate limits (auth/voice/tts + daily cap), `tts_cache` with 30-day cleanup script.
- Remote TTS only generic sentences (child name never sent); uz only with a real uz-* voice
  else 503; no device voice → `missing`, never `done`. Scripts: voices/upload-private.mjs,
  cleanup-tts.mjs. Deno installed via npm for `deno check`.

## Story Engine (Phase 8)

- `src/features/stories`: `/stories` (library, link to the classic `/learn/tales`) and
  `/stories/:storyId` (reader). Pure engine `engine.ts` (`StorySpec`/pages/choices/endings,
  reader state, `pickQuestions(level)`: L1–2 who/what, L3 + sequence, L4–5 why/feelings/predict,
  `validateStory`: links, loops, dead/unreachable pages, every path ends, questions only about
  pages on every path, texts in uz/ru/en, Uzbek ‘ ’ apostrophes, scripts, reading time 2–5 min).
- 6 original stories (`content.ts`, text per language in `text.uz|ru|en.ts`): lost-lamb and
  grandma-garden free; navruz-sumalak, bazaar-kindness, star-night, mahalla-hashar PRO
  (`premiumStories`, direct URLs show a locked note without text). Pictures: public/3d assets
  drawn flat (`StoryPicture`, tales' backdrops + mountains/mahalla/bazaar/evening/steppe);
  feeling answers reuse `FeelingFace`.
- "Read to me" (PRO, `useNarration`): `speakLines` (clipsOnly), stops on page change/leave,
  missing clip → honest note; optional auto page turn only after narration played. Story
  sentences are in `LEARN_SPOKEN` and recorded (Piper, as the other sections).
- Universe: `emitActivity('story:<id>', strand language, level)`; rules `isStory`/`paysScroll`:
  first finish pays 1 scroll (reason 'tale', ref `story:<id>`; 0006 unchanged). Kiddo City
  story-library → `/stories`; Adventure forest has `stories` (matches `story:*`).
  Stories send `oncePerDay`: only the day's first reading of a story counts for achievements
  (`stats`) and moves the language level (`UniverseChild.countedToday`);
  `pickQuestions(level, reading)` rotates the literal questions and the level-1 wrong
  answer per reading.
- **Owner decision H1 (2026-10-23): Uzbek voice.** The Uzbek clips stay as recorded (Piper
  kk_KZ ISSAI model reading transliterated Uzbek, `scripts/voices/uzbek.py`), but are
  disclosed openly as a temporary synthetic voice, not a native Uzbek voice: next to "Read to
  me" when the language is Uzbek (`stories.syntheticVoice` in `ui.ts`), on the PRO screen
  (`pro.uzVoiceNote`), in parent settings (`parent.settings.voiceNote`); no "real voice" claim
  for Uzbek (`pro.celebrateText`). Replaced by a real Uzbek voice with B4
  (`docs/architecture/audio-security.md` → "Recorded clips").

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

**Supabase not verified / not configured in production.** Evidence (2026-10-22): the deployed
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
- [x] 3 Domain foundation + Supabase security migration 0005 (2026-10-23)
- [x] 4 Kiddo City, Adventure Map, Daily Quest, resources, achievements (2026-10-23)
- [x] 5 Tracing, Creative Studio, Smart Math (/math-lab), adaptive LearnerProfile, Emotions & Social (/feelings) (2026-10-23)
- [x] 6 Explorer3D, Dinosaur world (/worlds/dino), My Uzbekistan (/worlds/uzbekistan) (2026-10-23)
- [x] 7 Pro + audio security: private voice bucket, voice-url/tts Edge Functions, server PRO check (2026-10-23)
- [x] 8 Story Engine: /stories, 6 branching stories, PRO narration, scroll per story (2026-10-23)
- [ ] 9 Parent Dashboard · 10 AI Friend · 11 responsive · 12 performance · 13 security
- [ ] 14–24 Universe architecture, living world, Mistake Garden, What If?, Detective, Magic Camera, connected journey, adaptation tests, final reviews

Done before Phase 0: 6 learning sections (words, help, tales, space, math, garden),
speaker-button fix (reads current question, uz/ru/en, no overlap, Pro-gated).

## Next

Phase 9 – Parent Dashboard. Owner actions: apply 0005–0007, deploy
voice-url/tts + secrets, upload voice, then `VITE_VOICE_PRIVATE=true`; Realtime
private-only; Vercel `VITE_SUPABASE_*` (supabase-verification.md §6–7); B4 TTS
provider; B5 consent + data location.
