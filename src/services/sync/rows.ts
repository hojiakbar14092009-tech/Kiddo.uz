import { childAge, type ChildProfile } from '@/store/familyStore'
import type { ChildProgress, TaskResult } from '@/store/progressStore'
import type { ActivityEvent } from '@/store/activityStore'
import type { RewardEntry } from '@/domain/rewards'
import type { LearnChild } from '@/features/learn/learnStore'

/* Local objects → rows of the Supabase tables in supabase/migrations. */

export function childRow(child: ChildProfile) {
  return {
    id: child.id,
    name: child.name,
    age: childAge(child),
    birth_date: child.birthDate,
    celebrated_level: child.celebratedLevel,
    gender: child.gender,
    mascot: child.mascot,
    daily_limit_minutes: child.dailyLimitMinutes,
    // the jsonb column keeps the whole list
    homework: child.homeworks ?? [],
    created_at: child.createdAt,
  }
}

export function childStateRow(childId: string, progress: ChildProgress) {
  return {
    child_id: childId,
    coins: progress.coins,
    learned: progress.learned,
    struggles: progress.struggles,
    stickers: progress.stickers,
    outfits: progress.outfits,
    wearing: progress.wearing,
    pets: progress.pets ?? [],
    pet: progress.pet ?? null,
    minutes_by_day: progress.minutesByDay,
  }
}

export function resultRow(childId: string, result: TaskResult) {
  return {
    id: result.id,
    child_id: childId,
    type: result.type,
    language: result.language,
    letter_ids: result.letterIds,
    mistakes: result.mistakes,
    mistake_details: result.mistakeDetails,
    coins: result.coins,
    stars: result.stars,
    sticker_id: result.stickerId,
    day: result.day,
    finished_at: result.finishedAt,
  }
}

export function eventRow(event: ActivityEvent) {
  return { id: event.id, child_id: event.childId, kind: event.kind, at: event.at }
}

/** Arguments of the `record_reward` RPC (0005); the server checks and caps them. */
export function rewardRow(entry: RewardEntry) {
  return {
    p_child: entry.childKey,
    p_coins: entry.coins,
    p_reason: entry.reason,
    p_ref: entry.refId,
  }
}

/** One child's learning data from the new sections, as one jsonb document. */
export function learnRow(childId: string, data: LearnChild) {
  return { child_id: childId, data }
}

export type ChildRow = ReturnType<typeof childRow>
export type ChildStateRow = ReturnType<typeof childStateRow>
export type ResultRow = ReturnType<typeof resultRow>
export type EventRow = ReturnType<typeof eventRow>
export type RewardRow = ReturnType<typeof rewardRow>
export type LearnRow = ReturnType<typeof learnRow>
