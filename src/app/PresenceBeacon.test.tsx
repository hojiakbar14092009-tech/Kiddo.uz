import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { PresenceBeacon } from './PresenceBeacon'
import { CLOUD_BEAT_MS } from './presenceHeartbeat'

const upsert = vi.fn(async (_row: object, _options: object) => ({ error: null }))
const from = vi.fn((_table: string) => ({ upsert }))
const channel = vi.fn()
const posted = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => ({ from, channel }),
}))

vi.mock('@/store/paymentStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/store/paymentStore')>()),
  postAdminMessage: (message: unknown) => posted(message),
}))

function play(path = '/math') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PresenceBeacon />
    </MemoryRouter>,
  )
}

describe('PresenceBeacon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    upsert.mockClear()
    from.mockClear()
    posted.mockClear()
    useFamilyStore.setState({ children: [], activeChildId: null })
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    useFamilyStore.setState({ activeChildId: ali.id })
  })

  afterEach(() => {
    vi.useRealTimers()
    useParentStore.setState({ session: null })
  })

  it('cloud: upserts a private heartbeat once a minute, without the child’s name', async () => {
    useParentStore.getState().setCloudSession('a@x.uz', 'user-1')
    play('/math')
    await vi.advanceTimersByTimeAsync(0)
    const childId = useFamilyStore.getState().activeChildId
    expect(from).toHaveBeenCalledWith('presence_heartbeats')
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert).toHaveBeenCalledWith(
      { child_id: childId, screen: '/math' },
      { onConflict: 'child_id' },
    )
    expect(JSON.stringify(upsert.mock.calls)).not.toContain('Ali')

    await vi.advanceTimersByTimeAsync(CLOUD_BEAT_MS)
    expect(upsert).toHaveBeenCalledTimes(2)
    // No public Realtime channel any more.
    expect(channel).not.toHaveBeenCalled()
  })

  it('device: only the browser channel on this device, nothing to the server', async () => {
    useParentStore.getState().signInDemo()
    play('/math')
    await vi.advanceTimersByTimeAsync(CLOUD_BEAT_MS)
    expect(upsert).not.toHaveBeenCalled()
    expect(posted).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'presence', name: 'Ali', screen: '/math' }),
    )
  })

  it('sends nothing from the parent area', async () => {
    useParentStore.getState().setCloudSession('a@x.uz', 'user-1')
    play('/parent')
    await vi.advanceTimersByTimeAsync(CLOUD_BEAT_MS)
    expect(upsert).not.toHaveBeenCalled()
    expect(posted).not.toHaveBeenCalled()
  })
})
