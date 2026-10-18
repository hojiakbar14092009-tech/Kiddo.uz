import { childAge, type ChildProfile } from '@/store/familyStore'
import type { ChildProgress, TaskResult } from '@/store/progressStore'
import type { ActivityEvent } from '@/store/activityStore'

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
    homework: child.homework ?? null,
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

export type ChildRow = ReturnType<typeof childRow>
export type ChildStateRow = ReturnType<typeof childStateRow>
export type ResultRow = ReturnType<typeof resultRow>
export type EventRow = ReturnType<typeof eventRow>
