# Adaptive learning (Phase 15)

`src/domain/adaptive` – the AdaptiveLearningService: a pure, deterministic
function `adaptivePlan({ age, strand, skills, now }) → AdaptivePlan`. No store,
no React, no AI, no network. It reuses the Phase 5 learner level and the
Phase 10 learning memory; there is no second mastery model.

## Inputs → outputs

| Input (evidence)                                                              | Source                                    |
| ----------------------------------------------------------------------------- | ----------------------------------------- |
| challenge level, runs, independent / total answers                            | universe child `strands` (domain/learner) |
| the strand's latest 5 runs (first tries vs retries)                           | universe child `recent`                   |
| mastery (the mastered list), misconceptions (observed → confirmed → resolved) | learning memory per skill                 |
| hint levels of recent questions (hint dependency)                             | learning memory `hintsRecent`             |
| due and upcoming reviews                                                      | learning memory review schedule           |
| age                                                                           | the profile (presentation guidance only)  |

| Output                                                                                                     | Used by                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `level` (complexity 1–5), `numberMax`                                                                      | Math Lab questions (the level picks the generators)                |
| `options` (3–4 answer cards; never 2, a guess would count as knowing)                                      | Math Lab `planSession(…, { options })`                             |
| `hints`: `step-by-step` or `picture-first`                                                                 | Math Lab: the first mistake shows the picture step                 |
| `reviews` (≤ 2 from level 3, else 1): due reviews, then one exercise of a confirmed difficulty not due yet | retrieval and targeted practice inside the session                 |
| `aids`, `vocabulary`, `explanation`, `sessionLength`                                                       | plan data only (explanations follow the level's band in the tutor) |
| `focus`, `mastered`, `reviewSoon`, `reasons`                                                               | parent report "Learning focus"                                     |

## Rules

- **Age bands** 4–6, 7–9, 10–12, 13–15, 16+: the starting level (4→1, 5→2, 6→3,
  7–9→4, 10+→5) and the default presentation (pictures, words). Never a ceiling:
  the form takes children 4 to 18 (synced age up to 25, 0012); every game is
  open from age 6 on.
- **Mastery overrides age**: after two runs the level comes from the child's
  runs, not the age. The presentation follows evidence gradually: the answers
  weigh `total/20`; below 0.25 the band alone shapes it. With evidence, an
  independent share < 50 % in the latest 5 runs starts hints with the picture
  and uses 3 cards from level 3; ≥ 85 % is "strong" (two such sessions open
  the next level). The plan is fixed for a whole session.
- **Hint dependency**: answers found with help never count as independent; when
  half of the recent questions needed a hint, hints start with the picture.
- **Mistake memory**: a confirmed or improving misconception is the focus and
  brings the pictures back (at least partial); its spaced review is a question
  of the session (retrieval practice), never above today's level.
- **Privacy and tone**: the plan names skills and reasons, never traits; no
  sensitive inference; device-local. Copy for the child never mentions
  difficulty; the parent copy explains reasons in plain words.
- **Rewards**: adaptation publishes `adaptation.updated { strand, from, to }`
  on the universe bus and pays nothing (rewards stay with the universe rules).

Tests: `adaptive.test.ts` (cases A–G), `adaptationEvent.test.ts`, Math Lab
generator shape tests, `MathLabTutor.test.tsx` (picture-first), `FocusPanel.test.tsx`,
`e2e/adaptive.spec.ts` (a ten-year-old: profile, parent focus, Math Lab level 5).

Not yet: the other sections (words, garden, stories) still use their own
level rules; vocabulary and explanation depth are planned but only Math Lab's
cards, hints and reviews consume the plan today.
