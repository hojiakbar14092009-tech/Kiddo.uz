import { describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, type ChildProgress, type TaskResult } from '@/store/progressStore'
import { confusionPairs, daySummary, strugglingLetters, weeklyCoins } from './report'

function result(day: string, coins: number, details: [string, string][] = []): TaskResult {
  return {
    id: `${day}-${coins}-${details.length}`,
    type: 'find-letter',
    language: 'uz',
    letterIds: [],
    mistakes: details.length,
    mistakeDetails: details.map(([targetId, chosenId]) => ({ targetId, chosenId })),
    coins,
    stars: 3,
    stickerId: null,
    day,
    finishedAt: `${day}T10:00:00.000Z`,
  }
}

function progress(changes: Partial<ChildProgress>): ChildProgress {
  return { ...EMPTY_PROGRESS, ...changes }
}

describe('parent report', () => {
  it('sums one day', () => {
    const summary = daySummary(
      progress({
        results: [
          result('2026-10-18', 7, [['ch', 'sh']]),
          result('2026-10-18', 5),
          result('2026-10-17', 9),
        ],
        minutesByDay: { '2026-10-18': 12.4 },
      }),
      '2026-10-18',
    )
    expect(summary).toMatchObject({ tasks: 2, coins: 12, mistakes: 1, minutes: 12 })
  })

  it('lists the last seven days with today last', () => {
    const week = weeklyCoins(
      progress({
        results: [result('2026-10-18', 7), result('2026-10-12', 3), result('2026-10-11', 9)],
      }),
      new Date(2026, 9, 18, 15),
    )
    expect(week.map((entry) => entry.day)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
    expect(week.map((entry) => entry.coins)).toEqual([3, 0, 0, 0, 0, 0, 7])
  })

  it('ranks letter confusions and ignores tracing retries', () => {
    const pairs = confusionPairs(
      progress({
        results: [
          result('2026-10-18', 3, [
            ['ch', 'sh'],
            ['b', 'd'],
            ['a', 'a'],
          ]),
          result('2026-10-17', 3, [['ch', 'sh']]),
        ],
      }),
    )
    expect(pairs).toEqual([
      { language: 'uz', targetId: 'ch', chosenId: 'sh', count: 2 },
      { language: 'uz', targetId: 'b', chosenId: 'd', count: 1 },
    ])
  })

  it('lists struggling letters, hardest first', () => {
    const letters = strugglingLetters(progress({ struggles: { uz: { a: 1, ch: 3, b: 0 } } }), 'uz')
    expect(letters).toEqual([
      { letterId: 'ch', mistakes: 3 },
      { letterId: 'a', mistakes: 1 },
    ])
  })
})
