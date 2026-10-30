import { RUNG_ITEM, type PlacementRung } from '@/domain/learner'
import { seeded } from '@/features/learn/random'
import { makeQuestion, type LabQuestion } from './generators'

/*
 * The Math Lab items of a placement (domain/learner/placement): one fixed item
 * per rung, made with a fixed seed, so every learner sees the same short probe
 * and the same answers always place the same (no randomness).
 */

/** Which kind of the rung's level plan is asked (never the basket drag). */
const RUNG_INDEX: Record<PlacementRung, number> = {
  easy: 1, // level 2: adding within 10, with pictures
  medium: 2, // level 4: a missing number within 20
  hard: 1, // level 5: two steps
  stretch: 0, // level 5, mastery 2: bigger numbers
}

const RUNG_SEED: Record<PlacementRung, number> = {
  easy: 2201,
  medium: 2202,
  hard: 2203,
  stretch: 2204,
}

/** A second chance on a rung asks another kind of the same level (never the same item). */
const SECOND_INDEX: Record<PlacementRung, number> = {
  easy: 2, // level 2: taking away within 10
  medium: 3, // level 4: a missing number in a subtraction
  hard: 3, // level 5: a missing number
  stretch: 1, // level 5, mastery 2: another big-number item
}

export function placementQuestion(rung: PlacementRung, attempt = 0): LabQuestion {
  const { level, mastery } = RUNG_ITEM[rung]
  return makeQuestion(
    level,
    attempt === 0 ? RUNG_INDEX[rung] : SECOND_INDEX[rung],
    seeded(RUNG_SEED[rung] + attempt * 100),
    new Set(),
    undefined,
    mastery,
  )
}
