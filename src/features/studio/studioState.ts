import { commit, createHistory, redo, undo, type History } from './history'
import {
  addSticker,
  addStroke,
  clearDoc,
  emptyDoc,
  removeSticker,
  resizeSticker,
  setBackground,
  updateSticker,
  type BackgroundId,
  type BrushSizeId,
  type ColorId,
  type PlacedSticker,
  type StickerName,
  type StudioDoc,
  type StudioStroke,
} from './studioDoc'

export type Tool = 'brush' | 'eraser'

export interface StudioState {
  history: History<StudioDoc>
  tool: Tool
  color: ColorId
  brush: BrushSizeId
  /** The sticker the size buttons act on. */
  selected: string | null
  /** The document last saved to the gallery (so the same picture is not saved twice). */
  saved: StudioDoc | null
}

export type StudioAction =
  | { type: 'stroke'; stroke: StudioStroke }
  | { type: 'addSticker'; name: StickerName; id: string }
  | { type: 'updateSticker'; sticker: PlacedSticker }
  | { type: 'resizeSticker'; factor: number }
  | { type: 'removeSticker' }
  | { type: 'select'; id: string | null }
  | { type: 'background'; background: BackgroundId }
  | { type: 'tool'; tool: Tool }
  | { type: 'color'; color: ColorId }
  | { type: 'brush'; brush: BrushSizeId }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
  | { type: 'saved'; doc: StudioDoc }
  | { type: 'new' }

export function initialStudio(): StudioState {
  return {
    history: createHistory(emptyDoc()),
    tool: 'brush',
    color: 'blue',
    brush: 'medium',
    selected: null,
    saved: null,
  }
}

const change = (state: StudioState, doc: StudioDoc): StudioState => ({
  ...state,
  history: commit(state.history, doc),
})

/** The studio's state changes, as a pure function (unit-tested). */
export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  const doc = state.history.present
  switch (action.type) {
    case 'stroke':
      return { ...change(state, addStroke(doc, action.stroke)), selected: null }
    case 'addSticker':
      return { ...change(state, addSticker(doc, action.name, action.id)), selected: action.id }
    case 'updateSticker':
      return { ...change(state, updateSticker(doc, action.sticker)), selected: action.sticker.id }
    case 'resizeSticker':
      return state.selected
        ? change(state, resizeSticker(doc, state.selected, action.factor))
        : state
    case 'removeSticker':
      return state.selected
        ? { ...change(state, removeSticker(doc, state.selected)), selected: null }
        : state
    case 'select':
      return { ...state, selected: action.id }
    case 'background':
      return action.background === doc.background
        ? state
        : change(state, setBackground(doc, action.background))
    case 'tool':
      return { ...state, tool: action.tool, selected: null }
    case 'color':
      return { ...state, color: action.color, tool: 'brush' }
    case 'brush':
      return { ...state, brush: action.brush }
    case 'undo':
      return { ...state, history: undo(state.history), selected: null }
    case 'redo':
      return { ...state, history: redo(state.history), selected: null }
    case 'clear':
      return doc.strokes.length === 0 && doc.stickers.length === 0
        ? state
        : { ...change(state, clearDoc(doc)), selected: null }
    case 'saved':
      return { ...state, saved: action.doc }
    case 'new':
      return { ...initialStudio(), tool: state.tool, color: state.color, brush: state.brush }
  }
}
