import { describe, expect, it } from 'vitest'
import { canRedo, canUndo, commit, createHistory, MAX_HISTORY, redo, undo } from './history'
import { hasEnoughToSave, isEmptyDoc, STICKER_SIZE, type StudioStroke } from './studioDoc'
import { initialStudio, studioReducer, type StudioAction, type StudioState } from './studioState'

const stroke = (id: string, erase = false): StudioStroke => ({
  id,
  color: '#E53935',
  size: 0.03,
  erase,
  points: [
    { x: 0.1, y: 0.1 },
    { x: 0.5, y: 0.5 },
  ],
})

const run = (...actions: StudioAction[]): StudioState =>
  actions.reduce(studioReducer, initialStudio())

describe('history', () => {
  it('undoes and redoes in order, and a new step clears redo', () => {
    let history = createHistory(0)
    history = commit(history, 1)
    history = commit(history, 2)
    history = undo(history)
    expect(history.present).toBe(1)
    expect(canRedo(history)).toBe(true)
    history = redo(history)
    expect(history.present).toBe(2)
    history = commit(undo(history), 5)
    expect(history.present).toBe(5)
    expect(canRedo(history)).toBe(false)
  })

  it('does nothing past either end and ignores a step that changes nothing', () => {
    const history = createHistory('a')
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
    expect(commit(history, 'a')).toBe(history)
    expect(canUndo(history)).toBe(false)
  })

  it('forgets the oldest steps beyond the limit', () => {
    let history = createHistory(0)
    for (let i = 1; i <= MAX_HISTORY + 10; i += 1) history = commit(history, i)
    expect(history.past).toHaveLength(MAX_HISTORY)
    expect(history.past[0]).toBe(10)
  })
})

describe('studio state', () => {
  it('undoes a stroke, redoes it and clears everything as one undoable step', () => {
    let state = run(
      { type: 'stroke', stroke: stroke('a') },
      { type: 'stroke', stroke: stroke('b') },
    )
    expect(state.history.present.strokes).toHaveLength(2)

    state = studioReducer(state, { type: 'undo' })
    expect(state.history.present.strokes.map((s) => s.id)).toEqual(['a'])
    state = studioReducer(state, { type: 'redo' })
    expect(state.history.present.strokes).toHaveLength(2)

    state = studioReducer(state, { type: 'addSticker', name: 'cat', id: 's1' })
    state = studioReducer(state, { type: 'background', background: 'sky' })
    state = studioReducer(state, { type: 'clear' })
    expect(state.history.present).toEqual({ background: 'sky', strokes: [], stickers: [] })
    expect(state.selected).toBeNull()

    state = studioReducer(state, { type: 'undo' })
    expect(state.history.present.strokes).toHaveLength(2)
    expect(state.history.present.stickers).toHaveLength(1)
  })

  it('does not add an undo step when clearing an empty picture', () => {
    const state = run({ type: 'clear' })
    expect(canUndo(state.history)).toBe(false)
  })

  it('places, moves, resizes within limits and removes a sticker', () => {
    let state = run({ type: 'addSticker', name: 'sun', id: 's1' })
    expect(state.selected).toBe('s1')
    const placed = state.history.present.stickers[0]!
    expect(placed.size).toBe(STICKER_SIZE.initial)

    state = studioReducer(state, {
      type: 'updateSticker',
      sticker: { ...placed, x: 1.4, y: -0.2 },
    })
    expect(state.history.present.stickers[0]).toMatchObject({ x: 1, y: 0 })

    for (let i = 0; i < 20; i += 1)
      state = studioReducer(state, { type: 'resizeSticker', factor: STICKER_SIZE.step })
    expect(state.history.present.stickers[0]?.size).toBe(STICKER_SIZE.max)

    state = studioReducer(state, { type: 'removeSticker' })
    expect(state.history.present.stickers).toHaveLength(0)
    state = studioReducer(state, { type: 'undo' })
    expect(state.history.present.stickers).toHaveLength(1)
  })

  it('treats a picture with only eraser lines as empty', () => {
    expect(isEmptyDoc(run({ type: 'stroke', stroke: stroke('e', true) }).history.present)).toBe(
      true,
    )
    expect(isEmptyDoc(run({ type: 'stroke', stroke: stroke('a') }).history.present)).toBe(false)
  })

  it('picking a colour goes back to the brush; a new picture keeps the tools', () => {
    let state = run({ type: 'tool', tool: 'eraser' }, { type: 'color', color: 'pink' })
    expect(state.tool).toBe('brush')
    state = studioReducer(state, { type: 'brush', brush: 'large' })
    state = studioReducer(state, { type: 'stroke', stroke: stroke('a') })
    state = studioReducer(state, { type: 'new' })
    expect(state).toMatchObject({ color: 'pink', brush: 'large', saved: null })
    expect(state.history.present.strokes).toHaveLength(0)
    expect(canUndo(state.history)).toBe(false)
  })

  it('needs a few real marks before a picture can be saved', () => {
    const dot: StudioStroke = { ...stroke('dot'), points: [{ x: 0.5, y: 0.5 }] }
    const taps = run(
      { type: 'stroke', stroke: { ...dot, id: '1' } },
      { type: 'stroke', stroke: { ...dot, id: '2' } },
      { type: 'stroke', stroke: { ...dot, id: '3' } },
      { type: 'stroke', stroke: stroke('e', true) },
    )
    expect(hasEnoughToSave(taps.history.present)).toBe(false)
    const lines = run(
      { type: 'stroke', stroke: stroke('a') },
      { type: 'stroke', stroke: stroke('b') },
    )
    expect(hasEnoughToSave(lines.history.present)).toBe(false)
    const withSticker = studioReducer(lines, { type: 'addSticker', name: 'sun', id: 's' })
    expect(hasEnoughToSave(withSticker.history.present)).toBe(true)
  })
})
