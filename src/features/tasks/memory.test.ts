import { describe, expect, it } from 'vitest'
import { findLetter } from '@/content/alphabet'
import { seededRandom } from '@/lib/random'
import {
  createMemoryGame,
  isMemoryComplete,
  judgeFlip,
  memoryReducer,
  type MemoryState,
} from './memory'

const letters = ['a', 'b'].map((id) => findLetter('en', id)!)

function indexOf(state: MemoryState, key: string) {
  return state.cards.findIndex((card) => card.key === key)
}

describe('memory game', () => {
  const start = createMemoryGame(letters, seededRandom(1))

  it('has two identical cards for each letter', () => {
    expect(start.cards.map((card) => card.key).sort()).toEqual(['a-1', 'a-2', 'b-1', 'b-2'])
    expect(start.cards.filter((card) => card.letter.id === 'a')).toHaveLength(2)
  })

  it('matches the two cards of the same letter', () => {
    let state = memoryReducer(start, { type: 'flip', index: indexOf(start, 'a-1') })
    expect(judgeFlip(state, indexOf(start, 'b-1'))).toBe('mismatch')
    expect(judgeFlip(state, indexOf(start, 'a-2'))).toBe('match')
    state = memoryReducer(state, { type: 'flip', index: indexOf(start, 'a-2') })
    expect(state.matched).toEqual(['a'])
    expect(state.open).toEqual([])
  })

  it('does not count a first-time mismatch as a mistake, but does count forgetting', () => {
    const aLetter = indexOf(start, 'a-1')
    const bPicture = indexOf(start, 'b-2')

    let state = memoryReducer(start, { type: 'flip', index: aLetter })
    state = memoryReducer(state, { type: 'flip', index: bPicture })
    expect(state.mistakes).toEqual([])
    expect(judgeFlip(state, indexOf(start, 'b-1'))).toBe('ignored')

    state = memoryReducer(state, { type: 'hide' })
    state = memoryReducer(state, { type: 'flip', index: aLetter })
    state = memoryReducer(state, { type: 'flip', index: bPicture })
    expect(state.mistakes).toEqual([{ targetId: 'a', chosenId: 'b' }])
  })

  it('is complete when every pair is found', () => {
    let state = start
    for (const key of ['a-1', 'a-2', 'b-1', 'b-2']) {
      state = memoryReducer(state, { type: 'flip', index: indexOf(start, key) })
    }
    expect(isMemoryComplete(state)).toBe(true)
  })
})
