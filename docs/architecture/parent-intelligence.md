# Parent Intelligence (Phase 35)

The first view of the parent report (`features/parent/dashboard/GlanceSection.tsx`) answers a parent's everyday
questions in plain words, from the child's own data only, each child against their own past.

## Cards, in order

1. **My child**: avatar, name and age.
2. **Today**: activities finished today and minutes against the daily limit.
3. **Learning now** (`glance-learning`): the strands the child is practising.
4. **Getting stronger** (`glance-stronger`): strands whose evidence is climbing.
5. **Recently mastered** (`glance-mastered`, links to `#memory`): `recentlyMastered()` in `glance.ts`. It reuses
   the learning memory's own parent summary (`memorySummary(skills, now, 14).improved`): a difficulty that came
   right with practice (`resolved`), or a skill mastered (`masteredAt`), in the last 14 days. A skill whose
   mistake came back (`confirmed` / `improving` again, after `forgetStale`) is never listed. Labels are the
   parent skill names (`parentSkillNameKey`), de-duplicated, so two maths skills of one family show as one line,
   and a name still being practised (`needsPractice`) is not also listed (as in the memory panel). Damaged saved
   entries are skipped (`isUsableMemory`, shared with the garden).
6. **Needs practice**.
7. **Homework**.
8. **Practice garden** (`glance-garden`): the Mistake Garden counts (growing / in bloom) from `useGarden`.
9. **Achievements**.
10. **Activity trend** (`glance-trend`, links to `#this-week`): `activityTrend(runs, now)` counts **active days**
    in the last 7 days and in the 7 days before (rolling windows, not calendar weeks). A direction
    (more / same / less) is named only when both windows have play and there are at least `MIN_TREND_DAYS` (3)
    active days in total; otherwise the card says a trend appears once there are two weeks of play to compare. Nothing is extrapolated.
11. **History**.

## Rules

- No invented numbers: every card reads stored runs, the learning memory or the garden; empty states say what
  will appear and when.
- Positive, neutral language; no medical or psychological claims; no ranking against other children.
- Multi-child: everything is read by the selected child's id (memory `byChild`, garden by child, runs by child
  key), so switching children switches every card (tested in `intelligence.test.tsx`).
- UZ / RU / EN under `parent.glance.*`; no plural keys (the typed uz reference has none), so wording avoids
  counted nouns.

## Weekly report (Phase 47)

`features/parent/weekly/WeeklyReportPanel.tsx` (`weekly-report`, right after the first view) sums up the last
seven local days (the same rolling window as `lastSevenDays` and the week panel) in a few plain lines, with
**Share** (`navigator.share`, hidden where the browser has none) and **Copy** (`navigator.clipboard`; "Copied" in
a `role="status"` line, an error message when copying fails, never a fake success).

- `weeklyReport(input, now)` (`weekly/weeklyReport.ts`) is pure and builds only on the dashboard's selectors:
  `weekSummary` (active days 0–7, minutes, activities finished), `recentlyMastered(…, 7)` (names by
  `parentSkillNameKey`, one per name, never one being practised again), `strengths()` (up to 3), things to
  practise (up to 3: `strugglingLetters`, then `suggestions()` skill / strand ideas, then the memory's
  `needsPractice`) and homework set or finished this week (done / assigned via `homeworkStatus`, `null` when
  none). The trend (`weeklyTrend`) counts active days (minutes or a finished run) over the same seven calendar
  days against the seven before, with the `MIN_TREND_DAYS` rule, so it always agrees with the active days.
  Absent data leaves fields empty; `empty` is set when nothing was played or timed.
- Strengths and things to practise come from all of the child's data, not only these seven days, so they are
  labelled as such ("Generally doing well in", "Next to practise"), not as this week's results.
- Copy / share outcomes are kept with the text they were about: another child (the panel is also keyed by
  child id), a new day or another language shows no stale "Copied", and a late result for older text is
  ignored. When copying fails, the message text is opened for selecting by hand.
- `weeklyReportText(t, child, report)` is the short message (at most seven lines, "in the last 7 days") in the current UI language:
  first name only (no surname, no photo), positive and neutral, no ranking against other children, no medical
  claims. Keys live under `parent.weekly.*` (no plural keys).
- The Telegram bot (planned Phase 56) will send `weeklyReportText` from a server function, built from the
  child's own synced data with the same selectors, and only to chats linked to the child's parent account.
