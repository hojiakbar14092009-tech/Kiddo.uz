import { useSyncExternalStore } from 'react'

/*
 * The dialogs open right now, in the order they were opened. Only the top one
 * answers Escape and traps Tab, and each one is drawn above the ones before it.
 * The order is taken when a dialog first renders (a parent renders before the
 * dialog it opens inside it), not from the order of the page's DOM.
 */

let rendered = 0
const open = new Set<number>()
const listeners = new Set<() => void>()

/** A number for a dialog's first render: later dialogs get larger numbers. */
export function nextDialogOrder(): number {
  rendered += 1
  return rendered
}

export function openDialog(order: number): () => void {
  open.add(order)
  listeners.forEach((listener) => listener())
  return () => {
    open.delete(order)
    listeners.forEach((listener) => listener())
  }
}

export function isTopDialog(order: number): boolean {
  let top = -1
  for (const value of open) top = Math.max(top, value)
  return top === order
}

/** Position in the stack (0 = the lowest open dialog), for the z-index. */
export function dialogDepth(order: number): number {
  let depth = 0
  for (const value of open) if (value < order) depth += 1
  return depth
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Is any dialog open (e.g. so notices move out of the way of its buttons)? */
export function useAnyDialogOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open.size > 0,
    () => false,
  )
}
