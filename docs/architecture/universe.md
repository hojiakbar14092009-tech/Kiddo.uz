# Kiddo Universe – one connected learning world

The design every phase from 4 on builds into. Rule: a new feature must change the
shared state below (resources, mastery, world, quests) or it is redesigned.

Core loop: **learn → earn → build → explore → discover → create → unlock → learn again.**
Healthy engagement only: no streak punishment, no timers that pressure, no random
paid rewards, natural stopping points (a finished quest ends with "rest or continue").

## 1. Domain modules (`src/domain/*`, pure logic + one store each)

| Module                  | Owns                                                                  | Persisted key    |
| ----------------------- | --------------------------------------------------------------------- | ---------------- |
| `ledger`                | generic idempotent append-only ledger (Phase 3)                       | –                |
| `rewards`               | coins (shop currency), via `grantReward` / `spendCoins`               | `kiddo.rewards`  |
| `progress`              | mastery facade over `progressStore` + `learnStore`                    | (existing)       |
| `entitlements`          | `canUse(feature)`                                                     | (subscription)   |
| `learner`               | `LearnerProfile`: age baseline + mastery → challenge level per strand | derived          |
| `universe/resources`    | stars, crystals, seeds, parts, scrolls, keys (ledger)                 | `kiddo.universe` |
| `universe/events`       | domain events bus: `activity.completed`, `mistake.made`, …            | –                |
| `universe/rules`        | event → resources, quest progress, achievements (pure, tested)        | –                |
| `universe/world`        | buildings, levels, upgrades, unlocks (data-driven)                    | `kiddo.universe` |
| `universe/quests`       | daily quest + journey quests                                          | `kiddo.universe` |
| `universe/achievements` | rules → medals/badges                                                 | `kiddo.universe` |

All writes for one child go through `universe` actions with an idempotency key
(the event id), so a reload or a double tap never pays twice. In cloud mode each
ledger entry is queued to Supabase (`record_reward`-style RPC per resource).

## 2. Resources – each has a source and a use

| Resource             | Earned by                                                                           | Spent on / used for                                          |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Coins                | finishing activities (existing)                                                     | shop: outfits, pets                                          |
| Stars ⭐             | quality of an activity (1–3, independent answers)                                   | measure only: unlock world levels (thresholds), medals       |
| Crystals 💎          | mastery milestones (a strand level-up), daily quest                                 | building and upgrading buildings, the rocket                 |
| Seeds 🌱             | a mistake becomes a seed; rare seeds from exploring (Mars)                          | planted in the Mistake Garden; grow by practising that skill |
| Mechanical parts ⚙️  | maths/engineering challenges, Science Lab experiments                               | rocket and robot builds                                      |
| Knowledge scrolls 📜 | finishing a tale or a story (`story:<id>`) the first time, Teach Kiddo explanations | Museum exhibits, What If? experiments                        |
| Mystery keys 🔑      | Detective clues solved                                                              | opening the final solution of a mystery                      |

No resource can be bought with money. No random drops: every reward is announced
before the activity ("Finish this to get 1 crystal").

## 3. World – data-driven buildings

`universe/world/buildings.ts`: `{ id, nameKey, icon3d, levels: [{ requires: {
resources, stars?, buildings? }, unlocks: FeatureId[] }] }`. Progression of areas:
Village → City → Science Lab → Garden → Observatory → Spaceport → Museum →
Research Center → Space Colony. Kiddo City (`/home` evolves to `/city`) shows them
as a map; a building is a door to its features (Math Land → math, Observatory →
space, Garden → Mistake Garden, Lab → What If?, Museum → stories/scrolls,
Spaceport → rocket/Mars, Detective office → mysteries). Locked buildings show what
they need, never block core learning (core sections stay open from the start).

## 4. Learner profile and adaptation

`LearnerProfile { ageBaseline (4–6+), strands: Record<Strand, { level 1–5, accuracy, attempts, recent[] }> }`,
strands: number, letters/reading, language, science, space, logic, social-emotional.
`challengeLevel(strand) = clamp(ageBaseline-mapped start + mastery adjustment)`:
two independent successes in a row at a level → up; two misses → down (never below
level 1, no punishment, the change is not announced as failure). Age never locks a
feature; it only chooses the starting level. Generators (math, words, space, garden…)
take a `level` instead of `ageLevel`.

Implemented in `src/domain/learner` (Phase 5): the profile lives in the universe
child (`strands`), updated by `emitActivity` only for runs that carry `level` equal
to the current level (adaptive activities: Math Lab, Feelings), so tracing or older
sections never move it. Before a strand's second run the age still decides (a
corrected birthday re-seeds). Guests start at 2. Device-only for now; the
`learner_profile` table and sync come with Phase 14. Presentation scales: level 1–2 large visual
UI, 3–4 missions/collections, 5 strategy/evidence/simulation.

Phase 15: the plan for each session comes from `src/domain/adaptive`
(docs/architecture/adaptive-learning.md); age bands guide, evidence decides.

## 5. Quests

- Daily quest: 3 short steps chosen from due review (mistake seeds), the child's
  weakest strand and one exploration; reward announced up front (crystal + stars).
- Journey quests: multi-step chains across subjects (Phase 20 "connected journey"):
  maths → crystal → build rocket → Mars → rare seed → Mistake Garden → biology →
  plant grows → upgrade Science Lab → unlock What If? experiment. Each step is a
  real state change checked by rules, never a label.

## 6. Events (examples)

`activity.completed { childKey, section, strand, level, correct, total, independent, sessionId }`
`mistake.made { childKey, skill, strand }` · `seed.planted` · `building.upgraded`
`story.finished` · `experiment.done` · `mystery.solved` · `trace.done`.
Rules are pure functions `(state, event) → effects[]`, effects applied by the store
in one transaction; unit-tested per rule.

## 7. Server (cloud mode)

Tables (migration 0006+): `resource_ledger` (generic, unique(child, resource, reason, ref)),
`world_state` (buildings and levels per child), `quest_progress`, `achievements`,
`learner_profile` (strand levels). Writes through `security definer` RPCs with
caps; reads by the family. Device mode: same logic locally.

## 8. Connected world (Phase 14) – `src/domain/universe/progression`

One universe, not mini-apps with shared coins: features publish domain events,
one engine turns the world's state into what changes next.

**Audit (before Phase 14).** Already connected: every activity → `emitActivity`
(stars by quality, crystal on a first 3-star, part for maths, scroll for
stories) → achievements → coins; city upgrades spend crystals/parts; the
adventure map opens by stars; the daily quest pays a crystal; Math Lab moves
the strand level; learning memory keeps mastery, misconceptions and a garden
stage per skill. Isolated: seeds and keys had no source; mistakes had no
place; no step led from one world into another; `mistake.made` was the only
learning event on the bus; nothing tied an unlock to anything but stars.

| Layer   | File                             | Role                                                                                                                                                                                                                                                                       |
| ------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Events  | `events.ts`                      | typed `DomainEvent` union (activity.completed, resource.changed = reward earned / resource spent, building.upgraded, mistake.made / confirmed / resolved, skill.mastered, world.unlocked, artifact.discovered, seed.planted, plant.grew, journey.step, quest.completed, …) |
| Content | `content.ts`                     | data only: `UNLOCKS`, `ARTIFACTS`, `PLOTS`, `JOURNEYS` with declarative `Condition`s (run, building, unlocked, discovered, planted, plotStage)                                                                                                                             |
| Engine  | `engine.ts`                      | pure: `advance(progress, world) → { progress, effects }` (growth, unlocks, ordered journey steps, completion; chains in one call, bounded), `canDiscover`, `canPlant`, `journeyView`                                                                                       |
| Service | `service.ts`                     | the only writer of `UniverseChild.progress`; `syncProgression` after any trigger event, `discoverArtifact`, `plantSeed`; grants and spends only through the universe ledger (`grantResource` / `spendResources`)                                                           |
| Bridge  | `memoryEvents.ts`                | learning-memory changes → `mistake.confirmed`, `mistake.resolved`, `skill.mastered`                                                                                                                                                                                        |
| UI      | `useJourney`, `useWorldProgress` | read-only views; pages: `/spaceport`, `/spaceport/mars`, `/mistake-garden` (shown as the Practice Garden), `/science-lab`, `JourneyCard` on home                                                                                                                           |

**The first journey** (`FIRST_FLIGHT`): maths 3 stars (crystal + part) →
spaceport level 1 (the rocket; opens `mars`) → find `mars-seed` on Mars (+1
seed) → plant it in the `mars` bed (−1 seed) → three science runs with ≥ 2
stars after planting (one stage each) → bloom opens `science-lab` → its first
experiment → +2 crystals, announced on the card from the start. Steps count
only in order; finishing pays once (`journey|first-flight`).

**Rules of engagement.** No random rewards (the seed is under the last rock
turned), no timers, no streak loss; the lab is a discovery place, never a
lesson; learning buildings stay open from the start. Mistakes become sprouts
("Practice Garden"), never a failure list; making mistakes pays nothing.

**Source of truth.**

| What                                                         | Device mode           | Cloud mode                                                                                                                                                                                                                   |
| ------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resources (incl. seed found, seed planted, journey crystals) | device ledger         | `resource_ledger`; `record_resource` checks `world_rules` (0011): exact resource and amount per ref, and the step before must be in the child's ledger (rocket paid → seed; seed found → planting; planted → journey reward) |
| Building levels (spaceport, mistake-garden, science-lab)     | device                | `record_building_level` with server prices (0011 adds the three)                                                                                                                                                             |
| Unlocks, finds, plots, steps (`progress`)                    | device, derived       | device, derived; everything paid in it is rebuildable from the ledger                                                                                                                                                        |
| Plant growth, the lab experiment                             | device (science runs) | not visible to the server: the journey reward is one fixed amount once per child, so a forged growth gains at most 2 crystals once                                                                                           |

Offline: everything works without a network; sync sends the ledger entries in
order (a spend after the grants it needs). Analytics: none beyond the
existing local logs; no event leaves the device except the ledger rows above.
