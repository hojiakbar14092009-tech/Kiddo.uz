import { beforeEach, describe, expect, it } from 'vitest'
import { STICKERS } from '@/features/stickers/stickers'
import { EMPTY_PROGRESS, useProgressStore } from './progressStore'

const KEY = 'child-1'
const MORNING = new Date(2026, 9, 18, 9, 0)
const EVENING = new Date(2026, 9, 18, 19, 0)

function progress() {
  return useProgressStore.getState().byChild[KEY] ?? EMPTY_PROGRESS
}

describe('progressStore', () => {
  beforeEach(() => {
    useProgressStore.setState({ byChild: {} })
  })

  it('gives 5 coins plus the daily bonus for a perfect first task', () => {
    const outcome = useProgressStore
      .getState()
      .completeTask(
        KEY,
        { type: 'find-letter', language: 'uz', letterIds: ['a', 'b'], mistakeDetails: [] },
        MORNING,
      )

    expect(outcome).toMatchObject({ coins: 5, bonus: 2, stars: 3, mistakes: 0 })
    expect(progress().coins).toBe(7)
    expect(progress().learned.uz).toEqual(['a', 'b'])
    expect(progress().stickers).toEqual([STICKERS[0]!.id])
  })

  it('gives 3 coins with mistakes, never removes coins, and remembers what went wrong', () => {
    const { completeTask } = useProgressStore.getState()
    completeTask(
      KEY,
      { type: 'find-letter', language: 'uz', letterIds: ['a'], mistakeDetails: [] },
      MORNING,
    )
    const outcome = completeTask(
      KEY,
      {
        type: 'find-letter',
        language: 'uz',
        letterIds: ['sh', 'ch'],
        mistakeDetails: [{ targetId: 'ch', chosenId: 'sh' }],
      },
      EVENING,
    )

    expect(outcome).toMatchObject({ coins: 3, bonus: 0, stars: 2, mistakes: 1 })
    expect(progress().coins).toBe(7 + 3)
    expect(progress().learned.uz).toEqual(['a', 'sh'])
    expect(progress().struggles.uz).toEqual({ ch: 1 })
    expect(progress().results[0]?.mistakeDetails).toEqual([{ targetId: 'ch', chosenId: 'sh' }])
  })

  it('forgets a struggle once the letter is answered right', () => {
    const { completeTask } = useProgressStore.getState()
    const wrong = { targetId: 'ch', chosenId: 'sh' }
    completeTask(KEY, {
      type: 'find-letter',
      language: 'uz',
      letterIds: ['ch'],
      mistakeDetails: [wrong],
    })
    completeTask(KEY, {
      type: 'find-picture',
      language: 'uz',
      letterIds: ['ch'],
      mistakeDetails: [],
    })

    expect(progress().struggles.uz).toEqual({})
    expect(progress().learned.uz).toEqual(['ch'])
  })

  it('stops giving stickers once the album is full', () => {
    const { completeTask } = useProgressStore.getState()
    const task = {
      type: 'find-letter' as const,
      language: 'en' as const,
      letterIds: ['a'],
      mistakeDetails: [],
    }
    STICKERS.forEach(() => completeTask(KEY, task))

    expect(completeTask(KEY, task).stickerId).toBeNull()
    expect(progress().stickers).toHaveLength(STICKERS.length)
  })

  it('adds up minutes per day', () => {
    const { addMinutes } = useProgressStore.getState()
    addMinutes(KEY, 1, MORNING)
    addMinutes(KEY, 2, EVENING)
    expect(progress().minutesByDay).toEqual({ '2026-10-18': 3 })
  })
})
