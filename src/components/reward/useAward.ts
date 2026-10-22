import { getAward, useUniverseStore, type AwardSummary } from '@/domain/universe'
import { useChildKey } from '@/store/progressStore'

/** What a finished run earned in the universe (null: not counted, or too old). */
export function useAward(activityId: string | undefined): AwardSummary | null {
  const childKey = useChildKey()
  // re-read when the child's universe changes (the run is counted synchronously on finish)
  useUniverseStore((state) => state.byChild[childKey]?.awards)
  return activityId ? getAward(activityId, childKey) : null
}
