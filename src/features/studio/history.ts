/*
 * Undo/redo as a plain value: what came before, what is shown, what was
 * undone. Every change is a new `present`; documents are immutable, so the
 * steps share their unchanged parts and stay cheap.
 */

export interface History<T> {
  past: readonly T[]
  present: T
  future: readonly T[]
}

/** Enough steps back for a child; older ones are forgotten. */
export const MAX_HISTORY = 60

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

/** A new step; a change that changes nothing is not a step. Clears redo. */
export function commit<T>(history: History<T>, next: T): History<T> {
  if (next === history.present) return history
  const past = [...history.past, history.present].slice(-MAX_HISTORY)
  return { past, present: next, future: [] }
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1)
  if (previous === undefined) return history
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future
  if (next === undefined) return history
  return { past: [...history.past, history.present], present: next, future: rest }
}

export const canUndo = <T>(history: History<T>) => history.past.length > 0
export const canRedo = <T>(history: History<T>) => history.future.length > 0
