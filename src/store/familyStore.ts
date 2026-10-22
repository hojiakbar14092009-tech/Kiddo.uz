import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/content/languages'
import type { GameType } from '@/features/tasks/games'
import { clearChildRewards } from '@/domain/rewards/rewardStore'
import { clearUniverseChild } from '@/domain/universe/store'
import { useLearnStore } from '@/features/learn/learnStore'
import {
  ageOn,
  birthDateForAge,
  GUEST_LEVEL,
  levelForAge,
  MAX_AGE,
  MIN_AGE,
  type AgeLevel,
} from '@/features/age/ageLevel'

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
  /** YYYY-MM-DD; the age, and so which games are open, follows from it. */
  birthDate: string
  /** The highest age level whose unlock celebration the child has seen. */
  celebratedLevel: AgeLevel
  gender: Gender
  /** Defaults to the child’s gender; a parent may switch it in the profile. */
  mascot: MascotModel
  /** Daily screen-time limit in minutes. */
  dailyLimitMinutes: number
  createdAt: string
  /** Homework a parent set – as many as they like; done ones stay for the report. */
  homeworks?: Homework[]
}

export type NewChild = Pick<ChildProfile, 'name' | 'birthDate' | 'gender'> &
  Partial<Pick<ChildProfile, 'mascot' | 'dailyLimitMinutes'>>

export const DEFAULT_DAILY_LIMIT_MINUTES = 30
/** Daily time limits a parent can choose, in minutes. */
export const DAILY_LIMIT_OPTIONS = [15, 20, 30, 45, 60] as const
export const MIN_CHILD_AGE = MIN_AGE
export const MAX_CHILD_AGE = MAX_AGE
export const MAX_NAME_LENGTH = 20
export const MAX_HOMEWORK_LETTERS = 5

interface FamilyState {
  children: ChildProfile[]
  activeChildId: string | null
  addChild: (child: NewChild) => ChildProfile
  updateChild: (id: string, changes: Partial<Omit<ChildProfile, 'id' | 'createdAt'>>) => void
  removeChild: (id: string) => void
  setActiveChild: (id: string | null) => void
  /** Adds one more homework to the child's list. */
  assignHomework: (childId: string, homework: NewHomework) => void
  removeHomework: (childId: string, homeworkId: string) => void
  /** Removes the finished ones from the list. */
  clearDoneHomework: (childId: string) => void
  completeHomework: (childId: string, homeworkId: string, mistakes: number) => void
}

function today(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
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
          birthDate: input.birthDate,
          celebratedLevel: levelForAge(ageOn(input.birthDate, today())),
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
              ? {
                  ...child,
                  ...changes,
                  name: (changes.name ?? child.name).trim(),
                  // A parent fixing the birthday should not trigger a celebration.
                  ...(changes.birthDate && changes.birthDate !== child.birthDate
                    ? { celebratedLevel: levelForAge(ageOn(changes.birthDate, today())) }
                    : {}),
                }
              : child,
          ),
        })),

      // The child's coin ledger and learning record go with the profile
      // (ProfilesSection clears their progress with `resetChild`).
      removeChild: (id) => {
        set((state) => ({
          children: state.children.filter((child) => child.id !== id),
          activeChildId: state.activeChildId === id ? null : state.activeChildId,
        }))
        clearChildRewards(id)
        clearUniverseChild(id)
        useLearnStore.getState().clearChild(id)
        // the child's pictures from the studio (loaded on demand, kept out of the main bundle)
        void import('@/features/studio/gallery')
          .then(({ studioGallery }) => studioGallery().removeChild(id))
          .catch(() => undefined)
      },

      setActiveChild: (id) => set({ activeChildId: id }),

      assignHomework: (childId, input) =>
        set((state) => ({
          children: state.children.map((child) =>
            child.id === childId
              ? {
                  ...child,
                  homeworks: [
                    ...(child.homeworks ?? []),
                    {
                      id: createId(),
                      language: input.language,
                      game: input.game,
                      letterIds: [...new Set(input.letterIds)].slice(0, MAX_HOMEWORK_LETTERS),
                      assignedAt: new Date().toISOString(),
                      completedAt: null,
                      mistakes: null,
                    },
                  ],
                }
              : child,
          ),
        })),

      removeHomework: (childId, homeworkId) =>
        set((state) => ({
          children: state.children.map((child) =>
            child.id === childId
              ? { ...child, homeworks: (child.homeworks ?? []).filter((h) => h.id !== homeworkId) }
              : child,
          ),
        })),

      clearDoneHomework: (childId) =>
        set((state) => ({
          children: state.children.map((child) =>
            child.id === childId
              ? { ...child, homeworks: (child.homeworks ?? []).filter((h) => !h.completedAt) }
              : child,
          ),
        })),

      completeHomework: (childId, homeworkId, mistakes) =>
        set((state) => ({
          children: state.children.map((child) =>
            child.id === childId
              ? {
                  ...child,
                  homeworks: (child.homeworks ?? []).map((homework) =>
                    homework.id === homeworkId && !homework.completedAt
                      ? { ...homework, completedAt: new Date().toISOString(), mistakes }
                      : homework,
                  ),
                }
              : child,
          ),
        })),
    }),
    {
      name: 'kiddo.family',
      version: 3,
      migrate: (persisted, version) => {
        const state = persisted as { children?: Array<Record<string, unknown>> }
        // v2 had one homework per child; now a list.
        if (version < 3 && Array.isArray(state.children)) {
          state.children = state.children.map((child) => {
            const { homework, ...rest } = child
            return { ...rest, homeworks: homework ? [homework] : [] }
          })
        }
        if (version < 2 && Array.isArray(state.children)) {
          state.children = state.children.map((child) => {
            const age = typeof child.age === 'number' ? child.age : MAX_AGE
            const { age: _old, ...rest } = child
            void _old
            return {
              ...rest,
              birthDate: birthDateForAge(Math.max(MIN_AGE, age), today()),
              celebratedLevel: levelForAge(age),
            }
          })
        }
        return state as unknown as FamilyState
      },
    },
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

/** The age level that decides which games are open; guests get everything. */
export function levelOfChild(child: ChildProfile | null, day: string = today()): AgeLevel {
  return child ? levelForAge(ageOn(child.birthDate, day)) : GUEST_LEVEL
}

export function useAgeLevel(): AgeLevel {
  return levelOfChild(useActiveChild())
}

export function childAge(child: ChildProfile, day: string = today()): number {
  return ageOn(child.birthDate, day)
}
