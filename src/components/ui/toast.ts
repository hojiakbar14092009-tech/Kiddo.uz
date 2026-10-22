import { create } from 'zustand'

/*
 * Short, calm notices ("Saqlandi", "Internet yo‘q") that never block the
 * child: they appear at the bottom, are read out by screen readers, and go
 * away on their own. At most three at a time; the oldest leaves first.
 */

export type ToastTone = 'info' | 'success' | 'warning'

export interface Toast {
  id: number
  text: string
  tone: ToastTone
}

interface ToastState {
  toasts: Toast[]
  show: (text: string, tone?: ToastTone, durationMs?: number) => number
  dismiss: (id: number) => void
}

const MAX_TOASTS = 3
export const TOAST_MS = 3500
let nextId = 1
const timers = new Map<number, ReturnType<typeof setTimeout>>()

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (text, tone = 'info', durationMs = TOAST_MS) => {
    const id = nextId++
    set((state) => {
      const toasts = [...state.toasts, { id, text, tone }]
      for (const dropped of toasts.slice(0, Math.max(0, toasts.length - MAX_TOASTS))) {
        clearTimeout(timers.get(dropped.id))
        timers.delete(dropped.id)
      }
      return { toasts: toasts.slice(-MAX_TOASTS) }
    })
    timers.set(
      id,
      setTimeout(() => get().dismiss(id), durationMs),
    )
    return id
  },
  dismiss: (id) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },
}))

/** Shows a short notice; returns its id (to dismiss it early). */
export function toast(text: string, tone?: ToastTone, durationMs?: number): number {
  return useToastStore.getState().show(text, tone, durationMs)
}
