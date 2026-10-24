import { HINT, type LearningOutcome } from '@/domain/learning'
import type { ChoiceGameType } from './games'

/*
 * Evidence adapter of the letter games (Phase 17): one solved round of "Find
 * the letter" or "Find the picture" (also the alphabet test, which plays the
 * same rounds) becomes one normalized outcome. All letters fold into one
 * skill per game; a wrong tap is `wrong-letter` (or `wrong-initial`), with no
 * guess about the reason. The right card glows after two wrong taps: that
 * round was solved with a strong scaffold.
 */

export const GLOW_AFTER_MISTAKES = 2

const SKILL: Record<ChoiceGameType, string> = {
  'find-letter': 'language:letter-recognition',
  'find-picture': 'language:first-sound',
}

/**
 * Only what the round shows for sure: the wrong letter (or picture) was
 * picked. No claim about why (cards show capitals; the same letter ids
 * stand for different glyphs in other alphabets).
 */
export function letterErrorCode(type: ChoiceGameType): string {
  return type === 'find-picture' ? 'wrong-initial' : 'wrong-letter'
}

/** A solved round: its target, the wrong taps before the right one, the run and round index. */
export function roundOutcome(
  type: ChoiceGameType,
  round: { sessionId: string; index: number; targetId: string; wrongIds: readonly string[] },
  at: string,
): LearningOutcome {
  const misses = round.wrongIds.length
  return {
    skill: SKILL[type],
    sessionId: round.sessionId,
    questionId: `${round.index}`,
    item: `${type}|${round.targetId}`,
    firstTry: misses === 0,
    helpedBefore: false,
    errors: round.wrongIds.length > 0 ? [letterErrorCode(type)] : [],
    hint: misses >= GLOW_AFTER_MISTAKES ? HINT.scaffold : HINT.none,
    at,
  }
}
