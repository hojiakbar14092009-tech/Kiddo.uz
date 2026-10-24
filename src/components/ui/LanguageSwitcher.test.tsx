import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'
import { LanguageSwitcher } from './LanguageSwitcher'

describe('LanguageSwitcher', () => {
  beforeEach(() => useSettingsStore.setState({ language: 'uz' }))

  it('the folded switch (a narrow bar, large text) opens the three languages and picks one', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher folded />)
    const compact = screen.getByRole('button', { name: /Til: O‘zbekcha/ })
    expect(compact).toHaveAttribute('aria-expanded', 'false')
    await user.click(compact)
    expect(compact).toHaveAttribute('aria-expanded', 'true')
    const menu = document.getElementById(compact.getAttribute('aria-controls')!)!
    await user.click(within(menu).getByRole('button', { name: 'English' }))
    expect(useSettingsStore.getState().language).toBe('en')
    expect(compact).toHaveFocus()
    expect(compact).toHaveAttribute('aria-expanded', 'false')
  })

  it('Escape closes the choices and gives focus back', async () => {
    const user = userEvent.setup()
    render(<LanguageSwitcher folded />)
    const compact = screen.getByRole('button', { name: /Til:/ })
    await user.click(compact)
    await user.keyboard('{Escape}')
    expect(compact).toHaveAttribute('aria-expanded', 'false')
    expect(compact).toHaveFocus()
  })

  it('without a bar to fold in, only the three buttons are there', () => {
    render(<LanguageSwitcher />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('unfolded in the bar, the three buttons show and no folded button', () => {
    render(<LanguageSwitcher folded={false} />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('folded, the unseen full row is hidden from screen readers', () => {
    render(<LanguageSwitcher folded />)
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })
})
