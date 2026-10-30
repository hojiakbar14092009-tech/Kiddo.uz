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
Phase 9: 862 unit, 84 e2e.
Phase 10: 931 unit, 86 e2e, 246 SQL assertions.
Phase 11: 941 unit, 112 e2e; page audit (9 viewports) 369 pages ru clean on the final build.
Phase 12: initial JS 296 → 266 KB gz; Home cold load 1417 → 899 KB transferred (strong device),
weak device scripts 301 → 271 KB, images 617 → 134 KB; budgets in `e2e/performance.spec.ts`.
Phase 13: 302 SQL assertions, 978 unit, 118 e2e (`supabase/tests/run.sh`; local PG: /var/tmp/kiddo-pg, see Security).
Phase 14: 321 SQL assertions, ~1018 unit, 120 e2e (journey.spec: the whole first journey on phone + tablet).
Phase 15: 323 SQL assertions, ~1030 unit, 122 e2e (adaptive.spec: a ten-year-old's profile, focus, Math Lab L5).
Phase 16: 326 SQL assertions, 1061 unit, 128 e2e (garden.spec: seed → practice → grow, bloom, reload, child isolation, ru viewports).
Phase 17: 326 SQL assertions, 1079 unit, 136 e2e (garden-domains.spec: letter game + dino quiz plants, mixed garden, isolation, reload, ru 320).
Phase 18: 326 SQL assertions, 1095 unit, 142 e2e (quests.spec: next adventure, needs instead of locks, double tap builds once, reload, profiles, adventure map, ru 320).

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

## Parent Dashboard (Phase 9)

- `src/features/parent/insights/*` in the Report tab: last 7 days (minutes, activities,
  coins; table alternative), medals/city, skills (level word only for adaptive strands with
  ≥2 runs; accuracy from one source, memory/trace/studio excluded), practise ideas vs
  strengths (≥15 answers, ≥3 runs, never both), played list, healthy play, data & privacy,
  export JSON (one child, no images). "Open" switches the active child first.
- Universe child logs `recent` (runs) and `mistakes` (max 200 each, device only, not for
  guests, cleared with the child) – Phase 16 Mistake Garden reads `mistakes`.

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
consent/data location (Gemini terms: 18+ only, not for apps likely used by under-18s; free-tier
data may be human-reviewed → AI_PROVIDER stays unset; see docs/architecture/ai-tutor.md) · B6 product decisions (free voice set, offline grace, demo mode in
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
- [x] 9 Parent Dashboard: skills, last 7 days, practise/strengths, history, healthy play, export (2026-10-23)
- [x] 10 AI tutor + learning memory: hint ladder in Math Lab, spaced review, memory (device + 0008 server rules), `tutor` Edge Function (Gemini free adapter, OFF: terms forbid under-18 apps → B5), parent memory panel + AI helper switch (2026-10-24)
- [x] 11 Cross-device responsive QA: 9 viewports, folding language switch, wrapping buttons, 3D frames follow rotation, hotspots separated, pinch-zoom allowed, city building looks per level (2026-10-24)
- [x] 12 Performance: pet poses on demand, ru/en texts lazy, decorative robot 30 fps on demand + idle mount + 2D beside 3D content, content canvases pause off screen, SW registers after load (2026-10-24)
- [x] 13 Security: balance from ledger (0009), integrity hardening (0010), security headers/CSP, no device admin in prod, cloud-voice name guard, child-removal cleanup, per-account audio caps (2026-10-24)
- [x] 14 Connected universe: domain events, progression engine + content data, first journey (maths → rocket → Mars seed → Practice Garden → science runs → bloom → Science Lab), 0011 world_rules (2026-10-24)
- [x] 15 Adaptive learning: `domain/adaptive` service (age bands, evidence-weighted, latest-run share, hint reliance, focus + retrieval practice), Math Lab uses options/reviews/picture-first, parent Learning focus panel, profiles 4–18 (0012), `adaptation.updated` event (2026-10-24)
- [x] 16 Mistake Garden: garden derived from learning memory (`domain/garden`), refined `gardenStage`, SVG plants (6 families × 4 stages, deterministic per skill), growth animation, plant card + practice → Math Lab `?practice=`, journal compaction (open needs kept, ≤ 200, v2 migration), 0013 resolved memory (2026-10-24)
- [x] 17 Multi-domain learning memory: `domain/learning` (skill registry, evidence contract, recordLearning), adapters for learn sections (words, tales, space, classic math), letter games + alphabet test, dino quiz; garden areas, domain markers, filter, practice routes + way back; parent names/routes (2026-10-24)
- [x] 18 Smart Quest: `progression/quests.ts` (main quest = journey step, ≤ 2 optional practice quests, needs, world state), `validate.ts` (refs, stages, cycles), typed `subscribeDomainEvents`; Home order + QuestExtras, journey on the Adventure Map, needs on Spaceport/Mars, flower progress on a closed Science Lab (2026-10-24)
- [ ] 19–24 Universe architecture, living world, Mistake Garden, What If?, Detective, Magic Camera, connected journey, adaptation tests, final reviews

Done before Phase 0: 6 learning sections (words, help, tales, space, math, garden),
speaker-button fix (reads current question, uz/ru/en, no overlap, Pro-gated).

## Phase 10 map

`domain/learningMemory` (pure rules memory.ts + store; evidence via `recordEvidence` only;
SQL twin `record_learning_evidence`, parity scenario mastery 0.88) · `domain/tutor` (ladder,
context builder, aiClient: availability no-server/no-account/not-pro/off/resting/ready, consent
mirror `kiddo.ai-tutor`) · `features/tutor` (TutorPanel, useTutorReply) · Math Lab: ladder
clue → picture → card removed → solution, `data-review` question from due memory · server
`_shared/ai/*` + `tutor/` · parent `MemoryPanel`, `AiTutorPanel`. Other activities only emit
`mistake.made` (tutor not yet wired there).

## Responsive (Phase 11)

- Viewports checked: 320×568, 360×800, 393×852, 852×393, 768×1024, 1024×768, 834×1194,
  1440×900, 1920×1080; uz/ru/en; text 130/150/200 %. Guard: `e2e/responsive.spec.ts`.
- Top bar: `layout/useFoldedSwitch` measures the bar (ResizeObserver) → crowding 0–3:
  1 languages fold into one popover button, 2 plan badge sr-only, 3 coins + language wrap
  to a second row (200 % text). Steps down only after the bar got wider or text smaller
  (no update loop). Full language row stays laid out unseen to measure.
- Buttons wrap long labels (`buttonStyles`, no nowrap). Viewport allows pinch zoom.
- Game header: `layout/mascotRow.ts` (small robot, stacked actions below 480 px). Phone
  robots in header rows are px-sized (`w-[56px]`): pictures don't grow with system text.
  Mascot bubble words `break-words` (a word wider than the bubble breaks, never hides).
- 3D: canvas `absolute inset-0` inside the square frame (shrinks on rotation);
  `explorer3d/markers.ts` keeps numbered points ≥54 px apart and inside the frame,
  off-frame points dimmed + untappable (`data-offscreen`). Space 3D only on non-low-end
  devices (this 2-core container counts as low-end; probes override hardwareConcurrency).
- City: `BuildingTile` `LEVEL_LOOK` (same model grows + ground/ring/decor per level).
- Not present in the app (asked for in QA): Scale Portal, Shadow Lab, Music, Mistake Garden
  pages (Phase 19 added rigged per-world 3D mascots, see below).

## Performance (Phase 12)

- Measure with the scratch probes (static bundle, cold load fast/throttled, routes, idle CPU,
  repeated-navigation memory); this container has 2 cores (= weak device: no 3D) and software
  WebGL, so compare builds, never absolutes. Budgets: `e2e/performance.spec.ts`.
- 3D: `components/three/` — `renderBudget.ts` (ambient robot 30 fps / 10 reduced motion),
  `FrameTicker` (demand canvas ticker), `useInView` (content canvases stop off screen),
  `prepareRenderer` (no sync shader-log read in prod), `content3d.ts` (a page with a content
  3D view keeps the robot 2D: one WebGL canvas). Robot mounts on `lib/onIdle` (SVG first, same box).
- i18n: uz in the entry chunk; ru/en lazy (`loadLanguage`, `registerLanguage` for tests);
  vite plugin `preloadStoredLanguage` modulepreloads the stored language's chunk from <head>;
  main.tsx waits ≤ 1.5 s for it. A chunk that fails: stored language rolls back to the one on
  screen (`applyLanguage(language, onFail)` in LanguageSync).
- PetSprite mounts only showable poses and switches only after the new picture loaded;
  companions `warm` all six on idle; pets precached. SW registers after `load` (precache ≈ 7 MB).
- Robot: empty 5:6 box until idle, then 3D; beside a content 3D view it stays 2D for the visit;
  contact shadow drawn once, live while happy/celebrate jumps.
- Known: Blink's DOM-node counter grows ~45 nodes per 3D canvas mount; not reachable from JS
  (heap snapshot: 0 detached), WebGL contexts are released (60/62 lost, no limit warning).
  No dinosaur sounds exist (only UI sounds 16 KB + voice clips cached on play).

## Security (Phase 13) – docs/architecture/security.md

- Device mode (production today) protects nothing by design; cloud mode: server decides.
- 0009: `child_state.coins` = ledger sum (trigger), paid outfits/pets need a purchase row
  (`outfit|id|…`, `pet|id|…`, exact `shop_items` price, once) or `grandfathered_items`;
  `record_reward` refuses spending below zero; new families: first-sync `openBalance` op →
  `record_opening_balance` (once, ≤ 5000 coins, shop items only).
- 0010: entries > 30 days late or before the account → lifetime budget (`history_cap`),
  quest day ∈ [earned−2, earned+1], server building
  prices (`building_levels/costs`, drift test `serverPrices.test.ts`), stars needed; ad
  starts 10/h 30/day, claim needs confirmed e-mail, new ads ≥ 15 s; `deleted_children`
  tombstones (not on account delete), ≤ 5 new profiles/day by server `registered_at` (no
  cap on how many kept, 0002); sync moves a newer child state behind purchases; anon
  write grants revoked; `audio_rate_ok(…, p_daily_limit)` + kind `synth` (global TTS cap
  counts real synthesis only).
- vercel.json security headers + CSP (`src/app/securityHeaders.test.ts`); language preload
  is `/lang-preload.js`. Production has no device admin (e2e builds `--mode e2e`).
- SQL tests: start PG as postgres in /var/tmp/kiddo-pg (`pg_ctl -o '-k /var/tmp/kiddo-pg/sock'`),
  `PGHOST=/var/tmp/kiddo-pg/sock PGUSER=postgres sh supabase/tests/run.sh`.

## Connected world (Phase 14) – docs/architecture/universe.md §8

- `domain/universe/progression`: `events.ts` (typed DomainEvent), `content.ts` (UNLOCKS, ARTIFACTS,
  PLOTS, JOURNEYS as data + Conditions), `engine.ts` (pure `advance`, `canDiscover/canPlant`,
  `journeyView`), `service.ts` (only writer of `UniverseChild.progress`; `installProgression()` in
  main.tsx; `discoverArtifact`, `plantSeed`, journey reward via ledger reason 'journey'),
  `memoryEvents.ts` (mistake.confirmed/resolved, skill.mastered from learning memory).
- Buildings: spaceport (workshop), mistake-garden (shown "Practice Garden"), science-lab (`opensWith`
  'science-lab': locked tile until the Mars flower blooms). Pages /spaceport, /spaceport/mars,
  /mistake-garden, /science-lab; `JourneyCard` on home.
- 0011: `world_rules` (discovery mars-seed needs upgrade|spaceport|1; plant plot|mars needs mars-seed;
  journey|first-flight 2 crystals needs plot|mars); drift test in progression.test.ts.
- Known: growth/lab invisible to the server (bounded: 2 crystals once); guest journey not saved;
  event bus listeners still get the loose UniverseEvent type.

## Adaptive (Phase 15) – docs/architecture/adaptive-learning.md

- `adaptivePlan({ age, strand, skills, now, recent })` pure; `useAdaptivePlan` / `useChildPlan` hooks.
- Learner start by age band: 4→1, 5→2, 6→3, 7–9→4, 10+→5. Profiles 4–18 (`MAX_PROFILE_AGE`);
  DB age 3–25 (0012). Older children get every game (age level 6).
- Math Lab: plan fixed per session; `planSession(level, rng, reviews[], { options })`;
  picture-first hint on evidence only. Parent `FocusPanel` (current / needs / review soon / mastered / why).
- Not consumed yet: aids, vocabulary, explanation depth (plan data only); other sections keep their rules.

## Mistake Garden (Phase 16) – docs/architecture/mistake-garden.md

- `domain/garden` (pure `gardenPlants(skills, now)`, `plantLook`, `nextStep`, `practiceRoute`; `useGarden`);
  stage only from `gardenStage` (memory.ts). No garden store; `seenStages` (page memory) only animates.
- Page `features/mistakeGarden/*` (GardenScene, PlantArt SVG, PlantSheet, MarsBed, garden.css). Child label stays
  "Mashq bog‘i"; stage nouns Urug‘/Nihol/O‘simlik/Gul. Mars bed = Phase 14 artifact, separate card.
- Math Lab `?practice=<skill>`: chosen skill fills both review places at its own level, only the first counts as a
  review; result screen "Bog‘ga qaytish". Bloom kept after a slip (`resolvedAt`; 0013 SQL twin).
- Journal: `compactMistakes` (oldest non-open first), `normalizeMistakes`, universe store v2 migrate.
- Critic: REJECT (2 High: bloom lost after a slip, next-step promise) → fixed → ACCEPT. Known: a relapse on a
  never-bloomed plant shows a seed; garden `now` read when memory changes; migration compaction without the memory.

## Multi-domain learning (Phase 17) – docs/architecture/learning-evidence.md

- `domain/learning`: `skills.ts` (registry: `<domain>:<skill>`, domain math|language|science, strand, practice
  target; `practiceRoute` adds `from=garden`, Math Lab `?practice=`), `evidence.ts` (`LearningOutcome` →
  `Evidence`, hashed items, `errorCode`, `HINT` 0–4, auto due-review not on items seen wrong), `record.ts`
  (`recordLearning`: memory + journal). Names `learning.skills.<domain>-<skill>`, `learning.domains`.
- Adapters (pure): `features/learn/learnEvidence.ts` (in `useLearnSession.close`), `features/tasks/taskEvidence.ts`
  (ChoiceRounds; `data-answer`/`data-option` for e2e), `features/worlds/dino/quizEvidence.ts`.
- Excluded: garden nature section, Help Kiddo, tracing/writing (motor precision, not knowledge), memory game,
  feelings, studio, exploration; deferred: Story Engine questions, Uzbekistan quizzes, Science Lab experiment.
- Garden: grouped by area, `DomainIcon` next to the stage chip, `GardenFilter` from 7 plants in ≥ 2 areas,
  `gardenTrip` (bound to the practice route) + `BackToGarden` on result screens.
- Critic: REJECT (High: invented `mirror-letter` diagnosis; Medium: classic maths altering Math Lab inputs,
  unreachable within5 practice, review item, trip leak) → fixed → ACCEPT. Known: journal keeps two key shapes for
  maths (handled by `memorySkillOf`); tabs lack arrow-key navigation (pre-existing); adaptive plan remains maths-only
  (other areas use their sections' own review).

## Smart Quest (Phase 18) – docs/architecture/quests.md

- No new engine/store/migration: quests are derived from the Phase 14 progression engine.
  `quests.ts`: `smartQuests` (main = current journey step; optional = garden practice, youngest stage first,
  one per area, skips `check-later`, text from the plant's own next step), `conditionNeeds` / `useUnlockNeeds`
  (what a building still costs, server price list), `worldState` (named lasting facts). Hooks `useMainQuest`
  (no garden subscription), `useSmartQuests`, `useWorldState`, `useUnlockNeeds`.
- `validate.ts`: unknown refs, impossible stages/levels, invalid rewards, cycles (journey steps are graph nodes).
- `subscribeDomainEvents` (typed, `satisfies Record<DomainEventType, true>`): the Phase 19 mascot/sound hook.
- Home: homework → JourneyCard (main) → today's plan → daily quest → QuestExtras (review + practice ≤ 2).
  4–6 band sees step title + needs only. Adventure Map shows the JourneyCard.
- Critic: REJECT (High: Home card wall/main quest 5th; undisclosed gaps) → fixed → ACCEPT. Gaps (documented):
  Mars step not split, no rocket build stages, no new celebration/sound, no offline e2e, no journey replay.
- Test hygiene: UzbekistanPage first test waits for the lazy hub (was flaky under load).

## 3D mascots (Phase 19) – docs/architecture/mascot-3d-system.md

- Ten rigged GLB characters (KidoBot, Astro, Dinoo, Ziyo, Lumi, Leafy, Melo, Pixel, Scribble, Story), built from
  code: `tools/mascots/*.py` (Blender 5.2 `bpy`, `npm run mascots:build`) → `npm run mascots:optimize`
  (shared-pose channels, resample, sparse morphs, meshopt, Khronos validator errors+warnings fail, contract) →
  `public/mascots/<id>.glb` (235–400 KB, 9–25 k tris) + `posters/<id>.webp`. No .blend files; `tools/mascots/out` ignored.
- Rig families robot-biped (rigid) / human-biped (Ziyo, soft elbows/knees) / creature (chains) / prop; shared bone
  names, all bones rest on world axes → one clip library (`clips.py`, 21 shared clips + own clips). In-place clips.
- Runtime `features/mascot/characters/`: registry (contexts by `CONTEXT_ROUTES`), emotions (13 → 17 morphs, blink,
  syllable mouth, no lip-sync), director (priorities, merge 350 ms, queue ≤ 3, tap gate), reactions (wrong → think/
  encourage, never sad; Phase 18 events), bridge (subscribeDomainEvents while shown, playing child only), assets
  (ref-counted cache, dispose after 20 s), controller (mixer crossfade 0.25 s, glance without accumulation, glow,
  palette, sockets), Character3D (lazy; data-mascot/data-clip), prefetch (JourneyCard next route).
- `MascotFigure` picks the page's mascot; KidoBot = child's robot (girl pink palette, shop outfits on sockets);
  fallback = 2D robot (KidoBot) / poster. Old procedural robot (`mascot/three/*`) removed; red mistake tint removed.
  Pixel added to Spaceport. Melo/Lumi only in the Lab (no Music room / Shadow Lab yet).
- Tiers: weak → picture; ≤ 4 cores/GB → low (dpr 1, 20 fps, no reflections/idle gestures); reduced motion → still
  base pose, no blink/glow/lips, calm reactions. PWA: posters precached, GLBs StaleWhileRevalidate.
- Mascot Lab `/dev/mascots` (DEV/e2e only). e2e `mascots.spec.ts` uses swiftshader WebGL + hardwareConcurrency 8.
- Splash: rounded vw/vh (console warnings fixed).
- Critic: REJECT (High: glance accumulated on clips without a head key; ikat sash missing) → fixed (+ faces, details,
  cache, docs, skeleton dispose, low tier) → ACCEPT.

## Demo / admin / Pro visibility (Phase 20) – src/config/demo.ts

- `DEMO` (config/demo.ts) is the only switch: demoMode = no cloud backend && `VITE_DEMO_MODE`≠false (a cloud build is
  never a demo); publicProUIEnabled = `VITE_PUBLIC_PRO_UI` ?? !demoMode; demoAdminEnabled = demoMode.
- Demo: voice (`audio`) free (`FREE_IN_DEMO` in entitlements); premium content stays PRO; no prices/plans/payment
  (ProSection shows `pro-demo-note`, TierBadge hidden, parent tab "Promokod", parent `parent-demo-chip`).
- 10 demo codes `KIDDODEMO01–10` (config/demoPromoCodes.ts; 7/14/30/90 days, valid to 2027-12-31), once per device,
  case/space-insensitive, 'expired' result. Demo PRO switch = source 'demo' (only honoured in a demo build); a code
  replaces it.
- `/admin` in demo: "Demo administrator sifatida kirish" → session `{source:'demo'}` (refused by non-demo builds),
  device data only; Demo overview (KPIs, strands, children cards), Demo section (PRO switch, codes, reset = demo
  codes + demo days only); no payments/children table.
- e2e: main projects build with VITE_DEMO_MODE=true; project `production` (port 4181, dist-production,
  VITE_DEMO_MODE=false) runs tests tagged `@production` (Free/PRO, PIN admin, prices).
- Critic: REJECT (High: env var could open demo on a cloud build; Mediums) → fixed → re-review.

## Learn Before Play (Phase 21) – docs/architecture/learn-before-play.md

- Registry `domain/learning/lessons.ts` (`ACTIVITY_LESSONS`: dino.animals, uz.map/table/patterns, lab.plant;
  `letterLessonId`, `mathSkillLessonId`). Seen lessons per child in learnStore `stages.lessons` (`markLesson`,
  `hasSeenLesson`, `useLessonSeen`); no new store.
- `LessonDeck` (cards, speaker, focus on title) used by Dino quiz+dig (`DinoLesson`), Uzbekistan games (`UzLesson`),
  Science Lab. "Yana o‘rganish" (`lesson-review`) on start cards / Uzbekistan result screens.
- Letter games (choice + memory): `LetterIntro` for unmet letters (`useUnmetLetters`); alphabet page marks letters
  met; introduced letters are `introduced` in completeTask (not learned this run, helpedBefore in evidence).
- Math Lab: first time a skill appears, a worked example of another item (`exampleQuestion`) before answering.
- Tests: `features/learn/lessons.test.tsx`; unrelated math tests mock math lessons as met (`src/test/lesson.ts`);
  e2e helpers `e2e/lesson.ts` (passLesson, passLessonIfShown, meetNewLetter, passMathExample).

## Infinite age + mastery (Phase 22) – docs/architecture/infinite-age-mastery.md

- No maximum age: `isAllowedBirthDate` = real date ≥ 1900-01-01 and age ≥ 4 (MAX_PROFILE_AGE removed).
- `StrandState.mastery` above level 5 (no ceiling on the count; MAX_MASTERY guard for corrupt saves): 2 strong
  runs at 5 → +1, 2 weak → −1 before the level drops. `startMastery(age)` 12+:1, 15+:2, 18+:3. `useMastery`.
- Math Lab mastery sessions: `masteryMax` 50…50 000 then capped 99 999; skills add:big/sub:big/missing:*;
  ColumnsHelp; `format.ts` digit grouping; font scaling for 320px; reviews cross plans; chip "5-daraja · ustalik m".
- Parents: StrandRow.mastery, level word + "ustalik m". e2e: 40-year-old at 320px up to 5-digit numbers.

## Homework + Parent Center 2.0 (Phase 23) – docs/architecture/homework.md

- `Homework = LetterHomework | ActivityHomework` (`kind: 'activity'`, target ActivityNameKey, times 1–5, runs,
  dueDay, note); `assignActivityHomework`, `recordHomeworkRun` (idempotent by run id); guards
  `isLetterHomework`/`isActivityHomework`. `HomeworkBridge` in AppShell counts `activity.completed`.
- Child home `ActivityHomeworkCard`; parent `ActivityHomeworkPanel` + list; `FamilyOverview` (2+ children).

## Photo + birthday (Phase 24) – docs/architecture/birthday-and-photo.md

- `ChildProfile.photo` (256px JPEG data URL, validated type/size/magic bytes/decode, never synced), shown by
  ChildAvatar. `ChildProfile.birthdayGifts` years; `claimBirthdayGift` = 50 coins (reward reason `birthday`,
  ref `birthday|<year>`) + `giftPet`; `BirthdayCelebration` on Home after the unlock party.
- Migration 0014: record_reward 'birthday' rule + no age ceiling (age >= 3). e2e profiles born −30 days.

## Onboarding (Phase 25) – docs/architecture/onboarding.md

- `/welcome` five-step interactive KidoBot tour after the first language; `settingsStore.onboarded`; skip; replay
  from parent settings. e2e global `storageState` e2e/state/onboarded.json (tour seen).

## Living mascots (Phase 26) – docs/architecture/living-mascots.md

- RoamingMascot fades behind the sticky top bar (`data-under-bar`) and only picks cards in view (clip bug fixed).
- `features/mascot/life.ts` home line: night > birthday > homework > plan done > time of day, named. A robot already on an in-view card stays (no edge ping-pong); with two robots the girl waits at the left edge. Critic re-review: ACCEPT (Critical 0 / High 0). phrases.json updated
  (+ birthday, welcome sections in collect.ts); recordings = owner step.

## Next

Next phase per the owner's prompt (do not invent its scope). Owner actions: apply 0005–0013, deploy voice-url/tts/tutor +
secrets (no AI_PROVIDER while B5 open), upload voice, then `VITE_VOICE_PRIVATE=true`;
Realtime private-only; Vercel `VITE_SUPABASE_*`; schedule `ai_housekeeping()`; B4; B5.

## Living pet shop (Phase 27) – docs/architecture/living-pet-shop.md

- Original Phase 27 contract text was lost to context compaction; scope defined from the phase name and recorded here.
- Pet friendship: `features/pets/bond.ts` (hearts at 1/3/7/14/30 days together, `addBondDay` once a day; a `last` more
  than a day ahead — a wrong clock — does not freeze it). `progressStore.recordPetDay(childKey, day)` counts only the
  owned pet walking with the robot; optional `ChildProgress.petBond` (persist v3 unchanged; local only, not synced;
  a guest's resets with the guest's progress on reload, by design). Pays no coins, nothing is lost on missed days.
- `PetBridge` (AppShell) listens to `activity.completed`, toast `shop.petBondUp` on a new heart.
- Shop: owned pets show 5 hearts + days to the next one (also in the card's aria-label); a tapped pet answers
  (surprised → happy pose) in the shop and at the robot's feet (`PetCompanion`). `HeartIcon`. uz/ru/en `shop.petBond*`.
- Tests: bond.test.ts, PetBridge.test.tsx, progressStore + ShopPage tests, e2e/pet-shop.spec.ts. Critic: ACCEPT
  (Critical 0 / High 0); its Medium (Russian wording) and Lows (aria days left, clock-ahead, toast text test) fixed.

## World Card Evolution (Phase 28) – docs/architecture/world-cards.md

- Original Phase 28 contract text was lost to compaction; scope defined from the phase name.
- `domain/universe/worldStage.ts`: stage new → explorer (1 star) → expert (half the world's max) → master (all 3★),
  from the world's activities' best stars; `starsToNextStage`. WorldStop: frame/chip/badge (medal, crown) per stage,
  "stars in this world" + "to next stage" on unlocked worlds only; `data-stage`, testids `card-stage`, `card-stage-up`.
- AdventurePage (keyed by child): one-time "new stage" (pill + pop, reduced motion off) from
  `ChildProgress.worldStages` (only raised, `markWorldStages`); one sr-only page-level status 400 ms after mount.
  Road measuring selects only `:scope > ol > li[data-testid^="world-"]` (inner testids must not start with `world-`).
- Tests: worldStage.test.ts, adventure.test.tsx, e2e/world-cards.spec.ts. Critic: REJECT (road selector High) →
  fixed → ACCEPT (Critical 0 / High 0).

## Sound language (Phase 29) – docs/architecture/sound-language.md

- Original Phase 29 contract text was lost to compaction; scope defined from the phase name.
- `services/audio/synth.ts` (Web Audio, shared with pet voices); `services/audio/soundLanguage.ts`: cues coin, star,
  grow, heart, unlock, spend in C major pentatonic, one wooden timbre, < 1 s, app volume, all tiers. `queueCue`
  gathers 150 ms → strongest; after the ui_success chime (`noteSuccessSound` from audioManager) small cues are quiet,
  unlock/heart follow it. No cue before the first user activation. `SoundBridge` (AppShell): reward ledger + domain
  events of the active child only (penalty/pro-gift/admin quiet). PetBridge → heart; Adventure new stage → unlock.
  Parent settings: preview buttons per cue. Critic: ACCEPT; its Mediums (overlap with the chime, no gesture) fixed.

## Contract restored (2026-10-30)

- Full contract: `.claude/kiddo-contract-phase20-36.md` (authoritative, prettier-ignored). Gap list: `.claude/kiddo-gap-backlog.md`.
- P28 redone per contract: City building cards (`src/features/city/scene/{looks.ts,BuildingScene.tsx}`) draw sky/light,
  skyline, per-style architecture, ground and lamps per level; 8 named stages `city.stages.<id>.<0-3>`. The
  Adventure-map world stages (worldStage.ts) stay as an extra.
- P27 patched: species idle motion `features/pets/motion.ts`, paused off screen / weak device / reduced motion.
- jsdom IntersectionObserver stub in src/test/setup.ts (all visible).
- P29 patched: one AudioContext (synth.ts uses Howler.ctx, autoSuspend off); cues + levelUp/discovery/confirm/back;
  `setNarrating` (audioManager 'speaking'): small cues dropped, tap-initiated cues/clicks/pets ducked; throttles
  (click 70 ms, back 250 ms, pet 400 ms); `data-sound="back"|"confirm"` read by InterfaceSounds.
- P25 redone: coach marks on the real UI (`features/onboarding/{tour.ts,CoachMarks.tsx}`), tours home/play/reward,
  per child `ChildProfile.tours` (guest: settings.guestTours): 0 full, 1 brief, then none; counted when shown;
  young (≤6) voice + mascot, older short lines; waits for splash/dialogs/greeting/speech and its first anchor;
  parent replay → resetTours. e2e seam localStorage `kiddo.e2e.tours`='off' (onboarded.json + after clear()).
