import { act, screen } from '@testing-library/react'
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

  it('plays five rounds without mistakes and pays 5 coins plus the daily gift', async () => {
    const { router, user } = renderRoute('/tasks/find-letter', {
      advanceTimers: vi.advanceTimersByTime,
    })

    for (let round = 0; round < 5; round += 1) {
      await user.click(screen.getByRole('button', { name: `${currentTargetLetter()} harfi` }))
      await act(async () => vi.advanceTimersByTime(1800))
    }

    expect(router.state.location.pathname).toBe('/reward')
    expect(screen.getByText('Coinlar: +5')).toBeInTheDocument()
    expect(screen.getByText('Kunlik sovg‘a: +2')).toBeInTheDocument()
    expect((useProgressStore.getState().byChild[GUEST_KEY] ?? EMPTY_PROGRESS).coins).toBe(7)
  })

  it('encourages after a wrong answer and pays 3 coins at the end', async () => {
    const { user } = renderRoute('/tasks/find-letter', { advanceTimers: vi.advanceTimersByTime })

    const target = currentTargetLetter()
    const wrong = screen
      .getAllByRole('button', { name: / harfi$/ })
      .find((button) => button.getAttribute('aria-label') !== `${target} harfi`)!
    await user.click(wrong)
    await act(async () => vi.advanceTimersByTime(600))
    expect(screen.getByText('Oops! Yana urinib ko‘ramiz!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: `${target} harfi` }))
    await act(async () => vi.advanceTimersByTime(1800))
    for (let round = 1; round < 5; round += 1) {
      await user.click(screen.getByRole('button', { name: `${currentTargetLetter()} harfi` }))
      await act(async () => vi.advanceTimersByTime(1800))
    }
    expect(screen.getByText('Coinlar: +3')).toBeInTheDocument()
  })
})

describe('other games', () => {
  beforeEach(() => useSettingsStore.setState({ language: 'en' }))

  it('deals four pairs of hidden cards in the memory game', () => {
    renderRoute('/tasks/memory')
    expect(screen.getAllByRole('button', { name: 'Hidden card' })).toHaveLength(8)
  })

  it('shows a tracing area in the writing game', () => {
    renderRoute('/tasks/trace')
    expect(screen.getByRole('img', { name: /Space to trace the letter/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('sends unknown games home', () => {
    const { router } = renderRoute('/tasks/unknown')
    expect(router.state.location.pathname).toBe('/home')
  })
})
