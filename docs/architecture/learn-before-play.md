# Learn Before Play (Phase 21)

Rule: a child is never asked about something Kiddo has not shown first.

## Where teaching comes from

| Activity                                                  | How it teaches first                                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learn sections (words, math, Koinot, tales, garden, help) | Learn mode by stages; tests ask only `stages` already taught (learnStore, unchanged).                                                                                                                                                                                  |
| Letter games (find the letter / picture, memory)          | A letter the child has neither learned nor met gets a "new letter" card (`letter-intro`) before its first question (memory: before the cards are dealt). Such a letter counts as helped, not learned, in that run.                                                     |
| Alphabet (`/alphabet/:id`)                                | Opening a letter counts as meeting it (`letter.<lang>.<id>`).                                                                                                                                                                                                          |
| Dino quiz and fossil dig                                  | One lesson deck (`dino.animals`): each animal's food, facts, body parts and the bone a dig finds; then who was longest.                                                                                                                                                |
| My Uzbekistan: map                                        | Lesson deck: the labelled map, then each city on the map with its clue.                                                                                                                                                                                                |
| My Uzbekistan: dasturxon                                  | Lesson deck: each food and its group (fruit, tandir, dish, drink), and what is not food.                                                                                                                                                                               |
| My Uzbekistan: patterns                                   | Lesson deck: how a border repeats, then each motif by name.                                                                                                                                                                                                            |
| Science Lab                                               | Lesson deck: water, light, seed, seedling → flower (exactly what the experiment asks).                                                                                                                                                                                 |
| Stories                                                   | The story is read first; its questions come after it.                                                                                                                                                                                                                  |
| Math Lab                                                  | A skill met for the first time (e.g. `add:within10`, `compare`) gets a worked example of another item of that skill (scene, picture help, explanation, answer) before the child answers on their own (`math.<skill>`). Reviews from the garden are skills already met. |
| Exam                                                      | Opens only after the letters are learned (`isFinalTestUnlocked`); it never introduces letters.                                                                                                                                                                         |

Only the letter asked about must have been met: the other answer cards of a find-the-letter round may be
letters the child has not met yet (they are not being asked).

## Pieces

- `domain/learning/lessons.ts`: the registry (`ACTIVITY_LESSONS`, `letterLessonId`).
- `learnStore.markLesson` / `hasSeenLesson` / `useLessonSeen`: seen lessons per child, stored beside the taught
  stages under the key `lessons` (no new store, no migration; child profiles stay isolated).
- `features/learn/LessonDeck.tsx`: one card at a time, ≥ 44 px buttons, the speaker reads the card, StepDots,
  back/next, the last card starts the game and records the lesson.
- Every lesson can be opened again ("Yana o‘rganish" / `lesson-review`): on the start card where a game has one
  (Dino quiz and dig, Science Lab), otherwise on the result screen (My Uzbekistan games).
- A new card moves focus to its title (screen readers read it); the letter card focuses its button and, after it,
  focus moves to the answers.

Tests: `features/learn/lessons.test.tsx`; e2e helpers `e2e/lesson.ts` (`passLesson`, `passLessonIfShown`,
`meetNewLetter`).
