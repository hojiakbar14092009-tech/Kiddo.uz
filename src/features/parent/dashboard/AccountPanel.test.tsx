import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import i18n from '@/i18n'
import { useSyncStore } from '@/services/sync/syncQueue'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { useSettingsStore } from '@/store/settingsStore'

/* Phase 44: cloud photos (opt-in) and deleting the account with everything in it. */

const auth = vi.hoisted(() => ({ deleteCloudAccount: vi.fn(), signOutCloud: vi.fn() }))
const photos = vi.hoisted(() => ({ syncAllPhotos: vi.fn(), removeAllPhotos: vi.fn() }))
vi.mock('@/services/supabase/auth', () => auth)
vi.mock('@/services/sync/photos', () => photos)
vi.mock('@/services/supabase/client', () => ({ getSupabase: () => ({}) }))

const { AccountPanel, DELETE_WORD } = await import('./AccountPanel')

function open() {
  return render(
    <MemoryRouter>
      <AccountPanel email="ona@example.com" userId="u1" />
    </MemoryRouter>,
  )
}

describe('the account panel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSettingsStore.setState({ cloudPhotosFor: [], photoRemovals: [] })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useFamilyStore
      .getState()
      .addChild({ name: 'Aziza', birthDate: birthDateForAge(5, '2026-11-02'), gender: 'girl' })
    useParentStore.setState({ session: { mode: 'cloud', email: 'ona@example.com', userId: 'u1' } })
    auth.signOutCloud.mockResolvedValue(undefined)
  })

  it('photos go to the cloud only when turned on; off removes the cloud copies first', async () => {
    photos.syncAllPhotos.mockResolvedValue(0)
    open()
    fireEvent.click(screen.getByTestId('account-photos'))
    await waitFor(() => expect(photos.syncAllPhotos).toHaveBeenCalledWith({}, 'u1'))
    // for this account only
    expect(useSettingsStore.getState().cloudPhotosFor).toEqual(['u1'])
    // the cloud copies could not be removed: the setting stays on, the parent is told
    photos.removeAllPhotos.mockResolvedValue(false)
    fireEvent.click(screen.getByTestId('account-photos'))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(useSettingsStore.getState().cloudPhotosFor).toEqual(['u1'])
    photos.removeAllPhotos.mockResolvedValue(true)
    fireEvent.click(screen.getByTestId('account-photos'))
    await waitFor(() => expect(useSettingsStore.getState().cloudPhotosFor).toEqual([]))
  })

  it('a photo that could not be sent is said, not shown as done', async () => {
    photos.syncAllPhotos.mockResolvedValue(1)
    open()
    fireEvent.click(screen.getByTestId('account-photos'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      i18n.t('parent.account.photosPending'),
    )
  })

  it('deleting needs the word; a failure changes nothing here', async () => {
    auth.deleteCloudAccount.mockResolvedValue(false)
    open()
    const button = screen.getByTestId('account-delete')
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByTestId('account-delete-word'), { target: { value: 'delete' } })
    expect(button).toBeDisabled()
    fireEvent.change(screen.getByTestId('account-delete-word'), { target: { value: DELETE_WORD } })
    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(useFamilyStore.getState().children).toHaveLength(1)
    expect(useParentStore.getState().session).not.toBeNull()
  })

  it('once deleted: this device forgets the family (when asked), the queue and the session', async () => {
    auth.deleteCloudAccount.mockResolvedValue(true)
    open()
    fireEvent.change(screen.getByTestId('account-delete-word'), { target: { value: DELETE_WORD } })
    fireEvent.click(screen.getByTestId('account-delete'))
    await waitFor(() => expect(useParentStore.getState().session).toBeNull())
    expect(useFamilyStore.getState().children).toEqual([])
    // nothing is left queued for the account that is gone, not even the removals
    expect(useSyncStore.getState().queue).toEqual([])
    expect(auth.signOutCloud).toHaveBeenCalled()
  })
})
