import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GUEST_KEY } from '@/domain/childKey'
import {
  applyEvidence,
  capSkills,
  MEMORY_POLICY,
  memorySummary,
  type Evidence,
  type MemorySummary,
  type SkillMemory,
} from './memory'

/*
 * The learning memory of every child on this device (Kiddo's own memory, not
 * an AI provider's). `recordEvidence` is the only way in: it checks the
 * evidence, counts it once per id and applies the pure rules of `memory.ts`.
 * A guest's memory lives only as long as the page (never saved). In cloud
 * mode every new evidence is also sent to the server (services/sync), which
 * runs the same rules in `record_learning_evidence` (migration 0008); the
 * browser never writes a mastery score or a status itself.
 */

export interface ChildMemory {
  skills: Record<string, SkillMemory>
  /** Evidence ids already counted, newest last (capped). */
  processed: string[]
}

export const EMPTY_CHILD_MEMORY: ChildMemory = Object.freeze({
  skills: Object.freeze({}) as Record<string, SkillMemory>,
  processed: Object.freeze([]) as unknown as string[],
})

interface MemoryState {
  byChild: Record<string, ChildMemory>
}

export const LEARNING_MEMORY_STORAGE_KEY = 'kiddo.learning-memory'

export const useLearningMemoryStore = create<MemoryState>()(
  persist(() => ({ byChild: {} as Record<string, ChildMemory> }), {
    name: LEARNING_MEMORY_STORAGE_KEY,
    version: 1,
    partialize: (state) => {
      const byChild = { ...state.byChild }
      delete byChild[GUEST_KEY]
      return { byChild }
    },
  }),
)

const SKILL_RE = /^[a-z][a-z0-9-]{0,15}:[a-z0-9-]{1,24}(:[a-z0-9-]{1,24})?$/
const ITEM_RE = /^[a-z0-9-]{1,16}(:[0-9a-z+\-=?<>]{1,16}){1,3}$/
const ID_RE = /^[A-Za-z0-9_|:.-]{1,96}$/

/** Is this evidence well formed? Free text never gets in. */
export function isValidEvidence(e: Evidence): boolean {
  return (
    ID_RE.test(e.id) &&
    SKILL_RE.test(e.skill) &&
    ITEM_RE.test(e.item) &&
    !Number.isNaN(new Date(e.at).getTime()) &&
    typeof e.firstTry === 'boolean' &&
    typeof e.helpedBefore === 'boolean' &&
    typeof e.review === 'boolean' &&
    Array.isArray(e.errors) &&
    e.errors.length <= 8 &&
    e.errors.every((code) => typeof code === 'string' && code.length <= 32) &&
    [0, 1, 2, 3, 4].includes(e.maxHint) &&
    (e.level === undefined || (Number.isInteger(e.level) && e.level >= 1 && e.level <= 5))
  )
}

type Listener = (childKey: string, evidence: Evidence) => void
const listeners = new Set<Listener>()

/** Called with every evidence counted for the first time (cloud sync listens). */
export function subscribeEvidence(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getChildMemory(childKey: string): ChildMemory {
  return useLearningMemoryStore.getState().byChild[childKey] ?? EMPTY_CHILD_MEMORY
}

export function getSkillMemory(childKey: string, skill: string): SkillMemory | undefined {
  return getChildMemory(childKey).skills[skill]
}

/**
 * Counts one finished question for a child. Returns false when it was invalid
 * or counted before (a retry, a second tab, a double tap).
 */
export function recordEvidence(childKey: string, evidence: Evidence): boolean {
  if (!childKey || !isValidEvidence(evidence)) return false
  const child = getChildMemory(childKey)
  if (child.processed.includes(evidence.id)) return false
  const skills = capSkills({
    ...child.skills,
    [evidence.skill]: applyEvidence(child.skills[evidence.skill], evidence),
  })
  const processed = [...child.processed, evidence.id].slice(-MEMORY_POLICY.maxProcessed)
  useLearningMemoryStore.setState((state) => ({
    byChild: { ...state.byChild, [childKey]: { skills, processed } },
  }))
  if (childKey !== GUEST_KEY) {
    for (const listener of listeners) {
      try {
        listener(childKey, evidence)
      } catch {
        // a listener's failure never loses the memory
      }
    }
  }
  return true
}

/** A removed child (or a reset) forgets everything. */
export function clearLearningMemory(childKey: string): void {
  useLearningMemoryStore.setState((state) => {
    if (!(childKey in state.byChild)) return state
    const byChild = { ...state.byChild }
    delete byChild[childKey]
    return { byChild }
  })
}

/** The parent summary as of now. */
export function summaryAsOfNow(skills: Readonly<Record<string, SkillMemory>>): MemorySummary {
  return memorySummary(skills, new Date().toISOString())
}

export function useChildMemory(childKey: string): ChildMemory {
  return useLearningMemoryStore((state) => state.byChild[childKey] ?? EMPTY_CHILD_MEMORY)
}

if (typeof window !== 'undefined') {
  // another tab learned something: read it again, keeping this tab's guest
  window.addEventListener('storage', (event) => {
    if (event.storageArea && event.storageArea !== window.localStorage) return
    if (event.key !== LEARNING_MEMORY_STORAGE_KEY) return
    const guest = useLearningMemoryStore.getState().byChild[GUEST_KEY]
    void Promise.resolve(useLearningMemoryStore.persist.rehydrate()).then(() => {
      if (guest === undefined) return
      useLearningMemoryStore.setState((state) => ({
        byChild: { ...state.byChild, [GUEST_KEY]: guest },
      }))
    })
  })
}
