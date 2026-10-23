import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

describe('trace page', () => {
  beforeEach(() => useSettingsStore.setState({ language: 'en' }))

  it('offers letters, numbers and shapes', async () => {
    await renderRoute('/trace')
    expect(
      await screen.findByRole('link', { name: /Letters/ }, { timeout: 10_000 }),
    ).toHaveAttribute('href', '/tasks/trace')
    expect(screen.getByRole('link', { name: /Numbers/ })).toHaveAttribute('href', '/trace/numbers')
    expect(screen.getByRole('link', { name: /Shapes/ })).toHaveAttribute('href', '/trace/shapes')
  })

  it('lists the numbers 0–10', async () => {
    await renderRoute('/trace/numbers')
    expect(screen.getAllByRole('link', { name: /^Number \d+$/ })).toHaveLength(11)
  })

  it('opens the board for a shape with a hint where to start', async () => {
    await renderRoute('/trace/shapes/heart')
    expect(screen.getByRole('heading', { name: 'Heart' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Space to trace the shape Heart' })).toBeInTheDocument()
    expect(screen.getByText(/Start at the green dot/)).toBeInTheDocument()
  })

  it('sends an unknown item back to its list', async () => {
    const { router } = await renderRoute('/trace/numbers/42')
    expect(router.state.location.pathname).toBe('/trace/numbers')
  })
})
