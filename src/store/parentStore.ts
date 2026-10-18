import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ParentSession = { mode: 'demo' } | { mode: 'cloud'; email: string; userId: string }

interface ParentState {
  /** Who is signed in to the parent area; `null` when nobody is. */
  session: ParentSession | null
  signInDemo: () => void
  setCloudSession: (email: string, userId: string) => void
  signOut: () => void
}

export const useParentStore = create<ParentState>()(
  persist(
    (set) => ({
      session: null,
      signInDemo: () => set({ session: { mode: 'demo' } }),
      setCloudSession: (email, userId) => set({ session: { mode: 'cloud', email, userId } }),
      signOut: () => set({ session: null }),
    }),
    { name: 'kiddo.parent', version: 1 },
  ),
)

/** How long a solved parent gate stays open while the parent works in the parent area. */
export const PARENT_GATE_MS = 10 * 60 * 1000

interface GateState {
  /** When the gate was last solved. Kept in memory only: a reload asks again. */
  openedAt: number | null
  open: (now?: number) => void
  close: () => void
}

export const useParentGateStore = create<GateState>()((set) => ({
  openedAt: null,
  open: (now = Date.now()) => set({ openedAt: now }),
  close: () => set({ openedAt: null }),
}))

export function isGateOpen(openedAt: number | null, now: number = Date.now()): boolean {
  return openedAt !== null && now - openedAt < PARENT_GATE_MS
}
