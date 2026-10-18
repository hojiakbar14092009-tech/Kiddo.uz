import type { LetterEntry } from '@/content/alphabet'
import { shuffle, type RandomSource } from '@/lib/random'
import type { MistakeDetail } from '@/store/progressStore'

export interface MemoryCard {
  key: string
  letter: LetterEntry
  face: 'letter' | 'picture'
}

export interface MemoryState {
  cards: MemoryCard[]
  /** Indexes of face-up cards that are not matched yet (0–2). */
  open: number[]
  matched: string[]
  /** Cards the child has already looked at, to tell guessing from forgetting. */
  seen: number[]
  mistakes: MistakeDetail[]
}

export type MemoryAction = { type: 'flip'; index: number } | { type: 'hide' }

export type FlipResult = 'match' | 'mismatch' | 'first' | 'ignored'

export function createMemoryGame(
  letters: readonly LetterEntry[],
  random: RandomSource,
): MemoryState {
  const cards = letters.flatMap((letter): MemoryCard[] => [
    { key: `${letter.id}-letter`, letter, face: 'letter' },
    { key: `${letter.id}-picture`, letter, face: 'picture' },
  ])
  return { cards: shuffle(cards, random), open: [], matched: [], seen: [], mistakes: [] }
}

/** What flipping a card would do, without changing anything. */
export function judgeFlip(state: MemoryState, index: number): FlipResult {
  const card = state.cards[index]
  if (
    !card ||
    state.open.length >= 2 ||
    state.open.includes(index) ||
    state.matched.includes(card.letter.id)
  ) {
    return 'ignored'
  }
  if (state.open.length === 0) return 'first'
  const first = state.cards[state.open[0]!]!
  return first.letter.id === card.letter.id ? 'match' : 'mismatch'
}

export function isMemoryComplete(state: MemoryState): boolean {
  return state.matched.length * 2 === state.cards.length
}

/**
 * Flipping two cards that do not match is part of exploring. It only counts
 * as a mistake when both cards had already been seen, i.e. the child could
 * have remembered them.
 */
export function memoryReducer(state: MemoryState, action: MemoryAction): MemoryState {
  if (action.type === 'hide') return { ...state, open: [] }

  const verdict = judgeFlip(state, action.index)
  if (verdict === 'ignored') return state
  const seen = state.seen.includes(action.index) ? state.seen : [...state.seen, action.index]

  if (verdict === 'first') return { ...state, open: [action.index], seen }

  const firstIndex = state.open[0]!
  const first = state.cards[firstIndex]!
  const second = state.cards[action.index]!

  if (verdict === 'match') {
    return { ...state, open: [], matched: [...state.matched, first.letter.id], seen }
  }

  const bothKnown = state.seen.includes(firstIndex) && state.seen.includes(action.index)
  return {
    ...state,
    open: [firstIndex, action.index],
    seen,
    mistakes: bothKnown
      ? [...state.mistakes, { targetId: first.letter.id, chosenId: second.letter.id }]
      : state.mistakes,
  }
}
