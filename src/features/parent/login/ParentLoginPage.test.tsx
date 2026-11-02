import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { useParentStore } from '@/store/parentStore'

/* Phase 44: Google, an e-mail link or a password; making an account needs consent. */

const auth = vi.hoisted(() => ({
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  sendSignInLink: vi.fn(),
}))
const consent = vi.hoisted(() => ({ rememberConsent: vi.fn() }))

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true }))
vi.mock('@/services/supabase/auth', () => auth)
vi.mock('@/services/supabase/consent', () => consent)

const { ParentLoginPage } = await import('./ParentLoginPage')

function open() {
  return render(
    <MemoryRouter>
      <ParentLoginPage />
    </MemoryRouter>,
  )
}

describe('the parent sign-in page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useParentStore.setState({ session: null })
  })

  it('Google needs consent first; with it, the consent is kept for the return', async () => {
    open()
    fireEvent.click(screen.getByTestId('login-google'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(auth.signInWithGoogle).not.toHaveBeenCalled()
    auth.signInWithGoogle.mockResolvedValue(null)
    fireEvent.click(screen.getByTestId('login-consent'))
    fireEvent.click(screen.getByTestId('login-google'))
    await waitFor(() => expect(auth.signInWithGoogle).toHaveBeenCalled())
    expect(consent.rememberConsent).toHaveBeenCalled()
  })

  it('the e-mail link: consent, then the link is sent and the parent is told where', async () => {
    auth.sendSignInLink.mockResolvedValue({ ok: true })
    const { container } = open()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('parent.login.withLink') }))
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'ona@example.com' },
    })
    fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('login-consent'))
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(auth.sendSignInLink).toHaveBeenCalledWith('ona@example.com'))
    expect(await screen.findByRole('status')).toHaveTextContent('ona@example.com')
    expect(container.querySelector('input[type="password"]')).toBeNull()
  })

  it('signing in to an existing account with a password needs no consent', async () => {
    auth.signInWithEmail.mockResolvedValue({ ok: true, email: 'ota@example.com', userId: 'u1' })
    const { container } = open()
    fireEvent.change(container.querySelector('input[type="email"]')!, {
      target: { value: 'ota@example.com' },
    })
    fireEvent.change(container.querySelector('input[type="password"]')!, {
      target: { value: 'longpassword' },
    })
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() =>
      expect(useParentStore.getState().session).toEqual({
        mode: 'cloud',
        email: 'ota@example.com',
        userId: 'u1',
      }),
    )
    expect(consent.rememberConsent).not.toHaveBeenCalled()
  })
})
