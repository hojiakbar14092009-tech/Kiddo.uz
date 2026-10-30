import type { Strand } from '@/domain/universe/types'
import type { PlayedRun } from '../insights/insights'
import { dayKey } from '@/features/tasks/rules'

/*
 * The numbers behind the Parent Center first view (pure, deterministic):
 * today's activities of every kind, what the child is learning *now* (the
 * last two weeks), and what really got stronger (recent first answers
 * compared with the child's own earlier ones — never with other children).
 */

/** "Now" is the last two weeks. */
export const RECENT_DAYS = 14
/** At least this many answers on each side before a change is called a change. */
export const MIN_ANSWERS = 5
/** A rise of this share of first answers right (or more) counts as getting stronger. */
export const STRONGER_BY = 0.1

const DAY_MS = 86_400_000

/** Activities of every kind finished on the local day `today` (YYYY-MM-DD). */
export function runsOnDay(runs: readonly PlayedRun[], today: string): number {
  return runs.filter((run) => dayKey(new Date(run.at)) === today).length
}

/** The areas played most in the last two weeks, most first (none: not enough recent play). */
export function learningNow(runs: readonly PlayedRun[], now: Date, limit = 3): Strand[] {
  const since = now.getTime() - RECENT_DAYS * DAY_MS
  const counts = new Map<Strand, number>()
  for (const run of runs) {
    if (new Date(run.at).getTime() < since) continue
    counts.set(run.strand, (counts.get(run.strand) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([strand]) => strand)
}

/**
 * Areas whose first answers (right without help) rose in the last two weeks
 * compared with before, with enough answers on both sides.
 */
export function gettingStronger(runs: readonly PlayedRun[], now: Date, limit = 3): Strand[] {
  const since = now.getTime() - RECENT_DAYS * DAY_MS
  const sums = new Map<Strand, { recent: [number, number]; earlier: [number, number] }>()
  for (const run of runs) {
    if (run.total <= 0) continue
    const entry = sums.get(run.strand) ?? { recent: [0, 0], earlier: [0, 0] }
    const side = new Date(run.at).getTime() >= since ? entry.recent : entry.earlier
    side[0] += run.independent
    side[1] += run.total
    sums.set(run.strand, entry)
  }
  return [...sums.entries()]
    .filter(([, { recent, earlier }]) => recent[1] >= MIN_ANSWERS && earlier[1] >= MIN_ANSWERS)
    .map(([strand, { recent, earlier }]) => ({
      strand,
      rise: recent[0] / recent[1] - earlier[0] / earlier[1],
    }))
    .filter((item) => item.rise >= STRONGER_BY)
    .sort((a, b) => b.rise - a.rise)
    .slice(0, limit)
    .map((item) => item.strand)
}
