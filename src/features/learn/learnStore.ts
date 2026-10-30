import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/content/languages'
import { grantReward, wasRewarded } from '@/domain/rewards/rewardStore'
import { sessionCoins } from '@/domain/rewards/rules'
import { atCurrentLevel, emitActivity } from '@/domain/universe/store'
import { learnActivity } from '@/domain/universe/wiring'
import { useChildKey } from '@/store/progressStore'
import type { AnswerRecord, LearnMode, SessionSummary } from './session'

/*
 * What each child did in the new learning sections, kept per child (the
 * same key as coins and progress, so profiles never mix):
 * - every answer (first answer, error type, help, later try, date),
 * - a running record per skill, used to bring weak skills back for review,
 * - finished sessions with their independent score, for the parent area,
 * - (legacy) which sessions were rewarded before the rewards ledger existed;
 *   coins now go through `grantReward`, which pays each session id once,
 * - stages a child has been taught, so a test never asks about anything else.
 */

export type SectionId = 'words' | 'help' | 'tales' | 'space' | 'math' | 'garden'
/** Maths is the same in every language. */
export type LearnLanguage = Language | 'any'

export interface AttemptRecord extends AnswerRecord {
  section: SectionId
  language: LearnLanguage
  mode: LearnMode
  at: string
}

export interface SkillStat {
  section: SectionId
  language: LearnLanguage
  skill: string
  attempts: number
  /** First answers right without help. */
  independent: number
  wrong: number
  helped: number
  /** Independent right answers in a row (reset by a mistake or help). */
  streak: number
  lastCorrect: boolean
  lastErrorType: string | null
  lastPracticed: string
}

export interface SessionRecord extends SessionSummary {
  id: string
  section: SectionId
  /** E.g. "4", "6-over10" or a tale id. */
  stage: string
  language: LearnLanguage
  mode: LearnMode
  coins: number
  at: string
}

export interface LearnChild {
  skills: Record<string, SkillStat>
  attempts: AttemptRecord[]
  sessions: SessionRecord[]
  /**
   * Legacy: sessions paid before the rewards ledger. Still read (so an old
   * session is never paid again) but no longer written.
   */
  rewarded: string[]
  /** "section|language" → stages taught. */
  stages: Record<string, string[]>
  /** "section|language" → the order of the last question set, to avoid repeating it. */
  lastOrder: Record<string, string>
}

const EMPTY: LearnChild = Object.freeze({
  skills: {},
  attempts: [],
  sessions: [],
  rewarded: [],
  stages: {},
  lastOrder: {},
}) as LearnChild

/** A child with no learning record yet (a stable object, safe in selectors). */
export const EMPTY_LEARN_CHILD = EMPTY

const MAX_ATTEMPTS = 600
const MAX_SESSIONS = 200

export function skillKey(section: SectionId, language: LearnLanguage, skill: string): string {
  return `${section}|${language}|${skill}`
}

export const stageKey = (section: SectionId, language: LearnLanguage) => `${section}|${language}`

/**
 * The lessons a child has seen (Learn Before Play) live beside the taught
 * stages, under their own key (no "|": no section and language clash).
 */
export const LESSONS_KEY = 'lessons'

/** Has the child seen this lesson? */
export function hasSeenLesson(learn: LearnChild, lessonId: string): boolean {
  return (learn.stages[LESSONS_KEY] ?? []).includes(lessonId)
}

/** Coins for a finished session: a little for trying, more for independent answers. */
export { sessionCoins }

interface LearnState {
  byChild: Record<string, LearnChild>
  recordAttempt: (childKey: string, attempt: Omit<AttemptRecord, 'at'> & { at?: string }) => void
  /**
   * Saves a finished session and pays its coins once. Returns the coins
   * given now (0 when this session was already rewarded).
   */
  finishSession: (childKey: string, session: Omit<SessionRecord, 'coins' | 'at'>) => number
  markStage: (childKey: string, section: SectionId, language: LearnLanguage, stage: string) => void
  setLastOrder: (childKey: string, key: string, order: string) => void
  /** A lesson was shown in full (Learn Before Play, domain/learning/lessons). */
  markLesson: (childKey: string, lessonId: string) => void
  /** Forgets everything a child did here (the child was removed). */
  clearChild: (childKey: string) => void
}

function child(state: LearnState, key: string): LearnChild {
  return state.byChild[key] ?? EMPTY
}

export const useLearnStore = create<LearnState>()(
  persist(
    (set, get) => ({
      byChild: {},

      recordAttempt: (childKey, input) =>
        set((state) => {
          const current = child(state, childKey)
          const at = input.at ?? new Date().toISOString()
          const attempt: AttemptRecord = { ...input, at }
          const key = skillKey(attempt.section, attempt.language, attempt.skill)
          const old = current.skills[key]
          const independent = attempt.firstCorrect && !attempt.helped
          const stat: SkillStat = {
            section: attempt.section,
            language: attempt.language,
            skill: attempt.skill,
            attempts: (old?.attempts ?? 0) + 1,
            independent: (old?.independent ?? 0) + (independent ? 1 : 0),
            wrong: (old?.wrong ?? 0) + (attempt.firstCorrect ? 0 : 1),
            helped: (old?.helped ?? 0) + (attempt.helped ? 1 : 0),
            streak: independent ? (old?.streak ?? 0) + 1 : 0,
            lastCorrect: independent,
            lastErrorType: attempt.firstCorrect ? (old?.lastErrorType ?? null) : attempt.errorType,
            lastPracticed: at,
          }
          return {
            byChild: {
              ...state.byChild,
              [childKey]: {
                ...current,
                skills: { ...current.skills, [key]: stat },
                attempts: [attempt, ...current.attempts].slice(0, MAX_ATTEMPTS),
              },
            },
          }
        }),

      finishSession: (childKey, input) => {
        const current = child(get(), childKey)
        if (current.rewarded.includes(input.id) || wasRewarded(childKey, 'learn', input.id)) {
          return 0
        }
        const entry = grantReward({
          childKey,
          coins: sessionCoins(input),
          reason: 'learn',
          refId: input.id,
        })
        if (!entry) return 0
        const record: SessionRecord = { ...input, coins: entry.coins, at: entry.at }
        set((state) => {
          const latest = child(state, childKey)
          return {
            byChild: {
              ...state.byChild,
              [childKey]: {
                ...latest,
                sessions: [record, ...latest.sessions].slice(0, MAX_SESSIONS),
              },
            },
          }
        })
        // Stars, crystals, scrolls and achievements: counted once per session id.
        // practice is evidence at the strand's level (its items follow the content tier);
        // a learn session (being taught, with help) is marked as such and moves nothing
        const activity = learnActivity(childKey, record)
        emitActivity(atCurrentLevel(activity, record.mode === 'learn' ? 'learn' : 'practice'))
        return entry.coins
      },

      markStage: (childKey, section, language, stage) =>
        set((state) => {
          const current = child(state, childKey)
          const key = stageKey(section, language)
          const stages = current.stages[key] ?? []
          if (stages.includes(stage)) return state
          return {
            byChild: {
              ...state.byChild,
              [childKey]: { ...current, stages: { ...current.stages, [key]: [...stages, stage] } },
            },
          }
        }),

      setLastOrder: (childKey, key, order) =>
        set((state) => {
          const current = child(state, childKey)
          return {
            byChild: {
              ...state.byChild,
              [childKey]: { ...current, lastOrder: { ...current.lastOrder, [key]: order } },
            },
          }
        }),

      markLesson: (childKey, lessonId) =>
        set((state) => {
          const current = child(state, childKey)
          const seen = current.stages[LESSONS_KEY] ?? []
          if (seen.includes(lessonId)) return state
          return {
            byChild: {
              ...state.byChild,
              [childKey]: {
                ...current,
                stages: { ...current.stages, [LESSONS_KEY]: [...seen, lessonId] },
              },
            },
          }
        }),

      clearChild: (childKey) =>
        set((state) => {
          if (!state.byChild[childKey]) return state
          const byChild = { ...state.byChild }
          delete byChild[childKey]
          return { byChild }
        }),
    }),
    { name: 'kiddo.learn', version: 1 },
  ),
)

export function useLearnChild(): LearnChild {
  const key = useChildKey()
  return useLearnStore((state) => state.byChild[key] ?? EMPTY)
}

/** Has the playing child seen this lesson (Learn Before Play)? */
export function useLessonSeen(lessonId: string): boolean {
  return hasSeenLesson(useLearnChild(), lessonId)
}

export function getLearnChild(childKey: string): LearnChild {
  return useLearnStore.getState().byChild[childKey] ?? EMPTY
}

/** Does this skill need practice again? A recent mistake or help, and not yet made up for. */
export function needsReview(stat: SkillStat): boolean {
  return !stat.lastCorrect || (stat.wrong + stat.helped > 0 && stat.streak < 2)
}

/** Skills of a section (and language) that need review, the most troubled first. */
export function weakSkills(
  learn: LearnChild,
  section: SectionId,
  language: LearnLanguage,
): SkillStat[] {
  return Object.values(learn.skills)
    .filter((stat) => stat.section === section && stat.language === language && needsReview(stat))
    .sort(
      (a, b) =>
        b.wrong + b.helped - (a.wrong + a.helped) || a.lastPracticed.localeCompare(b.lastPracticed),
    )
}

/** Skills the child is sure of (two independent right answers in a row). */
export function strongSkills(
  learn: LearnChild,
  section: SectionId,
  language: LearnLanguage,
): SkillStat[] {
  return Object.values(learn.skills).filter(
    (stat) => stat.section === section && stat.language === language && stat.streak >= 2,
  )
}

export function stagesTaught(
  learn: LearnChild,
  section: SectionId,
  language: LearnLanguage,
): string[] {
  return learn.stages[stageKey(section, language)] ?? []
}
