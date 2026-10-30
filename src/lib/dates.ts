/**
 * “17.10” – day and month as numbers. Browsers do not all ship Uzbek month
 * names, so the parent area uses this short form in every language.
 */
export function formatDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

/** Gregorian leap year (also used for 29 February birthdays). */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Today in Tashkent (YYYY-MM-DD). Ages and birthdays count by this day, the
 * way the server does, whatever the device's time zone (Phase 22). Daily plans
 * and screen time follow the device's own clock instead (tasks/rules dayKey).
 */
export function tashkentDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
