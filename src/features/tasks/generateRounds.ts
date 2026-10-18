import type { LetterEntry } from '@/content/alphabet'
import { shuffle, type RandomSource } from '@/lib/random'
import type { ChoiceGameType } from './games'
import { ROUNDS_PER_TASK } from './rules'

export interface TaskRound {
  target: LetterEntry
  options: LetterEntry[]
}

export interface LearnerState {
  learned: readonly string[]
  struggles: Readonly<Record<string, number>>
  /** Letters that must be practised this time, e.g. homework set by a parent. */
  focus?: readonly string[]
}

const OPTION_COUNT: Record<ChoiceGameType, number> = { 'find-letter': 4, 'find-picture': 3 }
/** Struggled letters come back first, but never take over a whole task. */
const MAX_STRUGGLE_ROUNDS = 2
/** New letters are introduced from a small window, in alphabet order. */
const NEW_LETTER_WINDOW = 6

/**
 * Picks which letters to practise: homework letters always, then letters the child struggled with,
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

  const focus = (learner.focus ?? [])
    .map((id) => byId.get(id))
    .filter((letter): letter is LetterEntry => letter !== undefined)
  take(focus, count)
  const focusCount = chosen.size

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

  // Homework letters come first, so the child meets them while still fresh.
  const picked = [...chosen.values()]
  return [
    ...shuffle(picked.slice(0, focusCount), random),
    ...shuffle(picked.slice(focusCount), random),
  ]
}

function canBeDistractor(type: ChoiceGameType, target: LetterEntry, other: LetterEntry): boolean {
  if (other.id === target.id) return false
  if (type === 'find-letter') return true
  // A picture is only wrong if its word really lacks the letter (and looks different).
  return !other.word.toLocaleLowerCase().includes(target.lower) && other.emoji !== target.emoji
}

export function buildRound(
  type: ChoiceGameType,
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
  type: ChoiceGameType,
  letters: readonly LetterEntry[],
  learner: LearnerState,
  random: RandomSource = Math.random,
  count: number = ROUNDS_PER_TASK,
): TaskRound[] {
  return pickTargets(letters, learner, count, random).map((target) =>
    buildRound(type, target, letters, random),
  )
}
