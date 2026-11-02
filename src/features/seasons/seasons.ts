/*
 * Seasons (Phase 45): on a holiday the robot greets the child for it on Home. The admin
 * chooses: by the calendar (`auto`), off, or one holiday now (for the whole family app).
 */

export const SEASONS = ['navruz', 'newYear', 'independence', 'knowledge'] as const
export type Season = (typeof SEASONS)[number]
export type SeasonSetting = 'auto' | 'off' | Season

export const SEASON_SETTINGS: readonly SeasonSetting[] = ['auto', 'off', ...SEASONS]

/** Calendar windows, inclusive, as [month, day] (local date). */
const WINDOWS: Record<Season, readonly [[number, number], [number, number]]> = {
  // Navro‘z: 21 March, with the week around it
  navruz: [
    [3, 14],
    [3, 24],
  ],
  // the New Year window crosses into January
  newYear: [
    [12, 25],
    [1, 3],
  ],
  // Independence Day: 1 September; Knowledge Day (the first school day) follows it
  independence: [
    [8, 28],
    [9, 1],
  ],
  knowledge: [
    [9, 2],
    [9, 6],
  ],
}

const within = (
  month: number,
  day: number,
  [[fm, fd], [tm, td]]: readonly [[number, number], [number, number]],
) => {
  const value = month * 100 + day
  const from = fm * 100 + fd
  const to = tm * 100 + td
  return from <= to ? value >= from && value <= to : value >= from || value <= to
}

/** The holiday a date falls in, or null. */
export function seasonOn(date: Date): Season | null {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return SEASONS.find((season) => within(month, day, WINDOWS[season])) ?? null
}

/** The season shown now: the admin's choice, or the calendar's. */
export function activeSeason(setting: SeasonSetting, date: Date): Season | null {
  if (setting === 'off') return null
  if (setting === 'auto') return seasonOn(date)
  return setting
}

export function isSeasonSetting(value: unknown): value is SeasonSetting {
  return typeof value === 'string' && (SEASON_SETTINGS as readonly string[]).includes(value)
}
