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
