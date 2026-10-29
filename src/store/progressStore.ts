import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/content/languages'
import { findOutfit, type OutfitId, type Wearing } from '@/features/shop/outfits'
import { PET_PRICE, type PetId } from '@/features/pets/pets'
import { nextSticker } from '@/features/stickers/stickers'
import type { GameType } from '@/features/tasks/games'
import { dayKey, ROUNDS_PER_TASK, starsFor } from '@/features/tasks/rules'
import { GUEST_KEY } from '@/domain/childKey'
import {
  clearChildRewards,
  grantReward,
  spendCoins,
  wasRewarded,
} from '@/domain/rewards/rewardStore'
import { coinsFor, DAILY_BONUS } from '@/domain/rewards/rules'
import { clearLearningMemory } from '@/domain/learningMemory/store'
import { clearUniverseChild, emitActivity } from '@/domain/universe/store'
import { taskActivity } from '@/domain/universe/wiring'
import { useFamilyStore } from './familyStore'
import { newId } from '@/lib/id'

/** Every kind of finished activity that earns coins. */
export type TaskType = GameType | 'exam'

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
  /** Robot clothes the child bought with coins, and what the robot wears now. */
  outfits: OutfitId[]
  wearing: Wearing
  /** Pets adopted with coins, and the one walking with the robot (or none). */
  pets: PetId[]
  pet: PetId | null
}

export interface CompletedTask {
  /**
   * Letters shown to the child in this task just before being asked (Learn
   * Before Play): practised, but not yet "learned" from this run.
   */
  introduced?: readonly string[]
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
  /** The finished task's result id: what the universe award is kept under (`getAward`). */
  resultId?: string
}

export { GUEST_KEY }
const MAX_RESULTS = 300

export const EMPTY_PROGRESS: ChildProgress = Object.freeze({
  coins: 0,
  learned: {},
  struggles: {},
  stickers: [],
  results: [],
  minutesByDay: {},
  outfits: [],
  wearing: {},
  pets: [],
  pet: null,
}) as ChildProgress

interface ProgressState {
  byChild: Record<string, ChildProgress>
  completeTask: (childKey: string, task: CompletedTask, now?: Date) => TaskOutcome
  addMinutes: (childKey: string, minutes: number, now?: Date) => void
  /** Clear the guest’s coins, stickers and results for a fresh start. */
  startGuest: () => void
  resetChild: (childKey: string) => void
  /** Spends coins on a robot item and puts it on. Returns false if it cannot be bought. */
  buyOutfit: (childKey: string, outfitId: OutfitId) => boolean
  /** Puts an owned item on, or takes it off if the robot already wears it. */
  toggleOutfit: (childKey: string, outfitId: OutfitId) => void
  /**
   * Low-level balance change; negative amounts never go below zero. Call
   * `grantReward` / `spendCoins` from `@/domain/rewards` instead, so the change
   * is recorded once in the ledger.
   */
  grantCoins: (childKey: string, amount: number) => void
  /** Adopts a pet for coins; it walks with the robot at once. */
  buyPet: (childKey: string, pet: PetId) => boolean
  /** Picks which owned pet walks with the robot (null: none). */
  choosePet: (childKey: string, pet: PetId | null) => void
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)]
}

/** The ledger key of the daily bonus: once per child and local day. */
export const dailyBonusRef = (day: string) => `daily|${day}`

/**
 * The task's effect on progress (letters, struggles, sticker, result). Coins are
 * not added here: `completeTask` pays them through the rewards ledger.
 */
function applyTask(childKey: string, progress: ChildProgress, task: CompletedTask, now: Date) {
  const day = dayKey(now)
  const mistakes = task.mistakeDetails.length
  const firstTaskToday =
    !progress.results.some((result) => result.day === day) &&
    !wasRewarded(childKey, 'daily-bonus', dailyBonusRef(day))
  const bonus = firstTaskToday ? DAILY_BONUS : 0
  const coins = coinsFor(mistakes)
  const sticker = nextSticker(progress.stickers)

  const missed = new Set(task.mistakeDetails.map((detail) => detail.targetId))
  const struggles = { ...(progress.struggles[task.language] ?? {}) }
  task.mistakeDetails.forEach(({ targetId }) => {
    struggles[targetId] = (struggles[targetId] ?? 0) + 1
  })
  const shown = new Set(task.introduced ?? [])
  const masteredNow = task.letterIds.filter((id) => !missed.has(id) && !shown.has(id))
  masteredNow.forEach((id) => {
    if (struggles[id] !== undefined) {
      struggles[id] -= 1
      if (struggles[id] <= 0) delete struggles[id]
    }
  })

  const result: TaskResult = {
    id: newId(),
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
    resultId: result.id,
  }
  return { next, outcome, result }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      byChild: {},

      completeTask: (childKey, task, now = new Date()) => {
        const current = get().byChild[childKey] ?? EMPTY_PROGRESS
        const { next, outcome, result } = applyTask(childKey, current, task, now)
        set((state) => ({ byChild: { ...state.byChild, [childKey]: next } }))
        // A result id is new for every finished task; the bonus key is once per day.
        grantReward({ childKey, coins: outcome.coins, reason: 'task', refId: result.id })
        if (outcome.bonus > 0) {
          const paid = grantReward({
            childKey,
            coins: outcome.bonus,
            reason: 'daily-bonus',
            refId: dailyBonusRef(result.day),
          })
          if (!paid) {
            outcome.bonus = 0
            set((state) => {
              const latest = state.byChild[childKey] ?? EMPTY_PROGRESS
              const results = latest.results.map((item) =>
                item.id === result.id ? { ...item, coins: outcome.coins } : item,
              )
              return { byChild: { ...state.byChild, [childKey]: { ...latest, results } } }
            })
          }
        }
        // Stars, crystals and achievements: counted once per result id.
        emitActivity(taskActivity(childKey, result, ROUNDS_PER_TASK))
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

      buyOutfit: (childKey, outfitId) => {
        const outfit = findOutfit(outfitId)
        const current = get().byChild[childKey] ?? EMPTY_PROGRESS
        if (!outfit || current.outfits.includes(outfitId) || current.coins < outfit.price) {
          return false
        }
        if (
          !spendCoins({ childKey, coins: outfit.price, refId: `outfit|${outfitId}|${newId()}` })
        ) {
          return false
        }
        set((state) => {
          const latest = state.byChild[childKey] ?? EMPTY_PROGRESS
          const next: ChildProgress = {
            ...latest,
            outfits: [...latest.outfits, outfitId],
            wearing: { ...latest.wearing, [outfit.slot]: outfitId },
          }
          return { byChild: { ...state.byChild, [childKey]: next } }
        })
        return true
      },

      toggleOutfit: (childKey, outfitId) =>
        set((state) => {
          const outfit = findOutfit(outfitId)
          const current = state.byChild[childKey] ?? EMPTY_PROGRESS
          if (!outfit || !current.outfits.includes(outfitId)) return state
          const wearing = { ...current.wearing }
          if (wearing[outfit.slot] === outfitId) delete wearing[outfit.slot]
          else wearing[outfit.slot] = outfitId
          return { byChild: { ...state.byChild, [childKey]: { ...current, wearing } } }
        }),

      startGuest: () => {
        clearChildRewards(GUEST_KEY)
        clearUniverseChild(GUEST_KEY)
        clearLearningMemory(GUEST_KEY)
        // The guest's studio pictures too (loaded on demand, kept out of the main bundle).
        void import('@/features/studio/gallery')
          .then(({ studioGallery }) => studioGallery().removeChild(GUEST_KEY))
          .catch(() => undefined)
        set((state) => ({
          byChild: { ...state.byChild, [GUEST_KEY]: freshGuest(state.byChild[GUEST_KEY]) },
        }))
      },

      grantCoins: (childKey, amount) =>
        set((state) => {
          const current = state.byChild[childKey] ?? EMPTY_PROGRESS
          const coins = Math.max(0, current.coins + Math.round(amount))
          return { byChild: { ...state.byChild, [childKey]: { ...current, coins } } }
        }),

      buyPet: (childKey, pet) => {
        const current = get().byChild[childKey] ?? EMPTY_PROGRESS
        const owned = current.pets ?? []
        if (owned.includes(pet) || current.coins < PET_PRICE) return false
        if (!spendCoins({ childKey, coins: PET_PRICE, refId: `pet|${pet}|${newId()}` }))
          return false
        set((state) => {
          const latest = state.byChild[childKey] ?? EMPTY_PROGRESS
          const next: ChildProgress = { ...latest, pets: [...(latest.pets ?? []), pet], pet }
          return { byChild: { ...state.byChild, [childKey]: next } }
        })
        return true
      },

      choosePet: (childKey, pet) =>
        set((state) => {
          const current = state.byChild[childKey] ?? EMPTY_PROGRESS
          if (pet !== null && !(current.pets ?? []).includes(pet)) return state
          return { byChild: { ...state.byChild, [childKey]: { ...current, pet } } }
        }),

      resetChild: (childKey) => {
        clearChildRewards(childKey)
        clearUniverseChild(childKey)
        clearLearningMemory(childKey)
        set((state) => {
          const byChild = { ...state.byChild }
          delete byChild[childKey]
          return { byChild }
        })
      },
    }),
    {
      name: 'kiddo.progress',
      version: 3,
      migrate: (persisted, version) => migrateProgress(persisted, version),
      // A guest starts fresh every time the app opens; only today’s screen time is kept,
      // so reopening the app does not hand out a new daily allowance.
      partialize: (state) => ({
        byChild: { ...state.byChild, [GUEST_KEY]: freshGuest(state.byChild[GUEST_KEY]) },
      }),
    },
  ),
)

/** Guest progress with everything but screen time cleared. */
function freshGuest(guest: ChildProgress | undefined): ChildProgress {
  return { ...EMPTY_PROGRESS, minutesByDay: guest?.minutesByDay ?? {} }
}

/**
 * v1 had no robot clothes; v2 had no pets and wore the flower on the head
 * (it now has its own place by the ear, so it goes with a cap or a crown).
 */
export function migrateProgress(persisted: unknown, version: number) {
  const state = (persisted ?? {}) as { byChild?: Record<string, Partial<ChildProgress>> }
  if (version >= 3) return state as Pick<ProgressState, 'byChild'>
  const byChild: Record<string, ChildProgress> = {}
  for (const [key, progress] of Object.entries(state.byChild ?? {})) {
    const wearing: Wearing = version < 2 ? {} : { ...(progress.wearing ?? {}) }
    if ((wearing.head as string | undefined) === 'flower') {
      delete wearing.head
      wearing.ear = 'flower'
    }
    byChild[key] = {
      ...EMPTY_PROGRESS,
      ...progress,
      outfits: version < 2 ? [] : (progress.outfits ?? []),
      wearing,
      pets: [],
      pet: null,
    }
  }
  return { byChild }
}

/** The robot clothes of the active child (or of the given child). */
export function useWearing(childKey?: string): Wearing {
  return useProgress(childKey).wearing
}

/** Progress belongs to the active child, or to a guest before any profile exists. */
export function useChildKey(): string {
  return useFamilyStore((state) => state.activeChildId) ?? GUEST_KEY
}

export function useProgress(childKey?: string): ChildProgress {
  const activeKey = useChildKey()
  const key = childKey ?? activeKey
  return useProgressStore((state) => state.byChild[key] ?? EMPTY_PROGRESS)
}

/** The pet walking with the active child's robot, if any. */
export function useActivePet(childKey?: string): PetId | null {
  return useProgress(childKey).pet ?? null
}
