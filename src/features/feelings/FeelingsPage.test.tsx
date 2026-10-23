import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emitActivity, useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { currentSpeakable } from '@/features/learn/speakable'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { FEELING_TEXT, FEELINGS, SITUATIONS, type ChoiceKind, type FeelingId } from './content'
import { NEUTRAL_FILL } from './faceArt'

vi.mock('@/domain/universe', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/domain/universe')>()
  return { ...original, emitActivity: vi.fn(original.emitActivity) }
})

beforeEach(() => {
  useSettingsStore.setState({ language: 'en' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  vi.mocked(emitActivity).mockClear()
})

afterEach(() => vi.useRealTimers())

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** A six-year-old: the 'social' strand starts at level 3. */
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

/** What kind of idea an answer button of a situation is. */
function kindOf(button: HTMLElement): ChoiceKind {
  for (const situation of SITUATIONS) {
    for (const choice of situation.choices) {
      if (button.textContent === choice.text.en) return choice.kind
    }
  }
  throw new Error(`unknown answer: ${button.textContent}`)
}

/** The feeling a "Find the … face!" prompt asks for. */
function askedFeeling(): FeelingId {
  for (const feeling of FEELINGS) {
    if (screen.queryAllByText(FEELING_TEXT[feeling].find.en).length > 0) return feeling
  }
  throw new Error('no face question on screen')
}

describe('feelings section', () => {
  it('opens four doors, all without building anything', async () => {
    await renderRoute('/feelings')
    expect(screen.getByRole('heading', { name: 'Feelings' })).toBeInTheDocument()
    const doors = [
      [/How does it feel\?/, '/feelings/faces'],
      [/What happened\?/, '/feelings/scenes'],
      [/What could you do\?/, '/feelings/kindness'],
      [/Calm corner/, '/feelings/calm'],
    ] as const
    for (const [name, href] of doors) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  it('plays one face session kindly and counts it in the universe exactly once', async () => {
    const { user } = await renderRoute('/feelings/faces')
    // a guest starts at level 2: the four basic feelings, three faces, four questions
    for (let question = 0; question < 4; question += 1) {
      const feeling = askedFeeling()
      const answers = within(screen.getByRole('group', { name: 'Answers' }))
      expect(answers.getAllByRole('button')).toHaveLength(3)
      if (question === 0) {
        const other = answers
          .getAllByRole('button')
          .find((button) => button.textContent !== FEELING_TEXT[feeling].label.en)!
        await user.click(other)
        const feedback = screen.getByTestId('feelings-feedback')
        expect(feedback).toHaveTextContent('Let’s look again.')
        expect(feedback).not.toHaveTextContent(/wrong/i)
        expect(other).toHaveAttribute('aria-disabled', 'true')
      }
      await user.click(answers.getByRole('button', { name: FEELING_TEXT[feeling].label.en }))
      expect(screen.getByTestId('feelings-feedback')).toHaveTextContent('Well done! You found it!')
      await user.click(screen.getByRole('button', { name: question < 3 ? 'Next' : 'Finish' }))
    }

    expect(emitActivity).toHaveBeenCalledTimes(1)
    expect(emitActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        childKey: GUEST_KEY,
        activity: 'feelings:faces:basic',
        strand: 'social',
        level: 2,
        correct: 4,
        total: 4,
        independent: 3,
      }),
    )
    expect(screen.getAllByText('Well done! You understand feelings well.').length).toBeGreaterThan(
      0,
    )
    expect(screen.getByTestId('activity-reward')).toHaveTextContent('Stars: +2')

    // a new run starts fresh and does not count the old one again
    await user.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getByRole('group', { name: 'Answers' })).toBeInTheDocument()
    expect(emitActivity).toHaveBeenCalledTimes(1)
  })

  it('explains every choice of a situation and praises the kindest one', async () => {
    const { user } = await renderRoute('/feelings/kindness')
    expect(screen.getAllByText('What could you do?').length).toBeGreaterThan(1)
    const answers = within(screen.getByRole('group', { name: 'Answers' }))
    expect(answers.getAllByRole('button')).toHaveLength(2)
    // every answer has a picture, and the speaker reads the question and both answers
    for (const button of answers.getAllByRole('button')) {
      expect(button.querySelector('svg[data-choice-art]')).not.toBeNull()
      expect(currentSpeakable()).toContain(button.textContent)
    }
    expect(currentSpeakable()).toContain('What could you do?')
    // try the answers in turn: "another idea" first or praise (the order is random)
    for (const button of answers.getAllByRole('button')) {
      await user.click(button)
      const text = screen.getByTestId('feelings-feedback').textContent ?? ''
      expect(text).toMatch(/A wonderful choice!|Another idea could be/)
      if (text.includes('A wonderful choice!')) break
    }
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('from level 3 praises a kind idea and counts it as found on the first try', async () => {
    sixYearOld()
    const { user } = await renderRoute('/feelings/kindness')
    for (let question = 0; question < 5; question += 1) {
      const buttons = within(screen.getByRole('group', { name: 'Answers' })).getAllByRole('button')
      expect(buttons).toHaveLength(3)
      const good = buttons.find((button) => kindOf(button) === 'good')!
      if (question === 0) {
        // the "other" idea is talked about kindly and does not end the question
        await user.click(buttons.find((button) => kindOf(button) === 'other')!)
        expect(screen.getByTestId('feelings-feedback')).toHaveTextContent('Another idea could be')
        expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
      }
      await user.click(good)
      const feedback = screen.getByTestId('feelings-feedback')
      expect(feedback).toHaveTextContent('Good thinking!')
      expect(feedback).not.toHaveTextContent(/Another idea|another answer|wrong/i)
      await user.click(screen.getByRole('button', { name: question < 4 ? 'Next' : 'Finish' }))
    }
    expect(emitActivity).toHaveBeenCalledTimes(1)
    expect(emitActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        childKey: 'kid',
        activity: 'feelings:kindness:full',
        strand: 'social',
        level: 3,
        correct: 5,
        total: 5,
        independent: 4,
      }),
    )
    // played at the child's own level, so the LearnerProfile counted it
    expect(useUniverseStore.getState().byChild.kid?.strands?.social).toMatchObject({
      runs: 1,
      independent: 4,
      total: 5,
    })
  })

  it('from level 3 paints every face one colour', async () => {
    sixYearOld()
    await renderRoute('/feelings/faces')
    const faces = within(screen.getByRole('group', { name: 'Answers' })).getAllByRole('button')
    expect(faces).toHaveLength(3)
    for (const face of faces) {
      expect(face.querySelector('svg[data-feeling] circle')).toHaveAttribute('fill', NEUTRAL_FILL)
    }
  })

  it('lets the child breathe without scoring anything', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = await renderRoute('/feelings/calm', {
      advanceTimers: vi.advanceTimersByTime,
    })
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getAllByText('Breathe in…').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Finish' })).toHaveAttribute('href', '/feelings')
    for (let half = 0; half < 8; half += 1) {
      await act(() => vi.advanceTimersByTimeAsync(4000))
    }
    expect(screen.getAllByText('Great! Your body feels calm now.').length).toBeGreaterThan(0)
    expect(emitActivity).not.toHaveBeenCalled()
  })

  it('sends an unknown activity back to the section', async () => {
    const { router } = await renderRoute('/feelings/nope')
    expect(router.state.location.pathname).toBe('/feelings')
  })
})
