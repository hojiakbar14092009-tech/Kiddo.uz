import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { SkillMemory } from '@/domain/learningMemory/memory'
import { useLearningMemoryStore } from '@/domain/learningMemory/store'
import { useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { PlayedRun } from '../insights/insights'
import { useChildInsights } from '../insights/useChildInsights'
import { activityTrend, recentlyMastered } from './glance'
import { GlanceSection } from './GlanceSection'

/*
 * Phase 35: the Parent Intelligence first view — recently mastered, the
 * practice garden and the activity trend, in plain words, from real data
 * only, each child against their own past.
 */

const NOW = new Date('2026-10-30T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

function skill(
  key: string,
  resolvedAt?: string,
  extra: Partial<SkillMemory> = {},
  status: 'resolved' | 'observed' | 'confirmed' = resolvedAt ? 'resolved' : 'observed',
): SkillMemory {
  return {
    skill: key,
    firstAt: daysAgo(40),
    lastPracticedAt: resolvedAt ?? daysAgo(1),
    masteredAt: null,
    misconceptions: {
      slip: {
        code: 'slip',
        status,
        count: 2,
        lastAt: daysAgo(1),
        ...(resolvedAt ? { resolvedAt } : {}),
      },
    },
    ...extra,
  } as unknown as SkillMemory
}

function run(at: string): PlayedRun {
  return { id: at, at, activity: 'math:4', strand: 'number', total: 4, independent: 3 } as PlayedRun
}

describe('parent insight numbers', () => {
  it('recently mastered: only skills whose mistake came right in the last two weeks, newest first', () => {
    const skills = {
      a: skill('number.add.within10', daysAgo(3)),
      b: skill('letters.find.b', daysAgo(1)),
      c: skill('number.sub.within10', daysAgo(20)),
      d: skill('reading.word.cat'),
    }
    expect(recentlyMastered(skills, NOW).mastered).toEqual([
      'letters.find.b',
      'number.add.within10',
    ])
    expect(recentlyMastered({}, NOW)).toEqual({ mastered: [], practising: [] })
  })

  it('a skill whose difficulty came back is not "recently mastered"', () => {
    // resolved three days ago, then the same mistake was confirmed again
    const back = skill('number.add.within10', daysAgo(3), {}, 'confirmed')
    expect(recentlyMastered({ a: back }, NOW)).toEqual({
      mastered: [],
      practising: ['number.add.within10'],
    })
  })

  it('a skill mastered in the last two weeks counts, an old one does not', () => {
    const fresh = { ...skill('letters.find.b'), misconceptions: {}, masteredAt: daysAgo(2) }
    const old = { ...skill('letters.find.c'), misconceptions: {}, masteredAt: daysAgo(30) }
    expect(recentlyMastered({ fresh, old } as Record<string, SkillMemory>, NOW).mastered).toEqual([
      'letters.find.b',
    ])
  })

  it('a damaged saved entry is skipped, never breaks the dashboard', () => {
    const damaged = {
      ...skill('letters.find.b', daysAgo(1)),
      misconceptions: { slip: null },
    } as unknown as SkillMemory
    expect(
      recentlyMastered({ damaged, ok: skill('letters.find.c', daysAgo(1)) }, NOW).mastered,
    ).toEqual(['letters.find.c'])
  })

  it('a trend is named only with play in both weeks, compared with the child’s own past', () => {
    expect(activityTrend([], NOW).direction).toBe('none')
    // only this week: not a trend yet
    expect(activityTrend([run(daysAgo(1)), run(daysAgo(2)), run(daysAgo(3))], NOW).direction).toBe(
      'none',
    )
    const more = [run(daysAgo(1)), run(daysAgo(2)), run(daysAgo(3)), run(daysAgo(9))]
    expect(activityTrend(more, NOW)).toEqual({ thisWeek: 3, lastWeek: 1, direction: 'more' })
    const less = [run(daysAgo(1)), run(daysAgo(8)), run(daysAgo(9)), run(daysAgo(10))]
    expect(activityTrend(less, NOW).direction).toBe('less')
    // several runs on one day are one active day
    const sameDay = [run(daysAgo(1)), run(daysAgo(1)), run(daysAgo(8)), run(daysAgo(9))]
    expect(activityTrend(sameDay, NOW)).toMatchObject({ thisWeek: 1, lastWeek: 2 })
  })
})

function Glance({ child }: { child: ChildProfile }) {
  const insights = useChildInsights(child)
  return <GlanceSection child={child} insights={insights} />
}

describe('Parent Intelligence cards', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
    useUniverseStore.setState({ byChild: {} })
    useLearningMemoryStore.setState({ byChild: {} })
  })

  it('with no play: honest empty states, no invented trend, no raw keys', () => {
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(7, dayKey()), gender: 'boy' })
    render(
      <MemoryRouter>
        <Glance child={ali} />
      </MemoryRouter>,
    )
    for (const title of ['Yaqinda o‘zlashtirdi', 'Mashq bog‘i', 'Faollik tendensiyasi']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(screen.getByTestId('glance-trend')).toHaveTextContent(
      'Ikki haftalik o‘yinni solishtirish',
    )
    expect(screen.getByTestId('glance-garden')).toHaveTextContent('Bog‘ hali bo‘sh')
    const text = screen.getByTestId('parent-glance').textContent ?? ''
    expect(text).not.toMatch(/parent\.|glance\.|\d\.\d{2}|_/)
  })

  it('the most useful answers come first (above the charts and details)', () => {
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(7, dayKey()), gender: 'boy' })
    render(
      <MemoryRouter>
        <Glance child={ali} />
      </MemoryRouter>,
    )
    const order = within(screen.getByTestId('parent-glance'))
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(order.slice(0, 7)).toEqual([
      'Farzandim',
      'Bugungi holat',
      'O‘rganayotgan mavzular',
      'Kuchayib borayotgan ko‘nikmalar',
      'Yaqinda o‘zlashtirdi',
      'Mashq kerak',
      'Uyga vazifalar',
    ])
  })

  it('each child sees only their own mastered skills and garden (switching children)', () => {
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(7, dayKey()), gender: 'boy' })
    const vali = useFamilyStore
      .getState()
      .addChild({ name: 'Vali', birthDate: birthDateForAge(9, dayKey()), gender: 'boy' })
    const resolvedAt = new Date(Date.now() - 2 * 86_400_000).toISOString()
    useLearningMemoryStore.setState({
      byChild: {
        [ali.id]: {
          skills: { 'math:add:within10': skill('math:add:within10', resolvedAt) },
          processed: [],
        },
      },
    })
    const view = render(
      <MemoryRouter>
        <Glance child={ali} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('glance-mastered')).toHaveTextContent('Qo‘shish')
    expect(screen.getByTestId('glance-garden')).toHaveTextContent(
      'Gullaganlari (o‘zlashtirildi): 1',
    )
    view.rerender(
      <MemoryRouter>
        <Glance child={ali} />
      </MemoryRouter>,
    )
    // two maths skills of one family are one line for a parent
    act(() =>
      useLearningMemoryStore.setState({
        byChild: {
          [ali.id]: {
            skills: {
              'math:add:within10': skill('math:add:within10', resolvedAt),
              'math:add:within20': skill('math:add:within20', resolvedAt),
            },
            processed: [],
          },
        },
      }),
    )
    expect(within(screen.getByTestId('glance-mastered')).getAllByRole('listitem')).toHaveLength(1)
    // a name still being practised (another adding skill) is not also "mastered"
    act(() =>
      useLearningMemoryStore.setState({
        byChild: {
          [ali.id]: {
            skills: {
              'math:add:within10': skill('math:add:within10', resolvedAt),
              'math:add:within20': skill('math:add:within20', resolvedAt, {}, 'confirmed'),
            },
            processed: [],
          },
        },
      }),
    )
    expect(screen.getByTestId('glance-mastered')).not.toHaveTextContent('Qo‘shish')
    view.rerender(
      <MemoryRouter>
        <Glance child={vali} />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('glance-mastered')).toHaveTextContent('shu yerda ko‘rinadi')
    expect(screen.getByTestId('glance-garden')).toHaveTextContent('Bog‘ hali bo‘sh')
  })
})
