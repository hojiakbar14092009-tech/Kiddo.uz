/**
 * “17.10” – day and month as numbers. Browsers do not all ship Uzbek month
 * names, so the parent area uses this short form in every language.
 */
export function formatDayMonth(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}
