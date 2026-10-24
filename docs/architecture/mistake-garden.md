# Mistake Garden (Phase 16)

Shown to the child as **Mashq bog‘i / Сад практики / Practice Garden** (`/mistake-garden`).
A learning difficulty becomes a seed; practice grows it; independent, retained success
makes it bloom. The child never sees a count of mistakes.

## Ownership

| Data                                            | Owner                                                                           | Stored                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Skill state (misconceptions, streak, retention) | `domain/learningMemory` (Phase 10)                                              | `kiddo.learning-memory`, per child, never for guests |
| Plant stage                                     | `gardenStage(memory)` in `learningMemory/memory.ts` — the only stage calculator | derived, not stored                                  |
| Plant model (look, next step, practice route)   | `domain/garden/garden.ts` (pure) + `useGarden(childKey)`                        | derived, not stored                                  |
| Mistake journal                                 | `domain/universe/history.ts` (`mistakes`, ≤ 200)                                | `kiddo.universe`, per child, never for guests        |
| Mars bed (rare seed of the first journey)       | `domain/universe/progression` (Phase 14)                                        | `UniverseChild.progress`                             |
| "Seen" stages for the growth animation          | `features/mistakeGarden/seenStages.ts`                                          | page memory only                                     |

There is no `mistakeGardenProgress`. A reset or a removed child clears the learning memory,
so the garden empties with it.

## Stages (`gardenStage`)

| Stage  | Child label uz / ru / en    | Evidence                                                                                                                              |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| none   | —                           | no confirmed misconception (one slip is only "observed")                                                                              |
| seed   | Urug‘ / Семечко / Seed      | confirmed: same error code on 2 items in 2 sessions                                                                                   |
| sprout | Nihol / Росток / Sprout     | practised after the last error (even with help), improving with streak < 2, or a difficulty that came back after a bloom (relearning) |
| plant  | O‘simlik / Растение / Plant | improving, `GARDEN_GROW_STREAK` (2) independent successes in a row                                                                    |
| bloom  | Gul / Цветок / Flower       | resolved: 3 in a row incl. a review ≥ 20 h after the last error                                                                       |

The same nouns are used on the plant chip, the growth path and in accessible names.
One lucky answer cannot bloom (streak + retention). Success after hints is not independent
(`isIndependent`). A bloom is kept: a later slip keeps `resolvedAt` (still a flower), and a
stale slip returns to resolved (memory.ts + migration 0013, the SQL twin). Only a difficulty
confirmed again shows as a sprout to relearn. A relapse on a plant that never bloomed shows
the honest stage (seed), without any wilting animation; nothing ever dies from inactivity.

## Plants

- One skill = one plant (`math:add:within10`), many wrong items aggregate into it.
- `plantLook(skillKey)`: FNV-1a hash → family (flower, leaf, tree, cactus, crystal, vine),
  hue (4), mirrored. Same skill, same plant, every session and device.
- Order: the skill first practised first (never swap places).
- Names: `features/mistakeGarden/skillName.ts` → `practiceGarden.skills.<skill>` (21 Math Lab
  skills, test-checked against the generators), fallback name for unknown skills.
- Next step (`nextStep(memory, stage, now)`), true to the rules and without scores: practise
  once / N more in a row on your own (grow) / N more in a row → bloom (only when the look a
  day after the last error is possible) / N more, then tomorrow's look (bloom-later) / only
  tomorrow's look left (check-later) / learned.

## Practice loop

Plant card → `/math-lab?practice=<skill>` (validated) → that skill takes both review places of
the session (two related items, at the level it was hard at, even above today's; `chosen` in
`ReviewPlan`) →
evidence via `recordEvidence` → result screen "Back to the garden" → the plant shows its
new stage; `seenStages` plays the growth once. Opening Math Lab alone grows nothing.

## Journal (≤ 200)

`compactMistakes(list, max, isOpen)`: newest first; when full, the oldest entries whose skill
is not an open need (no active misconception in the learning memory) go first; only then the
oldest open needs. Deterministic (tests: 0, 1, 199, 200, 201, 500). `normalizeMistakes` drops
malformed entries, keeps one (run, skill), sorts by time and caps; the universe store migrates
v1 → v2 with it (at migration time without the memory predicate: oldest first). One entry per
(run, skill), not per tap. Readers: the parent dashboard's practice suggestions
(`useChildInsights`) and the compaction; the garden itself reads the learning memory.

## Mars integration

`MarsBed` (Phase 14 rules unchanged, testids `mars-bed`, `plant-seed`, `mars-stage`) sits on the
same page but in its own card: a world artifact, not a learning plant. It moves above the
learning garden while a found seed waits to be planted. Learning plants never unlock the
Science Lab.

## Visual, motion, accessibility, performance

- SVG plants (no images, no WebGL), CSS-only motion in `garden.css`: growth sequence
  (soil pulse → stem → leaves → bloom, ~1.5 s), slow leaf sway on plants/blooms, two butterflies.
  `data-still` (IntersectionObserver via `useInView`) pauses everything off screen;
  `prefers-reduced-motion` → no ambient motion, a 220 ms fade for a stage change.
- Each plant is a button (≥ 44 px) named "skill — stage", opening a dialog (focus trap, Escape);
  no hover-only actions. The growth path legend explains seed → sprout → plant → flower.
- Guests see a temporary garden with a note that it lasts for this visit only.
