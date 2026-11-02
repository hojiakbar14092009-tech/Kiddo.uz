import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useParentStore } from '@/store/parentStore'

/* Phase 44: a cloud account without consent on record asks before the parent area opens. */

const consent = vi.hoisted(() => ({ ensureConsent: vi.fn(), acceptConsent: vi.fn() }))
vi.mock('@/services/supabase/consent', () => consent)
vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }),
}))

const { ConsentGate } = await import('./ConsentGate')

function open(onLeave = vi.fn()) {
  render(
    <ConsentGate onLeave={onLeave}>
      <p>dashboard</p>
    </ConsentGate>,
  )
  return onLeave
}

describe('ConsentGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useParentStore.setState({ session: { mode: 'cloud', email: 'a@b.uz', userId: 'u1' } })
  })

  it('consent on record: the parent area opens', async () => {
    consent.ensureConsent.mockResolvedValue('ok')
    open()
    await waitFor(() => expect(consent.ensureConsent).toHaveBeenCalled())
    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('consent-gate')).toBeNull()
  })

  it('no consent: asked first; agreeing opens the area, leaving signs out', async () => {
    consent.ensureConsent.mockResolvedValue('needed')
    consent.acceptConsent.mockResolvedValue(true)
    const onLeave = open()
    expect(await screen.findByTestId('consent-gate')).toBeInTheDocument()
    expect(screen.queryByText('dashboard')).toBeNull()
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(buttons[0]!)
    await waitFor(() => expect(screen.getByText('dashboard')).toBeInTheDocument())
    expect(onLeave).not.toHaveBeenCalled()
  })

  it('demo mode is never asked', () => {
    useParentStore.setState({ session: { mode: 'demo' } })
    open()
    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(consent.ensureConsent).not.toHaveBeenCalled()
  })
})
