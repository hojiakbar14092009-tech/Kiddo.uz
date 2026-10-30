# Infinite age and open-ended mastery (Phase 22)

## No maximum age

- The birth date is the only age source (`familyStore` → `childAge`). A profile can be added for any learner
  from 4 years old; there is no upper limit (`isAllowedBirthDate`: a real date, on or after
  `EARLIEST_BIRTH_DATE` = 1900-01-01 only to catch typing errors, and at least 4 years ago).
- Age shapes presentation (age bands in `domain/adaptive`: 3-4, 5-6, 7-9, 10-12, 13-15, 16+; a guest or an
  unreadable birth date counts as 5-6) and where a strand starts; it never caps what can be learned.
- Nothing is locked by age: every game, number, tale and the big test (mastery only) is open; an age only
  suggests ("5 yoshdan tavsiya") and orders suggestions. Ages count by the Tashkent day (`lib/dates`).
- Difficulty and visual maturity are separate: `data-age` (4/5/6) on `<html>` is the young presentation
  level, `data-band` the look by real age. From 10 a calm plain page; from 13 the plain system face (with the Uzbek ʻ), smaller corners
  and flatter shadows. The Home badge shows the real age, never the level.

## Mastery above level 5 (`domain/learner/profile.ts`)

- Every strand keeps its challenge level 1–5. At level 5 a strand also has `mastery` (0, 1, 2, …, no ceiling).
- Two strong runs in a row at level 5 → one mastery step up. Two weak runs in a row → one mastery step down
  first; only at mastery 0 does the level go down. Below level 5 mastery is always 0.
- Start (until two runs have been played): `startMastery(age)` = 0 at every age (Phase 22: age is never
  taken for mastery); a placement or the learner's own answers decide, both ways.
- Stored values are never trusted raw (`stateMastery`: non-numbers and negatives read as 0; an old save
  without the field reads as 0). Deterministic, no AI.
- Reviews and garden practice of the big-number skills are made at the session's mastery step.
- Big numbers are written in groups of three from 10 000 (`format.ts`), with smaller digits on the cards and in
  the equation so they fit a 320 px phone.
- Hooks: `useMastery(strand)`; non-hook: `masteryOf(strands, strand, age)`.

## Where mastery is used

- Math Lab: at level 5 with mastery m, the session is four kinds with bigger numbers each step
  (`masteryMax`: 50, 100, 200, 500, 1000, 2000, 5000, 10 000, 20 000, 50 000, then 99 999 — numbers stop at
  five digits so they stay exact and fit a 320 px phone; the mastery count itself has no ceiling, only a
  `MAX_MASTERY` guard against corrupt saves): addition, subtraction, missing addend, missing
  subtrahend. Help shows the numbers in columns (`HelpVisual` `columns`; it never shows the result). Skills:
  `math:add:big`, `math:sub:big`, `math:missing:add`, `math:missing:sub` (registered, named in all three
  languages). The level chip shows "5-daraja · ustalik m"; a mastery step up is praised like a level up.
- Parents: the skills panel shows the level word plus "ustalik m".
- Other strands keep level-5 content for now; their mastery is still tracked and shown to parents.

## One adaptation layer (Phase 22)

```text
birth date (Tashkent day) → childAge
        ↓
ageProfile(age)            domain/adaptive/ageProfile.ts — the only age table:
        ↓                  band, visual maturity, default help, words, narration,
        ↓                  density, prior level/mastery, placement offered
visual maturity            AgeTheme (data-band), AppIcon, CoachMarks voice
        ↓
strand level + mastery     domain/learner/profile.ts — starts at the prior or a
        ↑                  placement, then two runs in a row move it (no ceiling)
evidence                   runs (independent share), hints, mistakes, reviews
        ↓
adaptivePlan / useContentTier(strand)   what a screen shows
```

- Screens never compare ages: Learn sections and letter games ask `useContentTier(strand)` (level 1 → tier 4,
  2 → 5, 3+ → 6; a guest keeps tier 6). Their finished runs are reported at the strand's level
  (`atCurrentLevel`), so a strong learner's items grow and a struggling one's ease, two runs at a time.
  `useAgeLevel` is left only for age suggestions, today's plan and the look; `centralized.test.ts` keeps it so.
- Placement (`domain/learner/placement.ts`): a new learner from 7 (`AgeProfile.placement`) starts the Math
  Lab with fixed items, easy to hard (levels 2, 4, 5, 5 + mastery 2). An item not answered on their own
  ("Hali bilmayman", wrong, hinted) gets a second item of the same step (two such chances in all, six items
  at most); a step missed twice ends it. Start: 1 / 3 / 4 / 5 / 5 + mastery 2. Neutral words, no level chip,
  no score; written once (`placeStrand`), deterministic (fixed items and seeds); held from the first run.
  Older learners at levels 1–2 get counting and adding, not the basket game (`noDrag`).
- Age is never taken for mastery: `priorMastery` is 0 at every age; steps above level 5 are earned.
- Tier runs (`atCurrentLevel`): practice runs of Learn sections and the choice/memory games move their
  strand only up to level 3 (tier 6 is the top young tier) and never mastery; learn-mode sessions, tracing
  and the exam are not tier evidence.
- The `placed` flag lives with the strands in the local universe store (strands are not cloud-synced).
- A birthday changes the band and look only; strands with two or more runs (or a placement) keep their
  level and mastery (`ageTransition.test.tsx`).
