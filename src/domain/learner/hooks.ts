import { useActiveChild, childAge } from '@/store/familyStore'
import { useChildKey } from '@/store/progressStore'
import { useUniverseStore } from '@/domain/universe/store'
import type { Strand } from '@/domain/universe/types'
import { levelOf, masteryOf, type ChallengeLevel, type LearnerStrands } from './profile'

/** Challenge level 1–5 of the active child for one strand. */
export function useChallengeLevel(strand: Strand): ChallengeLevel {
  const childKey = useChildKey()
  const child = useActiveChild()
  const strands = useUniverseStore((s) => s.byChild[childKey]?.strands)
  return levelOf(strands, strand, child ? childAge(child) : null)
}

/** Mastery steps above level 5 of the active child for one strand (0 below it; no ceiling). */
export function useMastery(strand: Strand): number {
  const childKey = useChildKey()
  const child = useActiveChild()
  const strands = useUniverseStore((s) => s.byChild[childKey]?.strands)
  return masteryOf(strands, strand, child ? childAge(child) : null)
}

/** Every strand state of the active child (for the parent dashboard). */
export function useLearnerStrands(): LearnerStrands {
  const childKey = useChildKey()
  return useUniverseStore((s) => s.byChild[childKey]?.strands) ?? EMPTY
}

const EMPTY: LearnerStrands = Object.freeze({})

/** Non-hook read, for generators called inside actions. */
export function getChallengeLevel(
  childKey: string,
  strand: Strand,
  age: number | null,
): ChallengeLevel {
  return levelOf(useUniverseStore.getState().byChild[childKey]?.strands, strand, age)
}
