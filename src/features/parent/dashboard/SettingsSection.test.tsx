import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { SettingsSection } from './SettingsSection'

describe('voice pace (Phase 41)', () => {
  beforeEach(() => useSettingsStore.setState({ language: 'uz', slowVoice: false }))

  it('a parent makes the voice slower: longer pauses between a letter and its word', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <SettingsSection />
      </MemoryRouter>,
    )
    const pace = screen.getByRole('group', { name: 'Harf va so‘z orasidagi pauza' })
    expect(pace).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Uzunroq' }))
    expect(useSettingsStore.getState().slowVoice).toBe(true)
    await user.click(screen.getByRole('radio', { name: 'Odatiy' }))
    expect(useSettingsStore.getState().slowVoice).toBe(false)
  })

  it('a parent chooses whether instructions are read on their own', async () => {
    const user = userEvent.setup()
    useSettingsStore.setState({ autoVoice: true })
    render(
      <MemoryRouter>
        <SettingsSection />
      </MemoryRouter>,
    )
    expect(screen.getByRole('radio', { name: 'O‘zi o‘qiydi' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Tugma bosilganda' }))
    expect(useSettingsStore.getState().autoVoice).toBe(false)
  })
})
