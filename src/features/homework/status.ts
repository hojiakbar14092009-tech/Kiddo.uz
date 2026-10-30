import type { RecentRun } from '@/domain/universe/history'
import { isActivityHomework, type Homework } from '@/store/familyStore'

/*
 * Homework status (Phase 23, full contract) for the parent and the child:
 * Assigned → Started → Completed, or "Needs more practice" when it was done
 * but with a lot of help or mistakes — a kind suggestion, never a mark.
 * Derived from what is already stored (deterministic, nothing new saved).
 */

export type HomeworkStatus = 'assigned' | 'started' | 'completed' | 'practice'

/** Fewer independent answers than this share of the questions: more practice helps. */
export const PRACTICE_BELOW = 0.6
/** A letter homework with this many mistakes per letter (or more): more practice helps. */
export const PRACTICE_MISTAKES_PER_LETTER = 1

export function homeworkStatus(
  homework: Homework,
  /** The child's recent finished runs (universe), to see how the counted runs went. */
  recent: readonly RecentRun[] = [],
): HomeworkStatus {
  if (isActivityHomework(homework)) {
    if (!homework.completedAt) return homework.runs.length > 0 ? 'started' : 'assigned'
    // kept on the homework when it was played (stays the same on every later day);
    // older homework falls back to the recent runs
    let { independent, total } = homework.score ?? { independent: 0, total: 0 }
    if (!homework.score) {
      for (const run of recent) {
        if (!homework.runs.includes(run.id)) continue
        independent += run.independent
        total += run.total
      }
    }
    if (total === 0) return 'completed'
    return independent / total < PRACTICE_BELOW ? 'practice' : 'completed'
  }
  if (!homework.completedAt) return 'assigned'
  // mistakes per letter asked: one or more slips per letter on average, more practice helps
  const letters = Math.max(1, homework.letterIds.length)
  return (homework.mistakes ?? 0) / letters >= PRACTICE_MISTAKES_PER_LETTER
    ? 'practice'
    : 'completed'
}
