import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import '@/i18n'
import type { SkillMemory } from '@/domain/learningMemory/memory'
import { emitActivity, useUniverseStore } from '@/domain/universe'
import { EMPTY_LEARN_CHILD } from '@/features/learn/learnStore'
import { dayKey } from '@/features/tasks/rules'
import type { Homework } from '@/store/familyStore'
import { EMPTY_PROGRESS } from '@/store/progressStore'
import { collectRuns, type PlayedRun, type StrandRow } from '../insights/insights'
import { parentSkillNameKey } from '../insights/skillLabel'
import { practiceText, weeklyReport, weeklyReportText } from './weeklyReport'

/*
 * Phase 47: the weekly report — the last seven local days for one child,
 * from the dashboard's own selectors, never an invented number.
 */

// local noon, so the local days are the same in every time zone
const NOW = new Date(2026, 9, 30, 12)
const DAY_MS = 86_400_000
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - days * DAY_MS - hours * 3_600_000)
const dayAgo = (days: number) => dayKey(ago(days))

let seq = 0
function run(at: Date, strand: PlayedRun['strand'] = 'number'): PlayedRun {
  seq += 1
  return {
    id: `run-${seq}`,
    activity: 'math:4',
    strand,
    at: at.toISOString(),
    total: 4,
    independent: 3,
  }
}

function memory(
  key: string,
  resolvedAt: string,
  status: 'resolved' | 'confirmed' = 'resolved',
): SkillMemory {
  return {
    skill: key,
    firstAt: ago(40).toISOString(),
    lastPracticedAt: resolvedAt,
    masteredAt: null,
    misconceptions: {
      slip: {
        code: 'slip',
        status,
        count: 2,
        lastAt: resolvedAt,
        ...(status === 'resolved' ? { resolvedAt } : {}),
      },
    },
  } as unknown as SkillMemory
}

function strong(strand: StrandRow['strand']): StrandRow {
  return {
    strand,
    runs: 10,
    level: null,
    mastery: 0,
    accuracy: 0.9,
    answered: 40,
    scoredRuns: 10,
    source: 'runs',
  }
}

describe('weeklyReport', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz')
  })

  it('an empty week is marked empty, with no invented numbers', () => {
    const report = weeklyReport({ runs: [run(ago(9))], minutesByDay: { [dayAgo(9)]: 20 } }, NOW)
    expect(report.empty).toBe(true)
    expect(report).toMatchObject({
      activeDays: 0,
      totalMinutes: 0,
      activitiesFinished: 0,
      mastered: [],
      strengths: [],
      practice: [],
      homework: null,
    })
    expect(report.days).toHaveLength(7)
    expect(report.days.at(-1)).toBe(dayKey(NOW))
  })

  it('counts the last seven local days only: six days ago is in, seven days ago is out', () => {
    const report = weeklyReport(
      {
        runs: [run(ago(0)), run(ago(0, 2)), run(ago(6)), run(ago(7)), run(ago(12))],
        minutesByDay: { [dayAgo(0)]: 12, [dayAgo(6)]: 30.4, [dayAgo(7)]: 50, [dayAgo(3)]: 10 },
      },
      NOW,
    )
    expect(report.empty).toBe(false)
    expect(report.days[0]).toBe(dayAgo(6))
    expect(report.activitiesFinished).toBe(3)
    expect(report.totalMinutes).toBe(52)
    // today, six days ago, and three days ago (minutes only)
    expect(report.activeDays).toBe(3)
  })

  it('the trend uses the same calendar days as the active days, minutes included', () => {
    // an evening run on the 7th calendar day back is under 168 hours ago, but belongs
    // to the seven days before; a day with minutes only is an active day
    const evening = new Date(2026, 9, 23, 20)
    const report = weeklyReport(
      { runs: [run(ago(1)), run(evening)], minutesByDay: { [dayAgo(3)]: 9 } },
      NOW,
    )
    expect(report.activeDays).toBe(2)
    expect(report.trend).toEqual({ thisWeek: 2, lastWeek: 1, direction: 'more' })
    expect(report.trend.thisWeek).toBe(report.activeDays)
    // minutes-only days count on the earlier side too
    const same = weeklyReport(
      { runs: [run(ago(1))], minutesByDay: { [dayAgo(2)]: 5, [dayAgo(8)]: 4, [dayAgo(13)]: 6 } },
      NOW,
    )
    expect(same.trend).toEqual({ thisWeek: 2, lastWeek: 2, direction: 'same' })
    // fewer than MIN_TREND_DAYS active days in all: no direction
    const thin = weeklyReport({ runs: [run(ago(1)), run(ago(9))], minutesByDay: {} }, NOW)
    expect(thin.trend.direction).toBe('none')
  })

  it('names the trend against the seven days before', () => {
    const more = weeklyReport(
      { runs: [run(ago(1)), run(ago(2)), run(ago(3)), run(ago(9))], minutesByDay: {} },
      NOW,
    )
    expect(more.trend).toEqual({ thisWeek: 3, lastWeek: 1, direction: 'more' })
    const first = weeklyReport({ runs: [run(ago(1))], minutesByDay: {} }, NOW)
    expect(first.trend.direction).toBe('none')
  })

  it('lists skills that came right this week once per name, never one practised again', () => {
    const report = weeklyReport(
      {
        runs: [run(ago(1))],
        minutesByDay: {},
        memory: {
          a: memory('math:add:within10', ago(2).toISOString()),
          b: memory('math:add:within20', ago(3).toISOString()),
          c: memory('math:sub:within10', ago(4).toISOString()),
          // ten days ago: not this week
          d: memory('math:missing:add', ago(10).toISOString()),
          // came right, but the same name is being practised again
          e: memory('math:count:within5', ago(2).toISOString()),
          f: memory('math:count:within10', ago(1).toISOString(), 'confirmed'),
        },
      },
      NOW,
    )
    expect(report.mastered).toEqual([
      parentSkillNameKey('math:add:within10'),
      parentSkillNameKey('math:sub:within10'),
    ])
    expect(report.mastered).toEqual([
      'parent.insights.skillNames.add',
      'parent.insights.skillNames.sub',
    ])
  })

  it('things to practise: struggling letters first, then the suggestions, at most three', () => {
    const report = weeklyReport(
      {
        runs: [run(ago(1))],
        minutesByDay: {},
        language: 'uz',
        struggling: [
          { letterId: 'sh', mistakes: 4 },
          { letterId: 'a', mistakes: 1 },
        ],
        suggestions: [
          { kind: 'skill', strand: 'number', skill: 'add', nameKey: 'k.add', count: 3, route: '/' },
          {
            kind: 'skill',
            strand: 'science',
            skill: 'add',
            nameKey: 'k.add',
            count: 1,
            route: '/',
          },
          { kind: 'strand', strand: 'logic', route: '/' },
          { kind: 'explore', strand: 'art', route: '/' },
        ],
        strengths: [strong('letters'), strong('reading'), strong('space'), strong('social')],
      },
      NOW,
    )
    expect(report.practice).toEqual([
      { kind: 'letters', language: 'uz', letterIds: ['sh', 'a'] },
      { kind: 'skill', nameKey: 'k.add' },
      { kind: 'strand', strand: 'logic' },
    ])
    expect(report.strengths).toEqual(['letters', 'reading', 'space'])
    const text = weeklyReportText(i18n.t, { name: 'Aziz' }, report)
    expect(text).toContain('Keyingi mashq uchun: Sh, A;')
    expect(text).toContain('Umuman yaxshi natija ko‘rsatyapti:')
  })

  it('an unknown letter id is shown as it is, never dropped', () => {
    expect(practiceText(i18n.t, { kind: 'letters', language: 'uz', letterIds: ['zz', 'sh'] })).toBe(
      'zz, Sh',
    )
  })

  it('homework set or finished this week: done of assigned', () => {
    const letter = (id: string, assigned: Date, done: Date | null): Homework =>
      ({
        id,
        language: 'uz',
        game: 'find-letter',
        letterIds: ['a', 'b'],
        assignedAt: assigned.toISOString(),
        completedAt: done ? done.toISOString() : null,
        mistakes: done ? 0 : null,
      }) as Homework
    const report = weeklyReport(
      {
        runs: [run(ago(1))],
        minutesByDay: {},
        homeworks: [
          letter('h1', ago(2), ago(1)),
          letter('h2', ago(3), null),
          letter('h3', ago(20), ago(19)),
        ],
      },
      NOW,
    )
    expect(report.homework).toEqual({ assigned: 2, done: 1 })
    expect(weeklyReport({ runs: [run(ago(1))], minutesByDay: {} }, NOW).homework).toBeNull()
  })

  describe('one child only', () => {
    beforeEach(() => useUniverseStore.setState({ byChild: {} }))

    it('reads only the given child’s runs', () => {
      const now = new Date()
      for (const [id, childKey] of [
        ['a-1', 'ali'],
        ['a-2', 'ali'],
        ['l-1', 'lola'],
      ] as const) {
        emitActivity({
          id,
          childKey,
          activity: 'math-lab:count:L1',
          strand: 'number',
          correct: 5,
          total: 5,
          independent: 5,
        })
      }
      const reportOf = (childKey: string) =>
        weeklyReport(
          {
            runs: collectRuns(childKey, {
              progress: EMPTY_PROGRESS,
              learn: EMPTY_LEARN_CHILD,
              recent: useUniverseStore.getState().byChild[childKey]?.recent,
            }),
            minutesByDay: {},
          },
          now,
        )
      expect(reportOf('ali').activitiesFinished).toBe(2)
      expect(reportOf('lola').activitiesFinished).toBe(1)
      expect(reportOf('nobody').empty).toBe(true)
    })
  })
})

describe('weeklyReportText', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz')
  })

  it('a short message with the first name only, in the UI language', async () => {
    const report = weeklyReport(
      {
        runs: [run(ago(0)), run(ago(1)), run(ago(2)), run(ago(9))],
        minutesByDay: { [dayAgo(0)]: 30, [dayAgo(1)]: 22 },
        strengths: [strong('letters')],
      },
      NOW,
    )
    const text = weeklyReportText(i18n.t, { name: 'Aziz Karimov' }, report)
    const lines = text.split('\n')
    expect(lines[0]).toBe(
      'Aziz, oxirgi 7 kunda: faol kunlar: 3 / 7; daqiqalar: 52; tugatilgan mashg‘ulotlar: 3.',
    )
    expect(lines.length).toBeLessThanOrEqual(8)
    expect(text).not.toContain('Karimov')
    expect(text).not.toMatch(/parent\.|\{\{/)

    await i18n.changeLanguage('en')
    const english = weeklyReportText(i18n.t, { name: 'Aziz' }, report)
    expect(english).toContain('Aziz, in the last 7 days: active days: 3 of 7; minutes: 52')
    expect(english).toContain('Generally doing well in:')
    expect(english).toContain('More days of practice')
    await i18n.changeLanguage('ru')
    const russian = weeklyReportText(i18n.t, { name: 'Aziz' }, report)
    expect(russian).toContain('Aziz, за последние 7 дней: активных дней: 3 из 7; минут: 52')
    expect(russian).not.toMatch(/parent\.|\{\{/)
  })

  it('an empty week says the report comes after play', () => {
    const report = weeklyReport({ runs: [], minutesByDay: {} }, NOW)
    expect(weeklyReportText(i18n.t, { name: 'Aziz' }, report)).toBe(
      'Aziz oxirgi 7 kunda hali o‘ynamadi. Hisobot o‘yindan keyin paydo bo‘ladi.',
    )
  })
})
