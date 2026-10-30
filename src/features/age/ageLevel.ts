import { contentTier, priorLevel } from '@/domain/adaptive/ageProfile'
import type { GameType } from '@/features/tasks/games'
import { isLeapYear } from '@/lib/dates'

/*
 * Every age shapes how the games are presented (answers shown, pairs, today's
 * plan) and which games are suggested first. Nothing is locked by age
 * (Phase 22, §17): an age only suggests; a younger child may play anything.
 */

export const AGE_LEVELS = [4, 5, 6] as const
export type AgeLevel = (typeof AGE_LEVELS)[number]

export const MIN_AGE: AgeLevel = 4
export const MAX_AGE: AgeLevel = 6
/**
 * No maximum age (Phase 22): the birth date is the only age source and any
 * learner from 4 up can have a profile. The age bands (domain/adaptive) only
 * shape the presentation and the starting point; an older learner gets every
 * game (level 6) and the work their answers show, with no ceiling (mastery).
 * The earliest birth date accepted only guards against typing errors.
 */
export const EARLIEST_BIRTH_DATE = '1900-01-01'
/** Without a profile (guest play) everything is open. */
export const GUEST_LEVEL: AgeLevel = 6

/** The age from which each game is suggested (never a lock). */
export const GAME_MIN_LEVEL: Record<GameType, AgeLevel> = {
  'find-picture': 4,
  memory: 4,
  'find-letter': 5,
  trace: 6,
}
/** The age from which 6–10 are suggested; every number is open to everyone. */
export const NUMBERS_FULL_LEVEL: AgeLevel = 5

/** How many answers a choice game shows: fewer for younger children. */
export const OPTION_COUNT: Record<AgeLevel, Record<'find-letter' | 'find-picture', number>> = {
  4: { 'find-letter': 3, 'find-picture': 2 },
  5: { 'find-letter': 3, 'find-picture': 3 },
  6: { 'find-letter': 4, 'find-picture': 3 },
}

/** Pairs of cards in the memory game. */
export const MEMORY_PAIRS: Record<AgeLevel, number> = { 4: 3, 5: 4, 6: 4 }

/** Today’s plan for each age. */
export const DAILY_PLANS: Record<AgeLevel, readonly GameType[]> = {
  4: ['find-picture', 'memory'],
  5: ['find-letter', 'find-picture', 'memory'],
  6: ['find-letter', 'find-picture', 'trace'],
}

/** What is newly suggested on reaching an age, for the birthday celebration. */
export type Suggestion = GameType | 'numbers'

export function suggestedAt(level: AgeLevel): Suggestion[] {
  const games = (Object.keys(GAME_MIN_LEVEL) as GameType[]).filter(
    (game) => GAME_MIN_LEVEL[game] === level,
  )
  const extra: Suggestion[] = []
  if (level === NUMBERS_FULL_LEVEL) extra.push('numbers')
  return [...games, ...extra]
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

function parts(day: string): [number, number, number] | null {
  const match = ISO_DAY.exec(day)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** Is this a real calendar date written as YYYY-MM-DD? */
export function isValidDay(day: string): boolean {
  const p = parts(day)
  if (!p) return false
  const [y, m, d] = p
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** Full years between a birth date and a day, both YYYY-MM-DD. */
export function ageOn(birthDate: string, today: string): number {
  const born = parts(birthDate)
  const now = parts(today)
  if (!born || !now) return 0
  let age = now[0] - born[0]
  // someone born on 29 February has their birthday on the 28th in other years,
  // the same day the birthday party is held (birthday.ts birthdayIn)
  const bornDay = born[1] === 2 && born[2] === 29 && !isLeapYear(now[0]) ? 28 : born[2]
  if (now[1] < born[1] || (now[1] === born[1] && now[2] < bornDay)) age -= 1
  return age
}

/**
 * The young presentation tier of an age before any evidence: the age
 * profile's prior level as a content tier (domain/adaptive/ageProfile), so
 * age has one source. Used for age suggestions, the daily plan and the age
 * look; learning screens ask `useContentTier(strand)`, which follows mastery.
 */
export function levelForAge(age: number): AgeLevel {
  return contentTier(priorLevel(age))
}

/** A birth date that makes the child `age` on `today` (used to migrate old profiles). */
export function birthDateForAge(age: number, today: string): string {
  const now = parts(today) ?? [2026, 1, 1]
  const month = String(now[1]).padStart(2, '0')
  // 29 February does not exist in most years.
  const day = String(now[1] === 2 && now[2] === 29 ? 28 : now[2]).padStart(2, '0')
  return `${now[0] - age}-${month}-${day}`
}

/** Whole days from `today` until `day` (0 when it has passed). */
export function daysUntil(day: string, today: string): number {
  const a = parts(today)
  const b = parts(day)
  if (!a || !b) return 0
  const diff = Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])
  return Math.max(0, Math.round(diff / 86_400_000))
}

/** Can a learner of this birth date be added? From 4, with no maximum age. */
export function isAllowedBirthDate(birthDate: string, today: string): boolean {
  if (!isValidDay(birthDate) || birthDate < EARLIEST_BIRTH_DATE) return false
  return ageOn(birthDate, today) >= MIN_AGE
}

/** Is this game suggested at this age yet? Only a hint: every game can be played. */
export function isGameSuggested(game: GameType, level: AgeLevel): boolean {
  return level >= GAME_MIN_LEVEL[game]
}
