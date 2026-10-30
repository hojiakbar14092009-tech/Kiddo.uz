import type { ChallengeLevel } from '@/domain/learner/profile'
import { BASIC_FEELINGS, MORE_FEELINGS, type FeelingId } from './content'
import { contentTier, levelPlan, type ScoredKind } from './session'

/** Kind deeds, each drawn as itself (the same pictures as the game's ideas). */
export const KIND_DEEDS = [
  { id: 'share', picture: 'together' },
  // a friend fell: we go and help (the picture of the very deed)
  { id: 'help', picture: 'ask' },
  { id: 'words', picture: 'thank' },
] as const

/**
 * The feelings lesson of the child's level: every level adds feelings, and each
 * level has its own lesson, so new feelings are taught before they are asked.
 */
export function feelingsLessonId(kind: ScoredKind, level: ChallengeLevel): string {
  return kind === 'kindness' ? 'feelings.kindness' : `feelings.faces.${contentTier(kind, level)}`
}

/**
 * The feelings this level's lesson teaches: the ones new at this level — and,
 * for a child who never had the earlier lessons (started at a higher level),
 * the earlier feelings too, so nothing is asked that was not taught.
 */
export function feelingsToTeach(
  level: ChallengeLevel,
  /** Lesson ids the child has already passed. */
  passed: (lessonId: string) => boolean = () => false,
): readonly FeelingId[] {
  const all = levelPlan(level).feelings
  if (level <= 2) return all
  const known = new Set<FeelingId>()
  if (passed('feelings.faces.basic')) BASIC_FEELINGS.forEach((f) => known.add(f))
  if (level >= 4 && passed('feelings.faces.mid')) {
    BASIC_FEELINGS.forEach((f) => known.add(f))
    MORE_FEELINGS.forEach((f) => known.add(f))
  }
  return all.filter((feeling) => !known.has(feeling))
}
