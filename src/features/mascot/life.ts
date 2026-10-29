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
}

export interface HomeLine {
  /** i18n key under `mascot.life`. */
  key: string
  params: Record<string, string | number>
}

/**
 * The robot's line on Home: birthday, then homework, then a finished plan, then the time of
 * day — except at night, when the robot only says it is time to rest.
 */
export function homeLine(input: HomeLifeInput): HomeLine {
  const named = input.name ? 'Named' : ''
  const params: Record<string, string | number> = input.name ? { name: input.name } : {}
  if (dayPart(input.hour) === 'night') return { key: `night${named}`, params }
  if (input.birthday) return { key: `birthday${named}`, params }
  if (input.homework > 0) {
    return { key: `homework${named}`, params: { ...params, count: input.homework } }
  }
  if (input.planDone) return { key: 'planDone', params }
  const part = dayPart(input.hour)
  return { key: `${part}${named}`, params }
}
