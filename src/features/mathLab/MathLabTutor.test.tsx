import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import {
  clearLearningMemory,
  getSkillMemory,
  useLearningMemoryStore,
  type SkillMemory,
} from '@/domain/learningMemory'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function sixYearOld() {
  useFamilyStore.setState({
    children: [
      {
        id: 'kid',
        name: 'Ali',
        birthDate: birthDateForAge(6, iso(new Date())),
        celebratedLevel: 6,
        gender: 'boy',
        mascot: 'boy',
        dailyLimitMinutes: 60,
        createdAt: new Date().toISOString(),
      },
    ],
    activeChildId: 'kid',
  })
}

const question = () => screen.getByTestId('lab-question')
const cards = () => within(question()).getAllByRole('button')
const help = () => screen.getByTestId('lab-help')
const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }
const isAnswer = (b: HTMLElement, answer: string) =>
  b.getAttribute('aria-label') === (SIGN_LABEL[answer] ?? answer)

describe('Math Lab tutor: hint ladder and learning memory', () => {
  const fetchSpy = vi.fn()

  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    clearLearningMemory('kid')
    sixYearOld()
    vi.stubGlobal('fetch', fetchSpy)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchSpy.mockReset()
  })

  it('climbs the ladder: clue, picture, one card away, then the solution – never the answer first', async () => {
    const { user } = await renderRoute('/math-lab')
    await user.click(screen.getByTestId('lab-start'))
    // a sign question has only two wrong cards: go on to one with three
    while (question().dataset.kind === 'compare') {
      const before = question()
      await user.click(cards().find((b) => isAnswer(b, before.dataset.answer!))!)
      await waitFor(() => expect(screen.getByTestId('lab-question')).not.toBe(before), {
        timeout: 3000,
      })
    }
    const q = question()
    const answer = q.dataset.answer!
    const wrong = cards().filter((b) => b.dataset.status === 'idle' && !isAnswer(b, answer))
    expect(wrong.length).toBeGreaterThanOrEqual(3)

    await user.click(wrong[0]!)
    expect(help()).toHaveAttribute('data-hint-level', '1')
    expect(help()).toHaveAttribute('data-source', 'local')
    expect(screen.getByTestId('tutor-message').textContent).not.toMatch(
      new RegExp(`(^|\\D)${answer}(\\D|$)`),
    )
    expect(screen.queryByTestId('tutor-thinking')).not.toBeInTheDocument()

    await user.click(wrong[1]!)
    expect(help()).toHaveAttribute('data-hint-level', '2')

    // the child asks for more: one wrong card is taken away (partial solution)
    await user.click(screen.getByTestId('tutor-more'))
    expect(help()).toHaveAttribute('data-hint-level', '3')
    expect(screen.getByTestId('tutor-message')).toHaveTextContent(
      'Bitta noto‘g‘ri kartani olib qo‘ydim',
    )
    expect(cards().filter((b) => b.dataset.status === 'removed')).toHaveLength(1)
    expect(cards().find((b) => b.dataset.status === 'removed')).toHaveAttribute(
      'aria-disabled',
      'true',
    )

    // the last step: the worked solution, and the right card glows
    await user.click(screen.getByTestId('tutor-more'))
    expect(help()).toHaveAttribute('data-hint-level', '4')
    expect(screen.getByTestId('tutor-message')).toHaveTextContent('Mana yechimi:')
    expect(screen.getByTestId('tutor-message')).toHaveTextContent(answer)
    expect(screen.queryByTestId('tutor-more')).not.toBeInTheDocument()

    const right = cards().find((b) => b.dataset.status === 'hint')!
    expect(isAnswer(right, answer)).toBe(true)
    await user.click(right)
    // the finished question is evidence in Kiddo's own memory (not an AI's)
    const memory = Object.values(useLearningMemoryStore.getState().byChild.kid?.skills ?? {}).find(
      (m) => m.hintsRecent.includes(4),
    )
    expect(memory?.skill.startsWith('math:')).toBe(true)
    expect(memory).toMatchObject({ evidence: 1, successStreak: 0, hintsRecent: [4] })
    // no AI is configured in this build: nothing left the device
    expect(fetchSpy).not.toHaveBeenCalled()
  }, 30_000)

  it('a due review comes first next time, as a related item, and the hint remembers', async () => {
    const yesterday = new Date(Date.now() - 26 * 3_600_000).toISOString()
    const memory: SkillMemory = {
      skill: 'math:sub:within10',
      level: 3,
      mastery: 0.5,
      evidence: 2,
      successStreak: 0,
      firstAt: yesterday,
      lastPracticedAt: yesterday,
      lastErrorAt: yesterday,
      retained: false,
      nextReviewAt: new Date(Date.now() - 3_600_000).toISOString(),
      reviewStep: 0,
      reviewCount: 0,
      misconceptions: {
        'off-by-one': {
          code: 'off-by-one',
          count: 2,
          items: ['sub:9-3', 'sub:8-3'],
          firstAt: yesterday,
          lastAt: yesterday,
          status: 'confirmed',
        },
      },
      hintsRecent: [1, 2],
      correctedAfterHint: 2,
      masteredAt: null,
    }
    useLearningMemoryStore.setState({
      byChild: { kid: { skills: { [memory.skill]: memory }, processed: [] } },
    })
    const { user } = await renderRoute('/math-lab')
    await user.click(screen.getByTestId('lab-start'))
    const q = question()
    expect(q).toHaveAttribute('data-review', 'true')
    expect(q).toHaveAttribute('data-kind', 'sub')
    expect(
      screen.getAllByText('Shunga o‘xshash misolni yana bir bor sinab ko‘ramiz.').length,
    ).toBeGreaterThan(0)

    // an off-by-one answer: the clue says this was practised before
    const answer = Number(q.dataset.answer)
    const offByOne = cards().find((b) =>
      [String(answer + 1), String(answer - 1)].includes(b.getAttribute('aria-label') ?? ''),
    )!
    await user.click(offByOne)
    expect(screen.getByTestId('tutor-message')).toHaveTextContent(
      'Buni avval ham birga mashq qilganmiz.',
    )
    await user.click(cards().find((b) => b.getAttribute('aria-label') === String(answer))!)
    await waitFor(() =>
      expect(getSkillMemory('kid', 'math:sub:within10')).toMatchObject({
        reviewCount: 1,
        reviewStep: 0,
      }),
    )
  }, 30_000)
})

describe('Math Lab tutor: the mascot keeps its reaction', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    clearLearningMemory('kid')
    sixYearOld()
  })

  it('a wrong answer’s clue stays in the mascot bubble (not wiped by the next render)', async () => {
    const { useMascotStore } = await import('@/features/mascot/mascotStore')
    const { user } = await renderRoute('/math-lab')
    await user.click(screen.getByTestId('lab-start'))
    while (question().dataset.kind === 'compare') {
      const before = question()
      await user.click(cards().find((b) => isAnswer(b, before.dataset.answer!))!)
      await waitFor(() => expect(screen.getByTestId('lab-question')).not.toBe(before), {
        timeout: 3000,
      })
    }
    const answer = question().dataset.answer!
    await user.click(cards().find((b) => b.dataset.status === 'idle' && !isAnswer(b, answer))!)
    const clue = screen.getByTestId('tutor-message').textContent
    await new Promise((resolve) => setTimeout(resolve, 300))
    const message = useMascotStore.getState().message as { text?: string } | null
    expect(message?.text).toBe(clue)
  }, 30_000)
})

describe('Math Lab review planning', () => {
  it('never reviews an avoided item or one already in the session', async () => {
    const { planSession, reviewQuestion } = await import('./generators')
    const every = new Set(['count:1', 'count:2', 'count:3', 'count:4', 'count:5'])
    expect(reviewQuestion('count:to5', 1, every)).toBeNull()
    for (let seed = 1; seed < 60; seed += 1) {
      let x = seed
      const rng = () => ((x = (x * 9301 + 49297) % 233280), x / 233280)
      const plan = planSession(1, rng, {
        skill: 'count:to5',
        level: 1,
        avoid: ['count:1', 'count:2', 'count:3'],
      })
      const ids = plan.map((q) => q.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const q of plan)
        if (q.review) expect(['count:1', 'count:2', 'count:3']).not.toContain(q.id)
    }
  })
})

describe('Math Lab: the adaptive plan picks the help', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    clearLearningMemory('kid')
    sixYearOld()
  })

  it('a child who relies on hints gets the picture first after a mistake', async () => {
    // six recent answers that all needed a hint (learning memory evidence)
    const at = new Date().toISOString()
    const skill: SkillMemory = {
      skill: 'math:add:within10',
      level: 3,
      mastery: 0.4,
      evidence: 6,
      successStreak: 0,
      firstAt: at,
      lastPracticedAt: at,
      lastErrorAt: null,
      retained: false,
      nextReviewAt: null,
      reviewStep: 0,
      reviewCount: 0,
      misconceptions: {},
      hintsRecent: [2, 2, 1, 2, 3, 2],
      correctedAfterHint: 4,
      masteredAt: null,
    }
    useLearningMemoryStore.setState({
      byChild: { kid: { skills: { [skill.skill]: skill }, processed: [] } },
    })
    const { user } = await renderRoute('/math-lab')
    await user.click(screen.getByTestId('lab-start'))
    while (question().dataset.kind === 'compare' || question().dataset.kind === 'drag') {
      const before = question()
      if (before.dataset.kind === 'drag') break
      await user.click(cards().find((b) => isAnswer(b, before.dataset.answer!))!)
      await waitFor(() => expect(screen.getByTestId('lab-question')).not.toBe(before), {
        timeout: 3000,
      })
    }
    expect(question()).toHaveAttribute('data-hints', 'picture-first')
    const answer = question().dataset.answer!
    const wrong = cards().find((b) => b.dataset.status === 'idle' && !isAnswer(b, answer))!
    await user.click(wrong)
    expect(help()).toHaveAttribute('data-hint-level', '2')
  })
})
