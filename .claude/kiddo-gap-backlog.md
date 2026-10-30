# Contract gap backlog (Phases 20–29 vs .claude/kiddo-contract-phase20-36.md)

Audit 2026-10-30 after the full contract was restored. Fix before the Phase 36 release gate.
Status per line: OPEN / DONE <commit>.

## P20 — compliant (10 codes + tests, demo indicator, TTS free in demo, Pro UI hidden).

## P21 Learn before play

- DONE (P21 commit) 2 Opening = completing: LetterPage marks met on open (useEffect); LessonDeck/Math intro mark on plain next. Need a meaningful interaction.
- DONE (P21 commit) 11 Feelings `/feelings/:kind` quizzes before teaching (FeelingsRun) → LessonDeck first.
- OPEN 3 No prerequisite routing: RequireAge/GamePage silently Navigate home → explain + "learn first".
- OPEN 1 LessonDefinition contract + step types (explain/show/listen/trace/guided-choice/assessment); lessons.ts only ids.
- OPEN 5 LetterIntro: add sound button + short trace step.
- OPEN 8 Dino: era + habitat not taught.
- OPEN 9 Uzbekistan: partial-labels tier, tap-region → spoken name.
- OPEN 10 Stories vocabulary step; Science Lab predict → observe step.
- OPEN 7 Vocabulary recall step; OPEN 6 Writing lines→curves→letters→words sets.

## P22 Age + mastery

- DONE (P22 age-locks commit) 4 No age locks: games, numbers 1–10, exam (mastery only), tales open at any age; age = calm "N yoshdan tavsiya"; birthday = new suggestions (gift, not padlock); parents may assign any game.
- OPEN 18 Representative profile tests (4, 6 strong, 8, 11, 14 new, 17 exp.) + birthday band change preserves progress.
- DONE (P22 tashkent commit) 16 Ages count by the Tashkent day (store, ChildForm, birthday, server agree); 29 Feb turns older on the 28th in non-leap years; shared isLeapYear.
- OPEN 13 AGE_BANDS '4-6' → '3-4','5-6' (min age 4 is product decision).
- OPEN 12 Learn sections use useAgeLevel `level === N` branches (17 sites), 14-year-old capped at level 6 → resolver.
- OPEN 14 Visual maturity separate from difficulty (AgeTheme only 4/5/6; 16+ gets preschool theme).
- OPEN 15 Older new user placement probe.
- OPEN 17 Mastery content tiers beyond Math Lab.

## P23 Parent center + homework

- DONE (P23 commit) 5 Homework statuses Assigned/Started/Completed/Needs more practice.
- DONE (P23 commit) 6 Planet homework: topic + lesson→practice→assessment, count only that.
- DONE (P23 commit) 10 E2E: parent→A planet homework→A completes→parent sees→B unaffected.
- DONE (P23 glance commit) 9 Parent first view sections (Farzandim, Bugungi holat, O‘rganayotgan mavzular, Kuchayib borayotgan, Mashq kerak, Uyga vazifalar, Yutuqlar, Faoliyat tarixi).
- DONE 7 Registry: findLetter/findPicture/traceLetters/traceNumbers (+ garden as science; Science Lab unlocks on the journey so it is not offered). DONE 8 letter groups (next/practice/vowels). DEFERRED pronunciation: no speaking game exists to build it on.

## P24 Profile + birthday

- OPEN 11 Photo: extension check, min/max dimensions; crop/reposition.
- OPEN 12 Curated BIRTHDAY_ELIGIBLE pet subset.

## P25 Onboarding

- DONE (P25 commit) 2 Per-profile onboarding count (full → minimal → none); currently global settings flag (§15).
- DONE (P25 commit) 1 Contextual coach marks on real UI (data-tour anchors: cards, lesson start, answer, back, coins, homework).
- DONE (P25 commit) 3 Age adaptation (young: voice/mascot; older: concise). OPEN 4 Use MascotFigure (3D) not 2D Robot.

## P26 Mascots

- OPEN 14 One heavy 3D mascot active per context (LanguagePage has two). OPEN 13 listening state wired.

## P27 Pets (contract: species-specific motion, preview, birthday registry, perf)

- DONE (see commit) Species motion (features/pets/motion.ts), off-screen pause (useInView), weak-device still.
- NOTE sprites are flat images: tail/ear/wing parts cannot move separately (transform-only motion).

## P28 World cards

- DONE (see commit) City building cards: config-driven architecture/light/ground scene per level (src/features/city/scene), named stages for 8 buildings, 1.2 s grow-in.

## P29 Sound

- DONE (see commit) Families back/confirm/levelUp/discovery; one AudioContext (synth on Howler.ctx); narration: small cues silent, taps/pets/clicks ducked; tap/back/pet throttles; data-sound="back" on home/back controls.
