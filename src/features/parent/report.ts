import type { Language } from '@/content/languages'
import { dayKey } from '@/features/tasks/rules'
import type { ChildProgress, TaskResult } from '@/store/progressStore'

export interface DaySummary {
  tasks: number
  coins: number
  mistakes: number
  minutes: number
  results: TaskResult[]
}

export function daySummary(progress: ChildProgress, day: string): DaySummary {
  const results = progress.results.filter((result) => result.day === day)
  return {
    tasks: results.length,
    coins: results.reduce((sum, result) => sum + result.coins, 0),
    mistakes: results.reduce((sum, result) => sum + result.mistakes, 0),
    minutes: Math.round(progress.minutesByDay[day] ?? 0),
    results,
  }
}

export interface DayCoins {
  day: string
  coins: number
}

/** Coins earned on each of the last seven days, oldest first, today last. */
export function weeklyCoins(
  progress: Pick<ChildProgress, 'results'>,
  today: Date = new Date(),
): DayCoins[] {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return dayKey(date)
  })
  return days.map((day) => ({
    day,
    coins: progress.results
      .filter((result) => result.day === day)
      .reduce((sum, result) => sum + result.coins, 0),
  }))
}

export interface ConfusionPair {
  language: Language
  /** The letter the child was asked for. */
  targetId: string
  /** The letter the child picked instead. */
  chosenId: string
  count: number
}

/**
 * Which letters get mixed up, most frequent first: “Sh instead of Ch”.
 * Tracing retries (target = chosen) are not confusions and are left out.
 */
export function confusionPairs(progress: ChildProgress, limit = 5): ConfusionPair[] {
  const counts = new Map<string, ConfusionPair>()
  for (const result of progress.results) {
    for (const { targetId, chosenId } of result.mistakeDetails) {
      if (targetId === chosenId) continue
      const key = `${result.language}:${targetId}:${chosenId}`
      const pair = counts.get(key)
      if (pair) pair.count += 1
      else counts.set(key, { language: result.language, targetId, chosenId, count: 1 })
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}

export interface StrugglingLetter {
  letterId: string
  mistakes: number
}

/** Letters that still need practice in one language, hardest first. */
export function strugglingLetters(
  progress: ChildProgress,
  language: Language,
  limit = 8,
): StrugglingLetter[] {
  return Object.entries(progress.struggles[language] ?? {})
    .map(([letterId, mistakes]) => ({ letterId, mistakes }))
    .filter((entry) => entry.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes)
    .slice(0, limit)
}
