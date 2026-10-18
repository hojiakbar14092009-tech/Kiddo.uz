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

describe('Numbers', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
  })

  it('switches to the numbers tab and opens a number', async () => {
    const { router, user } = renderRoute('/alphabet')
    await user.click(screen.getByRole('tab', { name: /123/ }))
    expect(screen.getAllByRole('button', { name: /—/ })).toHaveLength(10)

    await user.click(screen.getByRole('button', { name: '3 — uch' }))
    expect(router.state.location.pathname).toBe('/alphabet/num-3')
  })

  it('counts the pictures one by one and celebrates at the end', async () => {
    const { user } = renderRoute('/alphabet/num-3')
    const pictures = screen.getAllByRole('button', { name: /-rasm$/ })
    expect(pictures).toHaveLength(3)

    await user.click(pictures[2]!)
    await user.click(pictures[2]!)
    await user.click(pictures[0]!)
    expect(pictures[2]).toHaveTextContent('1')
    expect(pictures[0]).toHaveTextContent('2')

    await user.click(pictures[1]!)
    expect(screen.getByText('Sanaldi: 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yana sanash' })).toBeInTheDocument()
  })
})
