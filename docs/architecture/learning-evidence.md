# Learning evidence across areas (Phase 17)

One learning memory (`domain/learningMemory`, Phase 10) for every area. Modules never
write memory, scores or statuses; they report a finished question once.

```text
Learning module → adapter (pure) → LearningOutcome → recordLearning → Evidence
→ learning memory rules (confirm / improve / resolve / review) → Mistake Garden, parent panels
```

## Contract — `domain/learning`

| Piece          | File          | What it is                                                                                                              |
| -------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Domains        | `skills.ts`   | `math`, `language`, `science` (typed union)                                                                             |
| Skill registry | `skills.ts`   | key `<domain>:<skill>` (stable, never translated), domain, strand, practice target                                      |
| Outcome        | `evidence.ts` | `skill`, `sessionId`, `questionId`, `item`, `firstTry`, `helpedBefore`, `errors`, `hint`, `at`, `level?`, `review?`     |
| Recorder       | `record.ts`   | `recordLearning(childKey, outcome)`: evidence (idempotent by id) + one journal entry per wrong first answer and session |

- Ids: `<sessionId>|<hash(questionId)>` — a re-render, remount, double tap or retry counts once.
- Items are hashes (`q:1x2y3z`): no word, name or free text leaves the device.
- Hint scale (`HINT`): 0 none · 1 clue · 2 guided · 3 strong scaffold · 4 full answer. Help before
  the first answer and scaffolded success are never independent (Phase 10 rules unchanged).
- Error codes: a module's known codes pass; item-specific labels (`chose-fox`, `picked:mars`) become
  the module's generic code, so a repeated difficulty is one pattern. The classic Math section's
  unclassified wrong sums become `other` (ignored), so only real misconception codes reach Math Lab's
  plan; its help counts as a guided hint (2) in Math Lab's hint-reliance share (one memory).
- Sessions: confirmation still needs 2 different items in 2 sessions (one bad sitting never does).
- Review: a module without its own spaced schedule marks a question as the review when the memory's
  review of that skill is due and the item is not one already got wrong (`isDueReview`, as Math Lab's
  reviews avoid them). Bloom still needs 3 independent answers in a row
  including that review ≥ 20 h after the last error.

## Integrated modules

| Module                       | Adapter                                | Skills                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Math Lab                     | (Phase 10, unchanged)                  | `math:*` (21)                                                                                                                                                                                        |
| Classic Math section         | `features/learn/learnEvidence.ts`      | onto the same maths skills (`add:sum10` → `math:add:within10`, level 2; `add:over10` → `within20`, level 4); `add:within5` and `add:make10` are practised in this section (Math Lab never asks them) |
| Words                        | same                                   | `language:first-sound`, `missing-letter`, `word-building`, `reading-words`, `reading-sentences`                                                                                                      |
| Tales (questions)            | same                                   | `language:story-questions`                                                                                                                                                                           |
| Space lessons/tests          | same                                   | `science:planet-names`, `planet-facts`, `planet-order`, `sky-objects`                                                                                                                                |
| Letter games + alphabet test | `features/tasks/taskEvidence.ts`       | `language:letter-recognition`, `language:first-sound` (`wrong-letter` / `wrong-initial` only: no guessed reason)                                                                                     |
| Dinosaur quiz                | `features/worlds/dino/quizEvidence.ts` | `science:dino-diet` (`diet-mixup`), `dino-facts`, `dino-size`                                                                                                                                        |

## Excluded (no reliable deterministic skill evidence, or not the child's difficulty)

- Garden nature section: every tap is recorded as found; no wrong first answer exists.
- Help Kiddo: the child corrects the robot's mistake.
- Tracing / writing: the path score measures touch precision and stroke coverage, not knowing the
  letter's form or stroke order; mapping it would label motor slips as misconceptions. Deferred.
- Memory game, feelings, Creative Studio, exploring worlds (planets, dinosaurs, Uzbekistan landmarks).
- Story Engine questions: overlap the Tales questions skill; mapped later with their own items.
- Uzbekistan quizzes (map, table, patterns): no culture/geography domain in the taxonomy yet.
- Science Lab experiment: one fixed run of four questions (the journey), too little to measure.

## Garden and parents

- `gardenPlants` reads the registry: domain, plant family by domain (maths keeps Phase 16 looks;
  language leafy/climbing/flowering; science botanical), plants grouped by area, practice route
  (`?from=garden`; Math Lab `?practice=<skill>`), names `learning.skills.<domain>-<skill>`.
- A filter (All / areas present) appears only from 7 plants in at least 2 areas.
- The way back: `gardenTrip` (tab-only, bound to the practice route, 2 h) + `BackToGarden` on Math Lab,
  learning-section, letter-game and dinosaur result screens; other screens never show it.
- Parent memory/focus panels and practice ideas name skills via `parentSkillNameKey` (maths by family,
  other areas by registry); a practice idea for another area opens the registry's activity.
- Journal: one bounded log (≤ 200) for all areas; open needs of every area are kept first.
