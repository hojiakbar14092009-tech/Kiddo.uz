import type { Strand } from '@/domain/universe/types'
import type { Season } from '@/features/seasons/seasons'

/*
 * Living mascots (Phase 26): what KidoBot says when the child comes home
 * depends on the child's day, deterministically — the time of day, a
 * birthday, homework waiting, a finished plan. No AI: a fixed priority and
 * fixed, kind sentences in three languages.
 */

export type DayPart = 'morning' | 'day' | 'evening' | 'night'

/** 05–11 morning, 12–17 day, 18–21 evening, otherwise night (local hours). */
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'day'
  if (hour >= 18 && hour < 22) return 'evening'
  return 'night'
}

export interface HomeLifeInput {
  hour: number
  /** null for a guest. */
  name: string | null
  /** In the birthday week (features/birthday). */
  birthday: boolean
  /** Open homework (letters and activities). */
  homework: number
  planDone: boolean
  /** In the admin's rest hours (Phase 45); without it, night is 22–05. */
  resting?: boolean
  /** A holiday now (Phase 45, features/seasons): greeted for, instead of the time of day. */
  season?: Season | null
  /** What the robot remembers of the days before (local data only, Phase 43). */
  memory?: MascotMemory
}

/** What the robot remembers, from the child's own progress on this device. */
export interface MascotMemory {
  /** A friendship day (FRIEND_DAYS) reached and not said yet, or null. */
  friendDay: number | null
  /** What the child did yesterday (most of it), or null when the child did not play. */
  yesterday: MemoryTopic | null
  /** Days since the child last played (0: played today, or never). */
  awayDays: number
}

export type MemoryTopic = 'letters' | 'numbers' | 'explore' | 'play'

/** What a strand was about, in the robot's words ("yesterday we …"). */
const TOPIC_OF: Record<Strand, MemoryTopic> = {
  letters: 'letters',
  reading: 'letters',
  number: 'numbers',
  science: 'explore',
  space: 'explore',
  language: 'play',
  logic: 'play',
  art: 'play',
  social: 'play',
}

/** The days played together on which the robot says so (each once). */
export const FRIEND_DAYS = [3, 7, 14, 30, 100] as const

const DAY_MS = 86_400_000

function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty!, tm! - 1, td!) - Date.UTC(fy!, fm! - 1, fd!)) / DAY_MS)
}

export interface MemorySources {
  today: string
  /** The robot's own count of days played (progressStore `robotBond`); not capped. */
  bond?: { days: number; last: string; said?: number }
  /** Local days of letter-game results (capped history). */
  resultDays: readonly string[]
  /** Finished runs (capped history), with an ISO time and a strand. */
  runs: readonly { at: string; strand: Strand }[]
}

/** The distinct local days with play in the (capped) history, oldest first. */
export function historyDays(input: Omit<MemorySources, 'bond'>): string[] {
  const days = new Set<string>(input.resultDays)
  for (const run of input.runs) {
    const at = new Date(run.at)
    if (!Number.isNaN(at.getTime())) days.add(localDay(at))
  }
  return [...days].filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)).sort()
}

/**
 * What the robot remembers (Phase 43): a friendship day to say (from its own uncapped count,
 * each said once), what was played yesterday (by finished runs, one each), and how long the
 * child was away. Pure; the caller passes only the active child's own data.
 */
export function mascotMemory(input: MemorySources): MascotMemory {
  const { today, bond } = input
  const history = historyDays(input)
  const before = history.filter((day) => daysBetween(day, today) > 0)
  const bondLast = bond && /^\d{4}-\d{2}-\d{2}$/.test(bond.last) ? bond.last : null
  const lasts = [before[before.length - 1], bondLast].filter(
    (day): day is string => day !== undefined && day !== null && daysBetween(day, today) > 0,
  )
  const last = lasts.sort()[lasts.length - 1]
  const playedToday = history.includes(today) || bondLast === today
  const topics = new Map<MemoryTopic, number>()
  for (const run of input.runs) {
    const at = new Date(run.at)
    if (Number.isNaN(at.getTime()) || daysBetween(localDay(at), today) !== 1) continue
    const topic = TOPIC_OF[run.strand] ?? 'play'
    topics.set(topic, (topics.get(topic) ?? 0) + 1)
  }
  let yesterday: MemoryTopic | null = null
  let most = 0
  for (const [topic, count] of topics) {
    if (count > most) {
      yesterday = topic
      most = count
    }
  }
  // the latest friendship day reached and not said yet: one passed while another line came
  // first is still said on a later visit (within a week of it, while it is still true)
  const days = bond?.days ?? 0
  const said = bond?.said ?? 0
  const reached = FRIEND_DAYS.filter((mark) => mark <= days && mark > said)
  const mark = reached[reached.length - 1]
  const friendDay = mark !== undefined && days - mark <= 7 ? mark : null
  return {
    friendDay,
    yesterday,
    awayDays: playedToday || !last ? 0 : daysBetween(last, today),
  }
}

export interface HomeLine {
  /** i18n key under `mascot.life`. */
  key: string
  params: Record<string, string | number>
}

/**
 * The robot's line on Home: birthday, then homework, then a finished plan, then what it
 * remembers (missing the child, a friendship day, yesterday's play), then the time of day —
 * except at night, when the robot only says it is time to rest.
 */
export function homeLine(input: HomeLifeInput): HomeLine {
  const named = input.name ? 'Named' : ''
  const params: Record<string, string | number> = input.name ? { name: input.name } : {}
  if (input.resting ?? dayPart(input.hour) === 'night') return { key: `night${named}`, params }
  if (input.birthday) return { key: `birthday${named}`, params }
  if (input.homework > 0) {
    return { key: `homework${named}`, params: { ...params, count: input.homework } }
  }
  if (input.planDone) return { key: 'planDone', params }
  const memory = input.memory
  if (memory) {
    // missing a child who was away comes first; a friendship day waits for the next visit
    if (memory.awayDays >= 3) return { key: `missed${named}`, params }
    if (memory.friendDay) return { key: `friend${memory.friendDay}${named}`, params }
    if (memory.yesterday) return { key: `yesterday.${memory.yesterday}`, params: {} }
  }
  if (input.season) return { key: `season.${input.season}`, params: {} }
  // outside the admin's rest hours it is never "time to rest": a late evening or an early morning
  const late = dayPart(input.hour)
  if (late === 'night') {
    return { key: `${input.hour >= 12 ? 'evening' : 'morning'}${named}`, params }
  }
  const part = dayPart(input.hour)
  return { key: `${part}${named}`, params }
}
