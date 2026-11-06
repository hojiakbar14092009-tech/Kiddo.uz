import { meetNewLetter } from '@/test/lesson'
import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMascotStore } from '@/features/mascot/mascotStore'
import { useFamilyStore } from '@/store/familyStore'
import { EMPTY_PROGRESS, GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

function currentTargetLetter(): string {
  const bubble = useMascotStore.getState().message?.text ?? ''
  const match = /^(.+?) harfini top!$/.exec(bubble)
  if (!match?.[1]) throw new Error(`Unexpected instruction: ${bubble}`)
  return match[1]
}

describe('find-letter game', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
  })

  afterEach(() => vi.useRealTimers())

  it('plays five rounds without mistakes and pays 5 nuts, the daily gift and the 3 stars’ nuts', async () => {
    const { router, user } = await renderRoute('/tasks/find-letter', {
      advanceTimers: vi.advanceTimersByTime,
    })

    for (let round = 0; round < 5; round += 1) {
      await meetNewLetter(user)
      await user.click(screen.getByRole('button', { name: `${currentTargetLetter()} harfi` }))
      // the praise, then a quiet moment, then the next round
      await act(async () => vi.advanceTimersByTimeAsync(2500))
    }

    expect(router.state.location.pathname).toBe('/reward')
    expect(screen.getByText('Yong‘oqlar: +5')).toBeInTheDocument()
    expect(screen.getByText('Kunlik sovg‘a: +2')).toBeInTheDocument()
    // the first 3 stars also pay a crystal's worth in nuts (Phase 39)
    expect(screen.getByText('Yong‘oq: +10')).toBeInTheDocument()
    expect((useProgressStore.getState().byChild[GUEST_KEY] ?? EMPTY_PROGRESS).coins).toBe(17)
  })

  it('encourages after a wrong answer and pays 3 nuts at the end', async () => {
    const { user } = await renderRoute('/tasks/find-letter', {
      advanceTimers: vi.advanceTimersByTime,
    })

    await meetNewLetter(user)
    const target = currentTargetLetter()
    const wrong = screen
      .getAllByRole('button', { name: / harfi$/ })
      .find((button) => button.getAttribute('aria-label') !== `${target} harfi`)!
    await user.click(wrong)
    await act(async () => vi.advanceTimersByTime(600))
    expect(screen.getByText('Oops! Yana urinib ko‘ramiz!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: `${target} harfi` }))
    // the praise, then a quiet moment, then the next round
    await act(async () => vi.advanceTimersByTimeAsync(2500))
    for (let round = 1; round < 5; round += 1) {
      await meetNewLetter(user)
      await user.click(screen.getByRole('button', { name: `${currentTargetLetter()} harfi` }))
      // the praise, then a quiet moment, then the next round
      await act(async () => vi.advanceTimersByTimeAsync(2500))
    }
    expect(screen.getByText('Yong‘oqlar: +3')).toBeInTheDocument()
    // not 3 stars: no nuts beyond the task's own
    expect(screen.queryByText(/^Yong‘oq: \+/)).not.toBeInTheDocument()
  })
})

describe('other games', () => {
  beforeEach(() => useSettingsStore.setState({ language: 'en' }))

  it('deals four pairs of hidden cards in the memory game, after meeting its new letters', async () => {
    const { user } = await renderRoute('/tasks/memory')
    // Learn Before Play: every letter not met yet is shown first, one by one
    const shown: string[] = []
    while (screen.queryByTestId('letter-intro')) {
      shown.push(screen.getByTestId('letter-intro').dataset.letter!)
      await user.click(screen.getByTestId('letter-intro-go'))
    }
    expect(shown.length).toBeGreaterThan(0)
    expect(new Set(shown).size).toBe(shown.length)
    // after the last new letter, keyboard focus moves on to the cards
    await waitFor(() =>
      expect(screen.getByTestId('memory-board').contains(document.activeElement)).toBe(true),
    )
    expect(screen.getAllByRole('button', { name: 'Hidden card' })).toHaveLength(8)
  })

  it('shows a tracing area in the writing game', async () => {
    await renderRoute('/tasks/trace')
    expect(screen.getByRole('img', { name: /Space to trace the letter/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('the help shows a finger writing the letter stroke by stroke, from numbered starts', async () => {
    const { user } = await renderRoute('/tasks/trace')
    await user.click(screen.getByRole('button', { name: /Hint|Help/ }))
    const demo = await screen.findByTestId('stroke-demo')
    expect(demo.querySelector('[data-stroke-start="1"]')).not.toBeNull()
  })

  it('sends unknown games home', async () => {
    const { router } = await renderRoute('/tasks/unknown')
    expect(router.state.location.pathname).toBe('/home')
  })
})
