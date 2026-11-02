import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/toast'
import { useSyncStore } from '@/services/sync/syncQueue'
import { deleteCloudAccount, signOutCloud } from '@/services/supabase/auth'
import { useFamilyStore } from '@/store/familyStore'
import { useParentStore } from '@/store/parentStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Panel } from './Panel'

/** The word the parent types to delete the account (the server asks for the same). */
export const DELETE_WORD = 'DELETE'

/**
 * The parent's cloud account (Phase 44): which account this is, children's photos in the
 * cloud (off unless the parent turns it on), and deleting the account with everything in it.
 */
export function AccountPanel({ email, userId }: { email: string; userId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cloudPhotos = useSettingsStore((state) => state.cloudPhotosFor.includes(userId))
  const setCloudPhotos = useSettingsStore((state) => state.setCloudPhotos)
  const signOut = useParentStore((state) => state.signOut)
  const [photosBusy, setPhotosBusy] = useState(false)
  const [photosError, setPhotosError] = useState<'failed' | 'pending' | null>(null)
  const [typed, setTyped] = useState('')
  const [wipeLocal, setWipeLocal] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(false)

  const togglePhotos = async (on: boolean) => {
    setPhotosError(null)
    setPhotosBusy(true)
    try {
      const [{ getSupabase }, photos] = await Promise.all([
        import('@/services/supabase/client'),
        import('@/services/sync/photos'),
      ])
      const supabase = getSupabase()
      if (!supabase) return
      if (on) {
        setCloudPhotos(userId, true)
        // a photo not sent now goes at the next sign-in; the parent is told, not shown a success
        if ((await photos.syncAllPhotos(supabase, userId)) > 0) setPhotosError('pending')
      } else if (await photos.removeAllPhotos(supabase, userId)) {
        setCloudPhotos(userId, false)
      } else {
        // the cloud copies are still there: the setting stays on, so nothing is left behind
        setPhotosError('failed')
      }
    } catch {
      setPhotosError('failed')
    } finally {
      setPhotosBusy(false)
    }
  }

  const deleteAccount = async () => {
    if (typed.trim() !== DELETE_WORD) return
    setDeleteError(false)
    setDeleting(true)
    const done = await deleteCloudAccount()
    if (!done) {
      setDeleting(false)
      setDeleteError(true)
      return
    }
    if (wipeLocal) {
      const { children, removeChild } = useFamilyStore.getState()
      for (const child of children) {
        useProgressStore.getState().resetChild(child.id)
        removeChild(child.id)
      }
    }
    // nothing more may go to an account that is gone (the removals just queued included)
    useSyncStore.getState().clear()
    useSyncStore.setState({ queue: [], deadLetter: [] })
    useSettingsStore.getState().setPhotoRemovals([])
    setCloudPhotos(userId, false)
    await signOutCloud().catch(() => undefined)
    signOut()
    toast(t('parent.account.deleted'), 'success')
    navigate('/parent/login', { replace: true })
  }

  return (
    <Panel title={t('parent.settings.account')} className="lg:col-span-2" id="account">
      <div className="flex flex-col gap-5">
        <p className="break-words text-ink-soft">
          {t('parent.settings.cloud', { email: email || '—' })}
        </p>

        <section className="flex flex-col gap-2" aria-labelledby="account-photos">
          <h3 id="account-photos" className="font-display text-lg font-bold">
            {t('parent.account.photosTitle')}
          </h3>
          <p className="text-sm text-ink-soft">{t('parent.account.photosText')}</p>
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={cloudPhotos}
              disabled={photosBusy}
              onChange={(event) => void togglePhotos(event.target.checked)}
              data-testid="account-photos"
              className="size-6 accent-primary"
            />
            {t('parent.account.photosToggle')}
          </label>
          {photosError && (
            <p role="alert" className="rounded-2xl bg-oops-soft px-4 py-2 text-oops-ink">
              {photosError === 'failed'
                ? t('parent.account.photosFailed')
                : t('parent.account.photosPending')}
            </p>
          )}
        </section>

        <section
          className="flex flex-col gap-3 rounded-2xl border-2 border-oops-soft p-4"
          aria-labelledby="account-delete"
        >
          <h3 id="account-delete" className="font-display text-lg font-bold text-oops-ink">
            {t('parent.account.deleteTitle')}
          </h3>
          <p className="text-sm">{t('parent.account.deleteText')}</p>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={wipeLocal}
              onChange={(event) => setWipeLocal(event.target.checked)}
              className="size-6 accent-primary"
            />
            {t('parent.account.deleteLocal')}
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            {t('parent.account.deleteType')}
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              data-testid="account-delete-word"
              className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal"
            />
          </label>
          {deleteError && (
            <p role="alert" className="rounded-2xl bg-oops-soft px-4 py-2 text-oops-ink">
              {t('parent.account.deleteFailed')}
            </p>
          )}
          <Button
            variant="oops"
            size="md"
            disabled={deleting || typed.trim() !== DELETE_WORD}
            onClick={() => void deleteAccount()}
            data-testid="account-delete"
          >
            {deleting ? t('parent.account.deleting') : t('parent.account.deleteButton')}
          </Button>
        </section>
      </div>
    </Panel>
  )
}
