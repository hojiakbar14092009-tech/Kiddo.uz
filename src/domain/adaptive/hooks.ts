import { useMemo, useState } from 'react'
import { useChildMemory } from '@/domain/learningMemory'
import { EMPTY_UNIVERSE_CHILD, useUniverseStore } from '@/domain/universe/store'
import type { Strand } from '@/domain/universe/types'
import { childAge, useActiveChild } from '@/store/familyStore'
import { useChildKey } from '@/store/progressStore'
import { adaptivePlan, skillsOf, type AdaptivePlan } from './adaptive'

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
