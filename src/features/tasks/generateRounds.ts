import type { LetterEntry } from '@/content/alphabet'
import { shuffle, type RandomSource } from '@/lib/random'
import { ROUNDS_PER_TASK } from './rules'

export type PlayableTaskType = 'find-letter' | 'find-picture'

export const PLAYABLE_TASK_TYPES: readonly PlayableTaskType[] = ['find-letter', 'find-picture']

export function isPlayableTaskType(value: unknown): value is PlayableTaskType {
  return typeof value === 'string' && (PLAYABLE_TASK_TYPES as readonly string[]).includes(value)
}

export interface TaskRound {
  target: LetterEntry
  options: LetterEntry[]
}

export interface LearnerState {
  learned: readonly string[]
  struggles: Readonly<Record<string, number>>
}

const OPTION_COUNT: Record<PlayableTaskType, number> = { 'find-letter': 4, 'find-picture': 3 }
/** Struggled letters come back first, but never take over a whole task. */
const MAX_STRUGGLE_ROUNDS = 2
/** New letters are introduced from a small window, in alphabet order. */
const NEW_LETTER_WINDOW = 6

/**
 * Picks which letters to practise: letters the child struggled with first,
 * then the next new letters in alphabet order, then a mix of known ones.
 */
export function pickTargets(
  letters: readonly LetterEntry[],
  learner: LearnerState,
  count: number,
  random: RandomSource,
): LetterEntry[] {
  const byId = new Map(letters.map((letter) => [letter.id, letter]))
  const chosen = new Map<string, LetterEntry>()
  const take = (candidates: readonly LetterEntry[], limit: number) => {
    for (const letter of candidates) {
      if (chosen.size >= count || limit <= 0) return
      if (!chosen.has(letter.id)) {
        chosen.set(letter.id, letter)
        limit -= 1
      }
    }
  }

  const struggled = Object.entries(learner.struggles)
    .filter(([, mistakes]) => mistakes > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => byId.get(id))
    .filter((letter): letter is LetterEntry => letter !== undefined)
  take(struggled, MAX_STRUGGLE_ROUNDS)

  const learned = new Set(learner.learned)
  const fresh = letters.filter((letter) => !learned.has(letter.id)).slice(0, NEW_LETTER_WINDOW)
  take(shuffle(fresh, random), count)
  take(shuffle(letters, random), count)

  return shuffle([...chosen.values()], random)
}

function canBeDistractor(type: PlayableTaskType, target: LetterEntry, other: LetterEntry): boolean {
  if (other.id === target.id) return false
  if (type === 'find-letter') return true
  // A picture is only wrong if its word really lacks the letter (and looks different).
  return !other.word.toLocaleLowerCase().includes(target.lower) && other.emoji !== target.emoji
}

export function buildRound(
  type: PlayableTaskType,
  target: LetterEntry,
  letters: readonly LetterEntry[],
  random: RandomSource,
): TaskRound {
  const distractors = shuffle(
    letters.filter((letter) => canBeDistractor(type, target, letter)),
    random,
  ).slice(0, OPTION_COUNT[type] - 1)
  return { target, options: shuffle([target, ...distractors], random) }
}

export function generateRounds(
  type: PlayableTaskType,
  letters: readonly LetterEntry[],
  learner: LearnerState,
  random: RandomSource = Math.random,
  count: number = ROUNDS_PER_TASK,
): TaskRound[] {
  return pickTargets(letters, learner, count, random).map((target) =>
    buildRound(type, target, letters, random),
  )
}
