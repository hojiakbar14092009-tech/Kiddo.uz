import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import i18n, { registerLanguage } from '@/i18n'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { CONTACT_EMAIL, PrivacyPage } from './PrivacyPage'

/* /privacy opens without a language or a parent gate, in all three languages, with the contact. */

registerLanguage('en', en)
registerLanguage('ru', ru)

describe('PrivacyPage', () => {
  it.each([
    ['uz', 'Maxfiylik siyosati', 'Kamera'],
    ['ru', 'Политика конфиденциальности', 'Камера'],
    ['en', 'Privacy policy', 'Camera'],
  ])('shows the policy in %s', async (language, title, camera) => {
    await i18n.changeLanguage(language)
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: camera })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${CONTACT_EMAIL}`,
    )
  })
})
