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
