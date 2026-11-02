/** Installs of the last 30 days and how many came back on day 2 and day 7 (Phase 45). */
export interface Retention {
  installs: number
  /** Installs old enough to come back on day 2 (day 7), and those that did. */
  due2: number
  day2: number
  due7: number
  day7: number
}

const dayIndex = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000)

/**
 * The cohort: installs first opened in the last 30 days; each return counted among the installs
 * old enough for it, so a new install does not pull the share down (the same rule as the server).
 */
export function retentionOf(
  log: readonly { name: string; install: string; day: string }[],
  today: string,
): Retention {
  const now = dayIndex(today)
  const first = new Map<string, number>()
  for (const event of log) {
    if (event.name !== 'first_opened') continue
    const day = dayIndex(event.day)
    if (now - day >= 30 || now - day < 0) continue
    first.set(event.install, Math.min(first.get(event.install) ?? day, day))
  }
  const back = (name: string) =>
    new Set(log.filter((event) => event.name === name).map((event) => event.install))
  const two = back('returned_day2')
  const seven = back('returned_day7')
  let due2 = 0
  let day2 = 0
  let due7 = 0
  let day7 = 0
  for (const [install, day] of first) {
    if (now - day >= 1) {
      due2 += 1
      if (two.has(install)) day2 += 1
    }
    if (now - day >= 6) {
      due7 += 1
      if (seven.has(install)) day7 += 1
    }
  }
  return { installs: first.size, due2, day2, due7, day7 }
}

/** A share as a whole percent (— when there is nothing to divide). */
