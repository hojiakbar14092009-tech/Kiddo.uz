import { render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useParentStore } from '@/store/parentStore'

/* Phase 44: back from Google or the e-mail link, the code is used once. */

const auth = vi.hoisted(() => ({ completeSignIn: vi.fn() }))
vi.mock('@/services/supabase/auth', () => auth)

const { AuthReturnPage } = await import('./AuthReturnPage')

function open() {
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/parent/auth?code=abc']}>
        <Routes>
          <Route path="/parent/auth" element={<AuthReturnPage />} />
          <Route path="/parent/dashboard" element={<p>dashboard</p>} />
          <Route path="/parent/login" element={<p>login</p>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
}

describe('AuthReturnPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useParentStore.setState({ session: null })
  })

  it('exchanges the code once (even in strict mode) and opens the dashboard', async () => {
    auth.completeSignIn.mockResolvedValue({ ok: true, email: 'a@b.uz', userId: 'u1' })
    open()
    expect(await screen.findByText('dashboard')).toBeInTheDocument()
    expect(auth.completeSignIn).toHaveBeenCalledTimes(1)
    expect(auth.completeSignIn).toHaveBeenCalledWith('?code=abc')
    expect(useParentStore.getState().session).toEqual({
      mode: 'cloud',
      email: 'a@b.uz',
      userId: 'u1',
    })
  })

  it('a failure says why and leads back to sign-in', async () => {
    auth.completeSignIn.mockResolvedValue({ ok: false, reason: 'other-browser' })
    open()
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('link')).toBeInTheDocument())
    expect(useParentStore.getState().session).toBeNull()
  })
})
