import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/content/languages'
import type { GameType } from '@/features/tasks/games'

export type Gender = 'girl' | 'boy'
export type MascotModel = Gender

/** Letters a parent picked for practice, played through one game. */
export interface Homework {
  id: string
  language: Language
  game: GameType
  letterIds: string[]
  assignedAt: string
  completedAt: string | null
  /** Mistakes in the finished homework, for the parent report. */
  mistakes: number | null
}

export type NewHomework = Pick<Homework, 'language' | 'game' | 'letterIds'>

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
  /** The current homework, if a parent set one. */
  homework?: Homework | null
}

export type NewChild = Pick<ChildProfile, 'name' | 'age' | 'gender'> &
  Partial<Pick<ChildProfile, 'mascot' | 'dailyLimitMinutes'>>

export const DEFAULT_DAILY_LIMIT_MINUTES = 30
/** Daily time limits a parent can choose, in minutes. */
export const DAILY_LIMIT_OPTIONS = [15, 20, 30, 45, 60] as const
export const MIN_CHILD_AGE = 3
export const MAX_CHILD_AGE = 6
export const MAX_CHILDREN = 3
export const MAX_NAME_LENGTH = 20
export const MAX_HOMEWORK_LETTERS = 5

interface FamilyState {
  children: ChildProfile[]
  activeChildId: string | null
  addChild: (child: NewChild) => ChildProfile
  updateChild: (id: string, changes: Partial<Omit<ChildProfile, 'id' | 'createdAt'>>) => void
  removeChild: (id: string) => void
  setActiveChild: (id: string | null) => void
  assignHomework: (childId: string, homework: NewHomework) => void
  clearHomework: (childId: string) => void
  completeHomework: (childId: string, homeworkId: string, mistakes: number) => void
}

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      children: [],
      activeChildId: null,

      addChild: (input) => {
        if (get().children.length >= MAX_CHILDREN) {
          throw new Error(`A family has at most ${MAX_CHILDREN} child profiles`)
        }
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

      assignHomework: (childId, input) =>
        set((state) => ({
          children: state.children.map((child) =>
            child.id === childId
              ? {
                  ...child,
                  homework: {
                    id: createId(),
                    language: input.language,
                    game: input.game,
                    letterIds: [...new Set(input.letterIds)].slice(0, MAX_HOMEWORK_LETTERS),
                    assignedAt: new Date().toISOString(),
                    completedAt: null,
                    mistakes: null,
                  },
                }
              : child,
          ),
        })),

      clearHomework: (childId) =>
        set((state) => ({
          children: state.children.map((child) =>
            child.id === childId ? { ...child, homework: null } : child,
          ),
        })),

      completeHomework: (childId, homeworkId, mistakes) =>
        set((state) => ({
          children: state.children.map((child) =>
            child.homework?.id === homeworkId && child.id === childId && !child.homework.completedAt
              ? {
                  ...child,
                  homework: { ...child.homework, completedAt: new Date().toISOString(), mistakes },
                }
              : child,
          ),
        })),
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
