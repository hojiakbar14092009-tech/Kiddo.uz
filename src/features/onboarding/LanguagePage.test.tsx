import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

describe('LanguagePage', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: null })
  })

  it('offers all three languages', async () => {
    await renderRoute('/')
    expect(screen.getByRole('button', { name: /O‘zbekcha/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Русский/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /English/ })).toBeInTheDocument()
  })

  it('stores the chosen language and opens the home screen', async () => {
    const { router, user } = await renderRoute('/')
    await user.click(screen.getByRole('button', { name: /English/ }))

    expect(useSettingsStore.getState().language).toBe('en')
    expect(router.state.location.pathname).toBe('/home')
  })

  it('sends a child without a language back to the picker', async () => {
    const { router } = await renderRoute('/home')
    expect(router.state.location.pathname).toBe('/')
  })
})
