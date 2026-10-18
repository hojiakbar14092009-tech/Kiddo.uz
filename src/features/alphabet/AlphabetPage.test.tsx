import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

describe('Alphabet', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
  })

  it('shows every letter of the chosen language', () => {
    renderRoute('/alphabet')
    expect(screen.getAllByRole('button', { name: /—/ })).toHaveLength(30)
    expect(screen.getByRole('button', { name: 'Ng — dengiz' })).toBeInTheDocument()
  })

  it('switches the alphabet when the language changes', async () => {
    const { user } = renderRoute('/alphabet')
    await user.click(screen.getByRole('button', { name: 'Русский' }))
    expect(screen.getAllByRole('button', { name: /—/ })).toHaveLength(33)
  })

  it('opens a letter page with the letter highlighted inside the word', async () => {
    const { router, user } = renderRoute('/alphabet')
    await user.click(screen.getByRole('button', { name: 'Ng — dengiz' }))

    expect(router.state.location.pathname).toBe('/alphabet/ng')
    const highlighted = screen.getByText('ng', { selector: 'mark' })
    expect(highlighted.parentElement).toHaveTextContent('dengiz')
  })

  it('moves to the next letter', async () => {
    const { router, user } = renderRoute('/alphabet/a')
    await user.click(screen.getByRole('link', { name: 'Keyingi harf' }))
    expect(router.state.location.pathname).toBe('/alphabet/b')
  })

  it('returns to the alphabet for an unknown letter', () => {
    const { router } = renderRoute('/alphabet/unknown')
    expect(router.state.location.pathname).toBe('/alphabet')
  })
})
