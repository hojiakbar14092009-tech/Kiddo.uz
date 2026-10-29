import { describe, expect, it } from 'vitest'
import type { ResourceEntry } from '@/domain/universe/types'
import type { LearnChild, SessionRecord } from '@/features/learn/learnStore'
import { dayKey } from '@/features/tasks/rules'
import type { TaskResult } from '@/store/progressStore'
import {
  collectRuns,
  healthyPlay,
  lastSevenDays,
  medalsAndCity,
  skillRows,
  strandLevelWord,
  strengths,
  suggestions,
  weekSummary,
  type PlayedRun,
  type StrandRow,
} from './insights'

const TODAY = new Date(2026, 9, 23, 15, 0) // Fri 23 Oct 2026, local time

function localIso(daysAgo: number, hour = 10): string {
  const date = new Date(TODAY)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const result = (id: string, at: string, mistakes = 0): TaskResult => ({
  id,
  type: 'find-letter',
  language: 'uz',
  letterIds: ['a', 'b'],
  mistakes,
  mistakeDetails: [],
  coins: 5,
  stars: 3,
  stickerId: null,
  day: dayKey(new Date(at)),
  finishedAt: at,
})

const session = (id: string, at: string): SessionRecord => ({
  weakSkills: [],
  strongSkills: [],
  id,
  section: 'words',
  stage: '4',
  language: 'uz',
  mode: 'learn',
  coins: 2,
  at,
  total: 6,
  independent: 3,
  wrong: 2,
  helped: 1,
})

const learn = (sessions: SessionRecord[]): Pick<LearnChild, 'sessions'> => ({ sessions })

describe('collectRuns', () => {
  it('merges the universe log, letter games and learning sessions, each id once, newest first', () => {
    const runs = collectRuns('kid', {
      progress: { results: [result('t1', localIso(2)), result('dup', localIso(1))] },
      learn: learn([session('s1', localIso(0))]),
      recent: [
        {
          id: 'dup',
          activity: 'find-letter:uz',
          strand: 'letters',
          at: localIso(1),
          stars: 3,
          independent: 5,
          total: 5,
        },
        {
          id: 'm1',
          activity: 'math-lab:count:L1',
          strand: 'number',
          at: localIso(0, 12),
          stars: 2,
          independent: 4,
          total: 5,
        },
      ],
    })
    expect(runs.map((run) => run.id)).toEqual(['m1', 's1', 'dup', 't1'])
    expect(runs.find((run) => run.id === 't1')).toMatchObject({
      activity: 'find-letter:uz',
      strand: 'letters',
      total: 5,
      independent: 5,
    })
    expect(runs.find((run) => run.id === 's1')).toMatchObject({
      activity: 'words:4',
      strand: 'reading',
      total: 6,
      independent: 3,
    })
  })

  it('skips entries with a broken time', () => {
    const runs = collectRuns('kid', {
      progress: { results: [result('bad', 'not a date')] },
      learn: learn([]),
      recent: undefined,
    })
    expect(runs).toEqual([])
  })
})

describe('weekSummary', () => {
  const runs: PlayedRun[] = [
    { id: 'a', activity: 'x', strand: 'number', at: localIso(0), independent: 1, total: 1 },
    { id: 'b', activity: 'x', strand: 'number', at: localIso(0, 11), independent: 1, total: 1 },
    { id: 'c', activity: 'x', strand: 'number', at: localIso(3), independent: 1, total: 1 },
    { id: 'old', activity: 'x', strand: 'number', at: localIso(9), independent: 1, total: 1 },
  ]
  const entry = (
    resource: ResourceEntry['resource'],
    amount: number,
    daysAgo: number,
    reason = 'r',
  ) =>
    ({
      id: `${resource}${amount}${daysAgo}${reason}`,
      childKey: 'kid',
      resource,
      amount,
      reason,
      refId: 'x',
      at: localIso(daysAgo),
    }) as ResourceEntry

  it('has seven days, oldest first, today last', () => {
    const days = lastSevenDays(TODAY)
    expect(days).toHaveLength(7)
    expect(days[6]).toBe('2026-10-23')
    expect(days[0]).toBe('2026-10-17')
  })

  it('counts minutes and activities per day, totals and this week’s resources', () => {
    const week = weekSummary(
      {
        minutesByDay: { '2026-10-23': 12.4, '2026-10-20': 7.6, '2026-10-10': 99 },
        runs,
        ledger: [
          entry('star', 3, 0),
          entry('star', 2, 6),
          entry('crystal', 1, 1),
          entry('crystal', -1, 1), // spending never lowers what was earned
          entry('scroll', 1, 2),
          entry('star', 5, 8), // last week
          entry('part', 1, 0), // not shown
          entry('star', 50, 0, 'admin'), // a grown-up's grant is not earned
        ],
        results: [result('t1', localIso(0)), result('t2', localIso(3)), result('t3', localIso(10))],
      },
      TODAY,
    )
    expect(week.days.map((day) => day.minutes)).toEqual([0, 0, 0, 8, 0, 0, 12])
    expect(week.days.map((day) => day.activities)).toEqual([0, 0, 0, 1, 0, 0, 2])
    expect(week.totalMinutes).toBe(20)
    expect(week.totalActivities).toBe(3)
    expect(week.earned).toEqual({ star: 5, crystal: 1, scroll: 1 })
    expect(week.activeDays).toBe(2)
    // coins as the Today panel counts them (finished letter games and tests)
    expect(week.days.map((day) => day.coins)).toEqual([0, 0, 0, 5, 0, 0, 5])
    expect(week.totalCoins).toBe(10)
  })

  it('puts a run at 23:30 local time on that local day', () => {
    const late = new Date(TODAY)
    late.setDate(late.getDate() - 1)
    late.setHours(23, 30, 0, 0)
    const early = new Date(TODAY)
    early.setHours(0, 15, 0, 0)
    const week = weekSummary(
      {
        minutesByDay: {},
        runs: [
          {
            id: 'late',
            activity: 'x',
            strand: 'number',
            at: late.toISOString(),
            independent: 1,
            total: 1,
          },
          {
            id: 'early',
            activity: 'x',
            strand: 'number',
            at: early.toISOString(),
            independent: 1,
            total: 1,
          },
        ],
        ledger: [],
      },
      TODAY,
    )
    expect(week.days.at(-2)).toMatchObject({ day: '2026-10-22', activities: 1 })
    expect(week.days.at(-1)).toMatchObject({ day: '2026-10-23', activities: 1 })
  })

  it('is all zeros for a child who has not played', () => {
    const week = weekSummary({ minutesByDay: {}, runs: [], ledger: [] }, TODAY)
    expect(week.totalMinutes + week.totalActivities + week.activeDays).toBe(0)
    expect(healthyPlay(week.days)).toEqual({ averageMinutes: 0, daysPlayed: 0 })
  })
})

describe('healthyPlay', () => {
  it('averages the minutes over the days played', () => {
    const days = [10, 0, 20, 0, 0, 0, 15].map((minutes, index) => ({
      day: `d${index}`,
      minutes,
      activities: 0,
      coins: 0,
    }))
    expect(healthyPlay(days)).toEqual({ averageMinutes: 15, daysPlayed: 3 })
  })
})

describe('strand words', () => {
  it('names the levels 1–5 in words and clamps anything else', () => {
    expect([1, 2, 3, 4, 5].map(strandLevelWord)).toEqual([
      'gettingStarted',
      'practising',
      'confident',
      'strong',
      'advanced',
    ])
    expect(strandLevelWord(0)).toBe('gettingStarted')
    expect(strandLevelWord(9)).toBe('advanced')
    expect(strandLevelWord(Number.NaN)).toBe('gettingStarted')
  })
})

describe('skillRows', () => {
  let n = 0
  const run = (
    strand: PlayedRun['strand'],
    independent: number,
    total: number,
    activity = 'x',
  ): PlayedRun => ({
    id: `run${(n += 1)}`,
    activity,
    strand,
    at: localIso(0),
    independent,
    total,
  })

  it('shows only strands with activity; the adaptive profile is the only source of level and its accuracy', () => {
    const view = skillRows({
      strands: { number: { level: 4, streak: 0, runs: 3, independent: 9, total: 10 } },
      byStrand: { number: 3, letters: 2 },
      runs: [
        run('letters', 3, 5, 'find-letter:uz'),
        run('letters', 2, 5, 'find-picture:uz'),
        run('art', 1, 1, 'studio:creation'),
        // the adaptive runs themselves are in the log too: never counted twice
        run('number', 0, 5, 'math-lab:count:L1'),
      ],
      age: 5,
    })
    expect(view.active.map((row) => row.strand)).toEqual(['letters', 'number', 'art'])
    expect(view.active.find((row) => row.strand === 'number')).toMatchObject({
      level: 4,
      accuracy: 0.9,
      answered: 10,
      scoredRuns: 3,
      source: 'adaptive',
      runs: 3,
    })
    // letters never adapt: no level word, accuracy from its own scored runs
    expect(view.active.find((row) => row.strand === 'letters')).toMatchObject({
      level: null,
      accuracy: 0.5,
      answered: 10,
      scoredRuns: 2,
      source: 'runs',
    })
    // a picture is never judged
    expect(view.active.find((row) => row.strand === 'art')).toMatchObject({
      level: null,
      accuracy: null,
    })
    expect(view.untouched).toEqual(['reading', 'logic', 'language', 'science', 'space', 'social'])
  })

  it('shows no level after one adaptive run: the age default is not a measurement', () => {
    const one = skillRows({
      strands: { social: { level: 5, streak: 1, runs: 1, independent: 4, total: 4 } },
      byStrand: { social: 1 },
      runs: [],
      age: 6,
    })
    expect(one.active[0]).toMatchObject({ strand: 'social', level: null, accuracy: 1 })
    const two = skillRows({
      strands: { social: { level: 2, streak: 0, runs: 2, independent: 5, total: 8 } },
      byStrand: { social: 2 },
      runs: [],
      age: 6,
    })
    expect(two.active[0]).toMatchObject({ strand: 'social', level: 2 })
  })

  it('leaves the memory game and tracing out of first-answer accuracy', () => {
    const view = skillRows({
      strands: undefined,
      byStrand: undefined,
      runs: [
        run('logic', 1, 5, 'memory:uz'),
        run('letters', 0, 5, 'trace:uz'),
        run('number', 1, 4, 'trace:number:7'),
        run('logic', 4, 5, 'help:4'),
      ],
      age: 5,
    })
    expect(view.active.find((row) => row.strand === 'logic')).toMatchObject({
      runs: 2,
      accuracy: 0.8,
      answered: 5,
      scoredRuns: 1,
    })
    expect(view.active.find((row) => row.strand === 'letters')).toMatchObject({
      runs: 1,
      accuracy: null,
    })
    expect(view.active.find((row) => row.strand === 'number')?.accuracy).toBeNull()
  })

  it('is empty for a child without play', () => {
    const view = skillRows({ strands: undefined, byStrand: undefined, runs: [], age: 4 })
    expect(view.active).toEqual([])
    expect(view.untouched).toHaveLength(9)
  })
})

const row = (
  strand: StrandRow['strand'],
  accuracy: number | null,
  extra: Partial<StrandRow> = {},
): StrandRow => ({
  strand,
  runs: 5,
  level: null,
  mastery: 0,
  accuracy,
  answered: 20,
  scoredRuns: 5,
  source: 'runs',
  ...extra,
})

describe('suggestions', () => {
  it('starts with recent mistake skills, then weak strands, then one new area; max 3, a strand once', () => {
    const list = suggestions(
      {
        rows: [row('letters', 0.4), row('number', 0.5), row('reading', 0.55), row('logic', 0.9)],
        untouched: ['space', 'art'],
        mistakes: [
          { skill: 'sub:within10', strand: 'number', at: localIso(1) },
          { skill: 'sub:within5', strand: 'number', at: localIso(2) },
          { skill: 'add:within5', strand: 'number', at: localIso(2) },
          { skill: 'count:to5', strand: 'number', at: localIso(40) }, // too old
        ],
      },
      TODAY,
    )
    expect(list).toEqual([
      {
        kind: 'skill',
        strand: 'number',
        skill: 'sub',
        nameKey: 'parent.insights.skillNames.sub',
        count: 2,
        route: '/math-lab',
      },
      { kind: 'strand', strand: 'letters', route: '/alphabet' },
      { kind: 'strand', strand: 'reading', route: '/learn/words' },
    ])
  })

  it('needs 15 answers over 3 runs before calling a strand weak, and offers something new', () => {
    const list = suggestions(
      {
        rows: [row('letters', 0.2, { answered: 14 }), row('reading', 0.2, { scoredRuns: 2 })],
        untouched: ['science'],
        mistakes: [],
      },
      TODAY,
    )
    expect(list).toEqual([{ kind: 'explore', strand: 'science', route: '/worlds/dino' }])
  })

  it('may be empty', () => {
    expect(suggestions({ rows: [row('logic', 0.95)], untouched: [] }, TODAY)).toEqual([])
  })
})

describe('strengths', () => {
  it('picks strands with high accuracy on enough data or a measured level 4–5, best first, at most 3', () => {
    const top = strengths([
      row('letters', 0.85),
      row('number', 0.95),
      row('reading', 0.5),
      row('logic', 0.7, { level: 4, source: 'adaptive' }),
      row('space', 0.9, { answered: 10 }), // too few answers
      row('science', 0.9, { scoredRuns: 2 }), // too few runs
      row('social', 0.82),
    ])
    expect(top.map((item) => item.strand)).toEqual(['number', 'letters', 'social'])
  })

  it('never lists a strand that is among the practice ideas', () => {
    const top = strengths([row('number', 0.95), row('letters', 0.85)], ['number'])
    expect(top.map((item) => item.strand)).toEqual(['letters'])
  })

  it('does not count an unmeasured level', () => {
    expect(strengths([row('logic', null, { level: null })])).toEqual([])
  })
})

describe('medalsAndCity', () => {
  it('counts medal tiers and upgraded buildings', () => {
    const view = medalsAndCity({
      achievements: { 'first-steps': 'silver', 'star-collector': 'bronze', bogus: 'gold' },
      buildings: { 'math-land': 2, garden: 1, 'reading-house': 0, nowhere: 3 },
    })
    expect(view.medals).toEqual({ bronze: 1, silver: 1, gold: 0 })
    expect(view.medalsTotal).toBe(2)
    expect(view.medalsPossible).toBe(12)
    expect(view.buildings.map((item) => [item.id, item.level])).toEqual([
      ['math-land', 2],
      ['garden', 1],
    ])
    expect(view.upgrades).toBe(3)
  })

  it('is empty without a universe child', () => {
    expect(medalsAndCity(undefined)).toMatchObject({ medalsTotal: 0, upgrades: 0, buildings: [] })
  })
})
