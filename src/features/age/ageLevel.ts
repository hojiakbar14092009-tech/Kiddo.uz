import type { GameType } from '@/features/tasks/games'

/*
 * Kiddo is made for children aged 4 to 6. Every age has its own set of games and
 * difficulty; what belongs to an older age stays locked and opens by itself on the
 * birthday that reaches it.
 */

export const AGE_LEVELS = [4, 5, 6] as const
export type AgeLevel = (typeof AGE_LEVELS)[number]

export const MIN_AGE: AgeLevel = 4
export const MAX_AGE: AgeLevel = 6
/** Without a profile (guest play) everything is open. */
export const GUEST_LEVEL: AgeLevel = 6

/** The youngest age each game is open for. */
export const GAME_MIN_LEVEL: Record<GameType, AgeLevel> = {
  'find-picture': 4,
  memory: 4,
  'find-letter': 5,
  trace: 6,
}
export const EXAM_MIN_LEVEL: AgeLevel = 6

/** Numbers a child can open: 1–5 at four, 1–10 from five. */
export const NUMBER_LIMIT: Record<AgeLevel, number> = { 4: 5, 5: 10, 6: 10 }
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

/** What opens on reaching an age, for the birthday celebration. */
export type Unlock = GameType | 'exam' | 'numbers'

export function unlocksAt(level: AgeLevel): Unlock[] {
  const games = (Object.keys(GAME_MIN_LEVEL) as GameType[]).filter(
    (game) => GAME_MIN_LEVEL[game] === level,
  )
  const extra: Unlock[] = []
  if (level === NUMBERS_FULL_LEVEL) extra.push('numbers')
  if (level === EXAM_MIN_LEVEL) extra.push('exam')
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
  if (now[1] < born[1] || (now[1] === born[1] && now[2] < born[2])) age -= 1
  return age
}

export function levelForAge(age: number): AgeLevel {
  if (age <= MIN_AGE) return MIN_AGE
  if (age >= MAX_AGE) return MAX_AGE
  return age as AgeLevel
}

/** A birth date that makes the child `age` on `today` (used to migrate old profiles). */
export function birthDateForAge(age: number, today: string): string {
  const now = parts(today) ?? [2026, 1, 1]
  const month = String(now[1]).padStart(2, '0')
  // 29 February does not exist in most years.
  const day = String(now[1] === 2 && now[2] === 29 ? 28 : now[2]).padStart(2, '0')
  return `${now[0] - age}-${month}-${day}`
}

/** The day a child reaches `level`, e.g. their fifth birthday. */
export function birthdayFor(birthDate: string, level: AgeLevel): string {
  const born = parts(birthDate)
  if (!born) return birthDate
  return `${born[0] + level}-${String(born[1]).padStart(2, '0')}-${String(born[2]).padStart(2, '0')}`
}

/** Whole days from `today` until `day` (0 when it has passed). */
export function daysUntil(day: string, today: string): number {
  const a = parts(today)
  const b = parts(day)
  if (!a || !b) return 0
  const diff = Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])
  return Math.max(0, Math.round(diff / 86_400_000))
}

/** Can a child of this birth date be added? Kiddo is for ages 4 to 6. */
export function isAllowedBirthDate(birthDate: string, today: string): boolean {
  if (!isValidDay(birthDate)) return false
  const age = ageOn(birthDate, today)
  return age >= MIN_AGE && age <= MAX_AGE
}

export function isGameOpen(game: GameType, level: AgeLevel): boolean {
  return level >= GAME_MIN_LEVEL[game]
}
