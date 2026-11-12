import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

describe('trace page', () => {
  beforeEach(() => useSettingsStore.setState({ language: 'en' }))

  it('offers letters, and every number and shape in one list', async () => {
    await renderRoute('/trace')
    expect(
      await screen.findByRole('link', { name: /Letters/ }, { timeout: 10_000 }),
    ).toHaveAttribute('href', '/tasks/trace')
    // MVP: one list, 0–10 and fourteen shapes (25 things to draw), locked numbers shown with a lock
    const open = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/trace/'))
    const locked = screen.getAllByRole('img', { name: /locked$/ })
    expect(open.length + locked.length).toBe(25)
    expect(screen.getByRole('link', { name: 'Hexagon' })).toHaveAttribute(
      'href',
      '/trace/shapes/hexagon',
    )
    expect(screen.getByRole('link', { name: 'Number 0' })).toHaveAttribute(
      'href',
      '/trace/numbers/0',
    )
  })

  it('lists the numbers 0–10, the first five open (numbers open five at a time)', async () => {
    await renderRoute('/trace/numbers')
    expect(screen.getAllByRole('link', { name: /^Number \d+$/ })).toHaveLength(5)
    expect(screen.getByRole('img', { name: '5, locked' })).toBeInTheDocument()
  })

  it('a locked number goes back to the list', async () => {
    const { router } = await renderRoute('/trace/numbers/7')
    await waitFor(() => expect(router.state.location.pathname).toBe('/trace/numbers'), {
      timeout: 5000,
    })
  })

  it('opens the board for a shape with a hint where to start', async () => {
    await renderRoute('/trace/shapes/heart')
    expect(screen.getByRole('heading', { name: 'Heart' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Space to trace the shape Heart' })).toBeInTheDocument()
    expect(screen.getByText(/Start at the green dot/)).toBeInTheDocument()
  })

  it('sends an unknown item back to its list', async () => {
    const { router } = await renderRoute('/trace/numbers/42')
    // the redirect may land a moment later on a busy machine (lazy route)
    await waitFor(() => expect(router.state.location.pathname).toBe('/trace/numbers'), {
      timeout: 5000,
    })
  })
})
