import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAlphabet } from '@/content/alphabet'
import { seededRandom } from '@/lib/random'
import { useFamilyStore } from '@/store/familyStore'
import { EMPTY_PROGRESS, GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { EXAM_ROUNDS, examLetters, firstTryCorrect, generateExamRounds } from './exam'

describe('exam rounds', () => {
  it('asks about ten different letters and never about silent signs', async () => {
    for (const language of ['uz', 'ru', 'en'] as const) {
      const rounds = generateExamRounds(getAlphabet(language).letters, seededRandom(7))
      const ids = rounds.map((round) => round.target.id)
      expect(new Set(ids).size).toBe(EXAM_ROUNDS)
      expect(ids).not.toContain('tutuq')
      expect(ids).not.toContain('hard')
      expect(ids).not.toContain('soft')
    }
  })

  it('counts rounds answered right on the first tap', async () => {
    expect(firstTryCorrect([])).toBe(10)
    expect(
      firstTryCorrect([
        { targetId: 'a', chosenId: 'b' },
        { targetId: 'a', chosenId: 'd' },
        { targetId: 'e', chosenId: 'f' },
      ]),
    ).toBe(8)
  })
})

describe('Exam page', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
  })
  afterEach(() => vi.useRealTimers())

  it('stays locked until every letter is learned', async () => {
    await renderRoute('/exam')
    const total = examLetters(getAlphabet('uz').letters).length
    expect(screen.getByRole('progressbar', { name: `0 / ${total} harf` })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Boshladik!' })).not.toBeInTheDocument()
  })

  it('runs ten rounds and passes without mistakes', async () => {
    const learned = getAlphabet('uz').letters.map((letter) => letter.id)
    useProgressStore.setState({
      byChild: { [GUEST_KEY]: { ...EMPTY_PROGRESS, learned: { uz: learned } } },
    })
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = await renderRoute('/exam', { advanceTimers: vi.advanceTimersByTime })
    await user.click(screen.getByRole('button', { name: 'Boshladik!' }))

    for (let round = 0; round < EXAM_ROUNDS; round += 1) {
      const prompt = await screen.findByText(/Qaysi rasmda .+ harfi bor\?/)
      const letter = /Qaysi rasmda (.+) harfi bor\?/.exec(prompt.textContent ?? '')![1]!
      const target = getAlphabet('uz').letters.find((item) => item.upper === letter)!
      await user.click(screen.getByRole('button', { name: new RegExp(target.word) }))
      await screen.findByText('Yahoooo! Barakalla!')
      act(() => vi.advanceTimersByTime(1750))
    }

    expect(await screen.findByRole('heading', { name: 'Sen uddalading!' })).toBeInTheDocument()
    const [result] = useProgressStore.getState().byChild[GUEST_KEY]!.results
    expect(result).toMatchObject({ type: 'exam', language: 'uz', mistakes: 0 })
  })
})
