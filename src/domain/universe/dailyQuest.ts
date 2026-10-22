import { useMemo } from 'react'
import { grantReward } from '@/domain/rewards/rewardStore'
import type { AgeLevel } from '@/features/age/ageLevel'
import { dailyPlanState, type PlanStepStatus } from '@/features/home/dailyPlan'
import { EMPTY_LEARN_CHILD, useLearnStore, type SessionRecord } from '@/features/learn/learnStore'
import { levelOfChild, useFamilyStore } from '@/store/familyStore'
import {
  EMPTY_PROGRESS,
  useChildKey,
  useProgressStore,
  type TaskResult,
} from '@/store/progressStore'
import {
  checkAchievements,
  emitUniverse,
  grantResource,
  localDay,
  markQuestClaimed,
  refreshIfStale,
  universeChild,
  useUniverseStore,
} from './store'
import type { AwardSummary } from './types'

/*
 * The daily quest is a day's plan (features/home/dailyPlan: DAILY_PLANS by
 * age). When every step is done the child may claim it once for that day:
 * +1 crystal (reason 'quest', refId `daily|<day>`) and QUEST_COINS coins
 * (grantReward reason 'quest', the same refId). The reward is known up
 * front, and a quest finished late in the evening is never lost at midnight:
 * yesterday's completed quest stays claimable until today's quest is claimed.
 */

export const QUEST_COINS = 5
export const QUEST_CRYSTALS = 1

export const questRef = (day: string) => `daily|${day}`

export interface DailyQuestStep {
  activity: string
  status: PlanStepStatus
}

export interface DailyQuestState {
  /** The quest's own day (YYYY-MM-DD); claim this day. */
  day: string
  steps: DailyQuestStep[]
  complete: boolean
  claimed: boolean
  reward: { crystals: 1; coins: number }
}

/** Why a claim gave nothing. */
export type ClaimFailure = 'not-complete' | 'claimed' | 'expired' | 'future'

export type ClaimOutcome =
  { award: AwardSummary; reason: null } | { award: null; reason: ClaimFailure }

/** Learning sections finished on `day` (they count when the plan contains them). */
export function sectionsDoneOn(sessions: readonly SessionRecord[], day: string): string[] {
  return sessions.filter((session) => localDay(new Date(session.at)) === day).map((s) => s.section)
}

/** The local day before `day` (YYYY-MM-DD). */
export function dayBefore(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return localDay(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) - 1, 12))
}

/** Pure: the quest for a day from the child's results, sessions and claims. */
export function dailyQuestState(
  results: readonly TaskResult[],
  sessions: readonly SessionRecord[],
  day: string,
  level: AgeLevel,
  claimedDays: readonly string[],
): DailyQuestState {
  const plan = dailyPlanState(results, day, level, sectionsDoneOn(sessions, day))
  return {
    day,
    steps: plan.steps.map((step) => ({ activity: step.game, status: step.status })),
    complete: plan.complete,
    claimed: claimedDays.includes(day),
    reward: { crystals: QUEST_CRYSTALS, coins: QUEST_COINS },
  }
}

/**
 * Pure: which day's quest to show. Yesterday's, while it is complete and
 * unclaimed and today's has not been claimed yet; otherwise today's.
 */
export function pendingQuestDay(
  today: string,
  yesterdayComplete: boolean,
  claimedDays: readonly string[],
): string {
  const yesterday = dayBefore(today)
  return yesterdayComplete && !claimedDays.includes(yesterday) && !claimedDays.includes(today)
    ? yesterday
    : today
}

function levelOf(childKey: string): AgeLevel {
  const child = useFamilyStore.getState().children.find((item) => item.id === childKey) ?? null
  return levelOfChild(child)
}

function questOn(childKey: string, day: string): DailyQuestState {
  return dailyQuestState(
    useProgressStore.getState().byChild[childKey]?.results ?? [],
    useLearnStore.getState().byChild[childKey]?.sessions ?? [],
    day,
    levelOf(childKey),
    universeChild(childKey).questsClaimed,
  )
}

/**
 * The quest to show a child now (`at` a Date), or the quest of a given day
 * (`at` a YYYY-MM-DD string).
 */
export function getDailyQuest(childKey: string, at: Date | string = new Date()): DailyQuestState {
  if (typeof at === 'string') return questOn(childKey, at)
  const today = localDay(at)
  const yesterday = questOn(childKey, dayBefore(today))
  return questOn(
    childKey,
    pendingQuestDay(today, yesterday.complete, universeChild(childKey).questsClaimed),
  )
}

/**
 * Claims the quest of `day` (default: the quest shown now) once. Today's
 * quest, or yesterday's while today's is unclaimed, can be claimed; the
 * outcome says why nothing was given.
 */
export function tryClaimDailyQuest(
  childKey: string,
  day?: string,
  now: Date = new Date(),
): ClaimOutcome {
  const fail = (reason: ClaimFailure): ClaimOutcome => ({ award: null, reason })
  refreshIfStale(childKey)
  const today = localDay(now)
  const questDay = day ?? getDailyQuest(childKey, now).day
  const claimedDays = universeChild(childKey).questsClaimed
  if (questDay > today) return fail('future')
  if (questDay !== today && (questDay !== dayBefore(today) || claimedDays.includes(today))) {
    return fail(claimedDays.includes(questDay) ? 'claimed' : 'expired')
  }
  const quest = questOn(childKey, questDay)
  if (quest.claimed) return fail('claimed')
  if (!quest.complete) return fail('not-complete')
  const crystal = grantResource({
    childKey,
    resource: 'crystal',
    amount: QUEST_CRYSTALS,
    reason: 'quest',
    refId: questRef(questDay),
  })
  markQuestClaimed(childKey, questDay)
  if (!crystal) return fail('claimed')
  grantReward({ childKey, coins: QUEST_COINS, reason: 'quest', refId: questRef(questDay) })
  const award: AwardSummary = {
    stars: 0,
    crystals: QUEST_CRYSTALS,
    parts: 0,
    scrolls: 0,
    achievements: checkAchievements(childKey),
    starGain: 0,
  }
  emitUniverse({ type: 'quest.claimed', childKey, day: questDay, award })
  return { award, reason: null }
}

/**
 * Claims a quest; null when nothing was given (see `tryClaimDailyQuest` for
 * the reason). `at`: a Date claims the quest shown at that time, a
 * YYYY-MM-DD string claims that day's quest.
 */
export function claimDailyQuest(
  childKey: string,
  at: Date | string = new Date(),
  now: Date = new Date(),
): AwardSummary | null {
  return typeof at === 'string'
    ? tryClaimDailyQuest(childKey, at, now).award
    : tryClaimDailyQuest(childKey, undefined, at).award
}

/** The quest to show the active child (today's, or yesterday's still to claim). */
export function useDailyQuest(): DailyQuestState & {
  claim: () => AwardSummary | null
  tryClaim: () => ClaimOutcome
} {
  const childKey = useChildKey()
  const results = useProgressStore((s) => (s.byChild[childKey] ?? EMPTY_PROGRESS).results)
  const sessions = useLearnStore((s) => (s.byChild[childKey] ?? EMPTY_LEARN_CHILD).sessions)
  const child = useFamilyStore((s) => s.children.find((item) => item.id === childKey) ?? null)
  const claimed = useUniverseStore((s) => s.byChild[childKey]?.questsClaimed)
  const today = localDay()
  return useMemo(() => {
    const level = levelOfChild(child)
    const days = claimed ?? []
    const yesterday = dailyQuestState(results, sessions, dayBefore(today), level, days)
    const day = pendingQuestDay(today, yesterday.complete, days)
    const quest = day === today ? dailyQuestState(results, sessions, today, level, days) : yesterday
    return {
      ...quest,
      claim: () => tryClaimDailyQuest(childKey, day).award,
      tryClaim: () => tryClaimDailyQuest(childKey, day),
    }
  }, [results, sessions, today, child, claimed, childKey])
}
