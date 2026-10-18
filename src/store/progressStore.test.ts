import { beforeEach, describe, expect, it } from 'vitest'
import { STICKERS } from '@/features/stickers/stickers'
import { EMPTY_PROGRESS, GUEST_KEY, migrateProgress, useProgressStore } from './progressStore'

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

describe('robot clothes', () => {
  beforeEach(() => {
    useProgressStore.setState({ byChild: { [KEY]: { ...EMPTY_PROGRESS, coins: 30 } } })
  })

  it('buys an item, spends its price and puts it on', () => {
    expect(useProgressStore.getState().buyOutfit(KEY, 'cap')).toBe(true)
    expect(progress().coins).toBe(15)
    expect(progress().outfits).toEqual(['cap'])
    expect(progress().wearing).toEqual({ head: 'cap' })
  })

  it('never buys without enough coins, and never twice', () => {
    expect(useProgressStore.getState().buyOutfit(KEY, 'crown')).toBe(false)
    expect(progress().coins).toBe(30)
    useProgressStore.getState().buyOutfit(KEY, 'cap')
    expect(useProgressStore.getState().buyOutfit(KEY, 'cap')).toBe(false)
    expect(progress().coins).toBe(15)
  })

  it('swaps items in the same slot and takes an item off on a second tap', () => {
    const store = useProgressStore.getState()
    store.buyOutfit(KEY, 'cap')
    store.buyOutfit(KEY, 'flower')
    expect(progress().wearing).toEqual({ head: 'flower' })
    store.toggleOutfit(KEY, 'cap')
    expect(progress().wearing).toEqual({ head: 'cap' })
    store.toggleOutfit(KEY, 'cap')
    expect(progress().wearing).toEqual({})
  })

  it('cannot put on an item that was not bought', () => {
    useProgressStore.getState().toggleOutfit(KEY, 'glasses')
    expect(progress().wearing).toEqual({})
  })

  it('gives saves from before the shop an empty wardrobe', () => {
    const old = {
      byChild: {
        [KEY]: {
          coins: 9,
          learned: {},
          struggles: {},
          stickers: [],
          results: [],
          minutesByDay: {},
        },
      },
    }
    const migrated = migrateProgress(old, 1)
    expect(migrated.byChild[KEY]).toMatchObject({ coins: 9, outfits: [], wearing: {} })
  })

  it('gives a guest a fresh start but keeps today’s screen time', () => {
    const store = useProgressStore.getState()
    store.completeTask(
      GUEST_KEY,
      { type: 'memory', language: 'uz', letterIds: ['a'], mistakeDetails: [] },
      MORNING,
    )
    store.completeTask(
      KEY,
      { type: 'memory', language: 'uz', letterIds: ['a'], mistakeDetails: [] },
      MORNING,
    )
    store.addMinutes(GUEST_KEY, 7, MORNING)

    // What is saved for the next visit: the child keeps everything, the guest only minutes.
    const saved = JSON.parse(localStorage.getItem('kiddo.progress') ?? '{}') as {
      state: { byChild: Record<string, typeof EMPTY_PROGRESS> }
    }
    expect(saved.state.byChild[GUEST_KEY]).toMatchObject({ coins: 0, results: [] })
    expect(saved.state.byChild[GUEST_KEY]?.minutesByDay).toEqual({ '2026-10-18': 7 })
    expect(saved.state.byChild[KEY]?.coins).toBeGreaterThan(0)

    useProgressStore.getState().startGuest()
    const guest = useProgressStore.getState().byChild[GUEST_KEY]
    expect(guest).toMatchObject({ coins: 0, results: [], stickers: [] })
    expect(guest?.minutesByDay).toEqual({ '2026-10-18': 7 })
  })
})
