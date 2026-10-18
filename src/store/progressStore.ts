import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/content/languages'
import { nextSticker } from '@/features/stickers/stickers'
import { coinsFor, DAILY_BONUS, dayKey, starsFor } from '@/features/tasks/rules'
import { useFamilyStore } from './familyStore'

export type TaskType = 'find-letter' | 'find-picture' | 'final-test'

export interface MistakeDetail {
  targetId: string
  chosenId: string
}

export interface TaskResult {
  id: string
  type: TaskType
  language: Language
  letterIds: string[]
  mistakes: number
  mistakeDetails: MistakeDetail[]
  coins: number
  stars: number
  stickerId: string | null
  day: string
  finishedAt: string
}

export interface ChildProgress {
  coins: number
  learned: Partial<Record<Language, string[]>>
  /** Mistakes per letter that still need practice. */
  struggles: Partial<Record<Language, Record<string, number>>>
  stickers: string[]
  results: TaskResult[]
  /** Minutes spent in the child area per local day (YYYY-MM-DD). */
  minutesByDay: Record<string, number>
}

export interface CompletedTask {
  type: TaskType
  language: Language
  letterIds: string[]
  mistakeDetails: MistakeDetail[]
}

export interface TaskOutcome {
  coins: number
  bonus: number
  stars: number
  stickerId: string | null
  mistakes: number
}

export const GUEST_KEY = 'guest'
const MAX_RESULTS = 300

export const EMPTY_PROGRESS: ChildProgress = Object.freeze({
  coins: 0,
  learned: {},
  struggles: {},
  stickers: [],
  results: [],
  minutesByDay: {},
}) as ChildProgress

interface ProgressState {
  byChild: Record<string, ChildProgress>
  completeTask: (childKey: string, task: CompletedTask, now?: Date) => TaskOutcome
  addMinutes: (childKey: string, minutes: number, now?: Date) => void
  resetChild: (childKey: string) => void
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

function applyTask(progress: ChildProgress, task: CompletedTask, now: Date) {
  const day = dayKey(now)
  const mistakes = task.mistakeDetails.length
  const firstTaskToday = !progress.results.some((result) => result.day === day)
  const bonus = firstTaskToday ? DAILY_BONUS : 0
  const coins = coinsFor(mistakes)
  const sticker = nextSticker(progress.stickers)

  const missed = new Set(task.mistakeDetails.map((detail) => detail.targetId))
  const struggles = { ...(progress.struggles[task.language] ?? {}) }
  task.mistakeDetails.forEach(({ targetId }) => {
    struggles[targetId] = (struggles[targetId] ?? 0) + 1
  })
  const masteredNow = task.letterIds.filter((id) => !missed.has(id))
  masteredNow.forEach((id) => {
    if (struggles[id] !== undefined) {
      struggles[id] -= 1
      if (struggles[id] <= 0) delete struggles[id]
    }
  })

  const result: TaskResult = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    type: task.type,
    language: task.language,
    letterIds: task.letterIds,
    mistakes,
    mistakeDetails: task.mistakeDetails,
    coins: coins + bonus,
    stars: starsFor(mistakes),
    stickerId: sticker?.id ?? null,
    day,
    finishedAt: now.toISOString(),
  }

  const next: ChildProgress = {
    ...progress,
    coins: progress.coins + coins + bonus,
    learned: {
      ...progress.learned,
      [task.language]: unique([...(progress.learned[task.language] ?? []), ...masteredNow]),
    },
    struggles: { ...progress.struggles, [task.language]: struggles },
    stickers: sticker ? [...progress.stickers, sticker.id] : progress.stickers,
    results: [result, ...progress.results].slice(0, MAX_RESULTS),
  }

  const outcome: TaskOutcome = {
    coins,
    bonus,
    stars: result.stars,
    stickerId: result.stickerId,
    mistakes,
  }
  return { next, outcome }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      byChild: {},

      completeTask: (childKey, task, now = new Date()) => {
        const current = get().byChild[childKey] ?? EMPTY_PROGRESS
        const { next, outcome } = applyTask(current, task, now)
        set((state) => ({ byChild: { ...state.byChild, [childKey]: next } }))
        return outcome
      },

      addMinutes: (childKey, minutes, now = new Date()) =>
        set((state) => {
          const current = state.byChild[childKey] ?? EMPTY_PROGRESS
          const day = dayKey(now)
          return {
            byChild: {
              ...state.byChild,
              [childKey]: {
                ...current,
                minutesByDay: {
                  ...current.minutesByDay,
                  [day]: (current.minutesByDay[day] ?? 0) + minutes,
                },
              },
            },
          }
        }),

      resetChild: (childKey) =>
        set((state) => {
          const byChild = { ...state.byChild }
          delete byChild[childKey]
          return { byChild }
        }),
    }),
    { name: 'kiddo.progress', version: 1 },
  ),
)

/** Progress belongs to the active child, or to a guest before any profile exists. */
export function useChildKey(): string {
  return useFamilyStore((state) => state.activeChildId) ?? GUEST_KEY
}

export function useProgress(childKey?: string): ChildProgress {
  const activeKey = useChildKey()
  const key = childKey ?? activeKey
  return useProgressStore((state) => state.byChild[key] ?? EMPTY_PROGRESS)
}
