# Living mascots (Phase 26)

Builds on the 3D mascot system (docs/architecture/mascot-3d-system.md).

- **Never cut by the top bar.** The robot that roams Home and other pages stands on cards in page coordinates. When
  the page scrolls and more than a fifth of it would sit behind the sticky top bar (`[data-topbar]`), it fades out
  there (`data-under-bar`) instead of being cut in half; it only chooses cards fully in view, and its hops never
  arc up behind the bar. With no card in view (the bottom of a page) it waits at the screen's edge, in view, and
  hops back to a card once one is visible. This fixes the clipped KidoBot on Home.
- **A greeting that follows the child's day** (`features/mascot/life.ts`, deterministic): at night (22–04) only "time to rest"; otherwise birthday week first,
  then waiting homework (letters and activities), then a finished plan, then the time of day (morning 05–11, day
  12–17, evening 18–21, night: "time to rest — see you tomorrow"); with the child's name when there is one. Three
  languages (`mascot.life.*`). With reduced motion the roaming robot is not shown, so this greeting is not shown
  either (as before Phase 26).
- Voice: the new sentences (and the birthday party and the welcome tour) are in `scripts/voices/phrases.json`
  (`npx tsx --tsconfig tsconfig.app.json scripts/voices/collect.ts`); recording them is an owner step
  (`scripts/voices/generate.py`). Until then a missing clip is simply not played.
- Melo (music) and Lumi (light) stay in the Mascot Lab until their places exist: the sound language (Phase 29)
  and the Shadow Lab (Phase 34).

Tests: `features/mascot/life.test.ts`, `e2e/living-mascots.spec.ts`.

## Phase 43 — a robot that remembers, dozes and listens

- **Memory** (`features/mascot/life.ts` `mascotMemory`, pure): from the active child's own data only —
  the robot's uncapped day count (`progressStore` `robotBond`, raised once a day on `activity.completed`
  in `PetBridge`, seeded once from the capped history), the finished runs of yesterday (one count per run,
  strand → letters / numbers / explore / play) and the days away. Home reads it once on arrival.
- **Home line order**: night → birthday → homework → plan done → "I missed you" (≥ 3 days away) →
  a friendship day (3, 7, 14, 30, 100 days played; each said once, `said`; a skipped one is still said
  within a week) → "yesterday we …" → the time of day. All lines ≤ 8 words, in `pendingRecordings.json`.
- **Touch** (`characters/director.ts` `TapTracker`): a different move each time (never twice in a row,
  `TAP_MOVES`), a giggle-jump for three quick taps in 3D; at most three answers in any 10 s. The 2D robot
  (`useTapMood`) waves / smiles on a click, only while at rest; no cue and no cheer (those belong to
  progress); posters do not take touches.
- **Rest hours** (`useRestHours`, 22:00–05:00): an idle robot dozes — the screen robot only when there
  is nothing to read (not mid-lesson), the roaming robot on Home always. Any reaction or speech wakes it.
- **Talking mouth** (`services/audio/voiceLevel.ts`): an analyser on Howler's master output (the one
  AudioContext), plugged in only while Kiddo speaks; the mouth opens with the loudness and shuts in the
  pauses. Before the voice is first heard, or after 2 s of silence (the device's own voice), it keeps the
  syllable rhythm (`Syllables`). UI taps during a pause can open it for a moment (accepted).
