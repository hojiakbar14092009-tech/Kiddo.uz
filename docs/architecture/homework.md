# Homework and Parent Center 2.0 (Phase 23)

## Homework kinds (one list per child: `ChildProfile.homeworks`)

- **Letters** (`LetterHomework`, `kind` missing or `'letters'`): up to five letters through one letter game, as
  before; counted by the game (`completeHomework`, mistakes kept for the report).
- **Activity** (`ActivityHomework`, `kind: 'activity'`): any free learning activity from
  `features/homework/activityHomework.ts` (`HOMEWORK_ACTIVITIES`: Math Lab, math lessons, words, tales, stories,
  Koinot, garden, help, Dino quiz and dig, Uzbekistan map and dasturxon, feelings), 1–5 times, an optional day
  and a short note (≤ 120 characters) for the child.

## Counting

- `HomeworkBridge` (mounted in `AppShell`) listens to the `activity.completed` domain event and calls
  `recordHomeworkRun(childKey, runId, activity)`.
- A run counts when `activityName(activity)` is the homework's target (the feelings games all count for
  "Feelings"); each run id counts once (`runs`), so reloads, double events and other tabs never double it; a
  finished homework never changes again. Other children are never touched.
- A late day is never a punishment: the parent sees "the day has passed", the child still can do it.

## Screens

- Child home: letter homework cards, then activity homework cards (name, a dot per time, the parent's word;
  one tap opens the activity).
- Parent → Homework: the list shows both kinds (activity: progress x / y, by date, late note, the note);
  "Activity homework" panel to give one.
- Parent → Report: with two or more children, "The family at a glance" (each child's runs and stars today,
  open homework and late ones; the chosen child is marked). A run finished in another tab or while the app was
  closed is counted when the app opens again (`reconcileHomework`, by run id, never a run from before the
  homework was given).

Tests: `features/homework/homework.test.tsx`, `e2e/homework.spec.ts`.
