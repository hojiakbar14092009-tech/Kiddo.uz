import { useMemo } from 'react'
import { EMPTY_UNIVERSE_CHILD, useUniverseStore } from '@/domain/universe/store'
import { EMPTY_LEARN_CHILD, useLearnStore } from '@/features/learn/learnStore'
import { childAge, type ChildProfile } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { dayKey } from '@/features/tasks/rules'
import {
  collectRuns,
  dateOfDay,
  healthyPlay,
  medalsAndCity,
  skillRows,
  strengths,
  suggestions,
  weekSummary,
} from './insights'

/** Everything the insight panels show for one child (the selected one, not the active one). */
export function useChildInsights(child: ChildProfile) {
  const progress = useProgress(child.id)
  const learn = useLearnStore((state) => state.byChild[child.id] ?? EMPTY_LEARN_CHILD)
  const universe = useUniverseStore((state) => state.byChild[child.id] ?? EMPTY_UNIVERSE_CHILD)
  const age = childAge(child)
  // the live local day, as the Today panel reads it (a new day shows on the next render)
  const today = dayKey()

  return useMemo(() => {
    const now = dateOfDay(today)
    const runs = collectRuns(child.id, { progress, learn, recent: universe.recent })
    const week = weekSummary(
      {
        minutesByDay: progress.minutesByDay,
        runs,
        ledger: universe.ledger.entries,
        results: progress.results,
      },
      now,
    )
    const skills = skillRows({
      strands: universe.strands,
      byStrand: universe.stats.byStrand,
      runs,
      age,
    })
    const ideas = suggestions(
      { rows: skills.active, untouched: skills.untouched, mistakes: universe.mistakes },
      now,
    )
    return {
      runs,
      week,
      skills,
      suggestions: ideas,
      // a strand to practise is never listed as a strength at the same time
      strengths: strengths(
        skills.active,
        ideas.map((item) => item.strand),
      ),
      health: healthyPlay(week.days),
      medals: medalsAndCity(universe),
    }
  }, [child.id, progress, learn, universe, age, today])
}

export type ChildInsights = ReturnType<typeof useChildInsights>
