import { describe, expect, it } from 'vitest'
import type { PlayedRun } from '../insights/insights'
import { gettingStronger, learningNow, runsOnDay } from './glance'

const now = new Date('2026-10-30T12:00:00')
const run = (
  id: string,
  strand: PlayedRun['strand'],
  daysAgo: number,
  independent = 5,
  total = 5,
): PlayedRun => ({
  id,
  activity: 'x',
  strand,
  at: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
  independent,
  total,
})

describe('Parent first view numbers', () => {
  it('today counts every kind of activity, not only letter games', () => {
    expect(
      runsOnDay(
        [run('a', 'number', 0), run('b', 'language', 0), run('c', 'number', 1)],
        '2026-10-30',
      ),
    ).toBe(2)
  })

  it('learning now: the last two weeks only, most played first', () => {
    const runs = [
      run('a', 'science', 40),
      run('b', 'science', 41),
      run('c', 'number', 2),
      run('d', 'number', 3),
      run('e', 'language', 1),
    ]
    expect(learningNow(runs, now)).toEqual(['number', 'language'])
    expect(learningNow([run('a', 'science', 40)], now)).toEqual([])
  })

  it('getting stronger: own recent answers better than own earlier ones, with enough of each', () => {
    const runs = [
      run('e1', 'number', 30, 2, 5),
      run('r1', 'number', 2, 5, 5),
      run('e2', 'language', 30, 4, 5),
      run('r2', 'language', 2, 4, 5),
      run('r3', 'science', 2, 5, 5), // nothing earlier: no claim
    ]
    expect(gettingStronger(runs, now)).toEqual(['number'])
    expect(
      gettingStronger([run('e', 'number', 30, 1, 2), run('r', 'number', 1, 2, 2)], now),
    ).toEqual([])
  })
})
