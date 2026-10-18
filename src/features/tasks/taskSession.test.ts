import { describe, expect, it } from 'vitest'
import { findLetter } from '@/content/alphabet'
import { createSession, judgeChoice, taskSessionReducer } from './taskSession'

const a = findLetter('en', 'a')!
const b = findLetter('en', 'b')!
const c = findLetter('en', 'c')!

const session = createSession([
  { target: a, options: [a, b, c] },
  { target: b, options: [a, b, c] },
])

describe('taskSessionReducer', () => {
  it('records each wrong option once and disables it', () => {
    let state = taskSessionReducer(session, { type: 'choose', optionId: 'b' })
    state = taskSessionReducer(state, { type: 'choose', optionId: 'b' })

    expect(state.wrongIds).toEqual(['b'])
    expect(state.mistakes).toEqual([{ targetId: 'a', chosenId: 'b' }])
    expect(judgeChoice(state, 'b')).toBe('ignored')
  })

  it('moves on only after the right answer', () => {
    let state = taskSessionReducer(session, { type: 'next' })
    expect(state.index).toBe(0)

    state = taskSessionReducer(state, { type: 'choose', optionId: 'a' })
    expect(state.solved).toBe(true)
    expect(judgeChoice(state, 'c')).toBe('ignored')

    state = taskSessionReducer(state, { type: 'next' })
    expect(state).toMatchObject({ index: 1, solved: false, wrongIds: [] })
  })

  it('does not run past the last round', () => {
    let state = taskSessionReducer(session, { type: 'choose', optionId: 'a' })
    state = taskSessionReducer(state, { type: 'next' })
    state = taskSessionReducer(state, { type: 'choose', optionId: 'b' })
    expect(taskSessionReducer(state, { type: 'next' })).toBe(state)
  })
})
