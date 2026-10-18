import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Gender = 'girl' | 'boy'
export type MascotModel = Gender

export interface ChildProfile {
  id: string
  name: string
  age: number
  gender: Gender
  /** Defaults to the child’s gender; a parent may switch it in the profile. */
  mascot: MascotModel
  /** Daily screen-time limit in minutes. */
  dailyLimitMinutes: number
  createdAt: string
}

export type NewChild = Pick<ChildProfile, 'name' | 'age' | 'gender'> &
  Partial<Pick<ChildProfile, 'mascot' | 'dailyLimitMinutes'>>

export const DEFAULT_DAILY_LIMIT_MINUTES = 30
export const MIN_CHILD_AGE = 3
export const MAX_CHILD_AGE = 6

interface FamilyState {
  children: ChildProfile[]
  activeChildId: string | null
  addChild: (child: NewChild) => ChildProfile
  updateChild: (id: string, changes: Partial<Omit<ChildProfile, 'id' | 'createdAt'>>) => void
  removeChild: (id: string) => void
  setActiveChild: (id: string | null) => void
}

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set) => ({
      children: [],
      activeChildId: null,

      addChild: (input) => {
        const child: ChildProfile = {
          id: createId(),
          name: input.name.trim(),
          age: input.age,
          gender: input.gender,
          mascot: input.mascot ?? input.gender,
          dailyLimitMinutes: input.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES,
          createdAt: new Date().toISOString(),
        }
        set((state) => ({ children: [...state.children, child] }))
        return child
      },

      updateChild: (id, changes) =>
        set((state) => ({
          children: state.children.map((child) =>
            child.id === id
              ? { ...child, ...changes, name: (changes.name ?? child.name).trim() }
              : child,
          ),
        })),

      removeChild: (id) =>
        set((state) => ({
          children: state.children.filter((child) => child.id !== id),
          activeChildId: state.activeChildId === id ? null : state.activeChildId,
        })),

      setActiveChild: (id) => set({ activeChildId: id }),
    }),
    { name: 'kiddo.family', version: 1 },
  ),
)

export function useActiveChild(): ChildProfile | null {
  return useFamilyStore(
    (state) => state.children.find((child) => child.id === state.activeChildId) ?? null,
  )
}

/** Which robot to show: the active child’s choice, or the girl robot before anyone signs in. */
export function useMascotModel(): MascotModel {
  return useActiveChild()?.mascot ?? 'girl'
}
