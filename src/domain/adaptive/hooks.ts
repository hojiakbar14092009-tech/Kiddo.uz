import { useMemo, useState } from 'react'
import { useChildMemory } from '@/domain/learningMemory'
import { EMPTY_UNIVERSE_CHILD, useUniverseStore } from '@/domain/universe/store'
import type { Strand } from '@/domain/universe/types'
import { childAge, useActiveChild } from '@/store/familyStore'
import { useChildKey } from '@/store/progressStore'
import { useChallengeLevel } from '@/domain/learner/hooks'
import { adaptivePlan, skillsOf, type AdaptivePlan } from './adaptive'
import { contentTier, GUEST_TIER, type ContentTier } from './ageProfile'

/**
 * The adaptive plan of one child for one strand. The clock is read once when
 * the screen opens, so a plan stays the same while it is shown.
 */
export function useChildPlan(
  childKey: string,
  age: number | null,
  strand: Strand,
  namespace: string,
): AdaptivePlan {
  const child = useUniverseStore((s) => s.byChild[childKey] ?? EMPTY_UNIVERSE_CHILD)
  const memory = useChildMemory(childKey)
  const [now] = useState(() => new Date().toISOString())
  const state = child.strands?.[strand]
  const recent = child.recent
  return useMemo(
    () =>
      adaptivePlan({
        age,
        strand: state,
        skills: skillsOf(memory.skills, namespace),
        now,
        recent: (recent ?? []).filter((run) => run.strand === strand),
      }),
    [age, state, memory.skills, namespace, now, recent, strand],
  )
}

/** The adaptive plan of the active child (Math Lab and later sections). */
export function useAdaptivePlan(strand: Strand, namespace: string): AdaptivePlan {
  const childKey = useChildKey()
  const child = useActiveChild()
  return useChildPlan(childKey, child ? childAge(child) : null, strand, namespace)
}

/**
 * The content tier of a strand for the active child (the one resolver every
 * learning screen asks, instead of its own age rule): the strand's level,
 * which starts at the age prior or a placement and then follows mastery.
 */
export function useContentTier(strand: Strand): ContentTier {
  const child = useActiveChild()
  const level = useChallengeLevel(strand)
  return child ? contentTier(level) : GUEST_TIER
}
