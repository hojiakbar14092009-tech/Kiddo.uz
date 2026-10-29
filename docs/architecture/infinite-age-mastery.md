# Infinite age and open-ended mastery (Phase 22)

## No maximum age

- The birth date is the only age source (`familyStore` → `childAge`). A profile can be added for any learner
  from 4 years old; there is no upper limit (`isAllowedBirthDate`: a real date, on or after
  `EARLIEST_BIRTH_DATE` = 1900-01-01 only to catch typing errors, and at least 4 years ago).
- Age shapes presentation (age bands in `domain/adaptive`: 4-6, 7-9, 10-12, 13-15, 16+) and where a strand
  starts; it never caps what can be learned.

## Mastery above level 5 (`domain/learner/profile.ts`)

- Every strand keeps its challenge level 1–5. At level 5 a strand also has `mastery` (0, 1, 2, …, no ceiling).
- Two strong runs in a row at level 5 → one mastery step up. Two weak runs in a row → one mastery step down
  first; only at mastery 0 does the level go down. Below level 5 mastery is always 0.
- Start (until two runs have been played): `startMastery(age)` — under 12: 0, 12–14: 1, 15–17: 2, 18+: 3, only
  when the age also starts the strand at level 5. Then the learner's own answers decide, both ways.
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
