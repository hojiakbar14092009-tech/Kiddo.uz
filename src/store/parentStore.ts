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

/** After this many wrong answers in a row the keypad rests for a while. */
export const MAX_WRONG_ANSWERS = 3
export const LOCKOUT_SECONDS = 30
const LOCK_KEY = 'kiddo.gate.lock'

interface GateLock {
  wrongInRow: number
  /** Until when the keypad rests (ms), or 0. */
  lockedUntil: number
}

/**
 * The wrong answers and the rest survive closing the gate and reloading the page (Phase 46):
 * otherwise "Back" and opening it again would give a guessing child a fresh start.
 */
function readLock(now = Date.now()): GateLock {
  try {
    const value = JSON.parse(localStorage.getItem(LOCK_KEY) ?? 'null') as Partial<GateLock> | null
    if (value && typeof value.wrongInRow === 'number' && typeof value.lockedUntil === 'number') {
      // a clock set back cannot make the rest longer than it was
      const lockedUntil = Math.min(value.lockedUntil, now + LOCKOUT_SECONDS * 1000)
      return { wrongInRow: value.wrongInRow, lockedUntil }
    }
  } catch {
    // storage blocked: the lock lives in memory only
  }
  return { wrongInRow: 0, lockedUntil: 0 }
}

function writeLock(lock: GateLock): void {
  try {
    if (lock.wrongInRow === 0 && lock.lockedUntil === 0) localStorage.removeItem(LOCK_KEY)
    else localStorage.setItem(LOCK_KEY, JSON.stringify(lock))
  } catch {
    // storage blocked
  }
}

interface GateState extends GateLock {
  /** When the gate was last solved (or the parent last did something). Memory only: a reload asks again. */
  openedAt: number | null
  open: (now?: number) => void
  close: () => void
  /** The parent is working: an open gate stays open (Phase 46). */
  touch: (now?: number) => void
  /** A wrong answer; the third in a row rests the keypad. Returns the time it counted. */
  fail: (now?: number) => number
  /** The rest is over: the count starts again. */
  unlock: () => void
}

export const useParentGateStore = create<GateState>()((set, get) => ({
  ...readLock(),
  openedAt: null,
  open: (now = Date.now()) => {
    writeLock({ wrongInRow: 0, lockedUntil: 0 })
    set({ openedAt: now, wrongInRow: 0, lockedUntil: 0 })
  },
  close: () => set({ openedAt: null }),
  touch: (now = Date.now()) => {
    const { openedAt } = get()
    // at most every few seconds, and never reopening a gate whose time is up
    if (openedAt !== null && isGateOpen(openedAt, now) && now - openedAt > 5000) {
      set({ openedAt: now })
    }
  },
  fail: (now = Date.now()) => {
    const wrongInRow = get().wrongInRow + 1
    const lock =
      wrongInRow >= MAX_WRONG_ANSWERS
        ? { wrongInRow, lockedUntil: now + LOCKOUT_SECONDS * 1000 }
        : { wrongInRow, lockedUntil: 0 }
    writeLock(lock)
    set(lock)
    return now
  },
  unlock: () => {
    writeLock({ wrongInRow: 0, lockedUntil: 0 })
    set({ wrongInRow: 0, lockedUntil: 0 })
  },
}))

/** Seconds the keypad still rests (0 when it does not). */
export function lockSecondsLeft(lockedUntil: number, now: number = Date.now()): number {
  return Math.min(LOCKOUT_SECONDS, Math.max(0, Math.ceil((lockedUntil - now) / 1000)))
}

export function isGateOpen(openedAt: number | null, now: number = Date.now()): boolean {
  return openedAt !== null && now - openedAt < PARENT_GATE_MS
}
