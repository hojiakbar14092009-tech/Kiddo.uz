import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { TrashIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { toast } from '@/components/ui/toast'
import { useChildKey } from '@/store/progressStore'
import { GALLERY_LIMITS, studioGallery } from './gallery'

interface Shown {
  id: string
  url: string
  createdAt: number
}

/** `/studio/gallery`: the child's saved pictures, newest first, each can be deleted. */
export function StudioGalleryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const childKey = useChildKey()
  // null while loading, 'error' when the storage could not be read
  const [works, setWorks] = useState<Shown[] | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [deleting, setDeleting] = useState<Shown | null>(null)
  const keepButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    let urls: string[] = []
    void studioGallery()
      .list(childKey)
      .then((list) => {
        if (cancelled) return
        const shown = list.map((work) => ({
          id: work.id,
          createdAt: work.createdAt,
          url: URL.createObjectURL(work.image),
        }))
        urls = shown.map((work) => work.url)
        setWorks(shown)
      })
      .catch(() => {
        if (!cancelled) setWorks('error')
      })
    return () => {
      cancelled = true
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [attempt, childKey])

  const remove = async (work: Shown) => {
    setDeleting(null)
    try {
      await studioGallery().remove(work.id)
      URL.revokeObjectURL(work.url)
      setWorks((current) =>
        Array.isArray(current) ? current.filter((item) => item.id !== work.id) : current,
      )
      toast(t('studio.deleted'), 'success')
    } catch {
      toast(t('studio.saveFailed'), 'warning')
    }
  }

  const date = (time: number) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long' }).format(time)

  return (
    <Screen header={<TitleTopBar title={t('studio.gallery')} back="/studio" />}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4 short:py-2">
        {works === null ? null : works === 'error' ? (
          <EmptyState
            picture="rain-cloud"
            title={t('studio.galleryErrorTitle')}
            text={t('studio.galleryErrorText')}
            action={
              <Button
                onClick={() => {
                  setWorks(null)
                  setAttempt((count) => count + 1)
                }}
              >
                {t('errors.retry')}
              </Button>
            }
          />
        ) : works.length === 0 ? (
          <EmptyState
            picture="paintbrush"
            title={t('studio.galleryEmpty')}
            text={t('studio.galleryEmptyText')}
            action={<Button onClick={() => navigate('/studio')}>{t('studio.draw')}</Button>}
          />
        ) : (
          <>
            <p className="text-center text-lg text-ink-soft">
              {t('studio.galleryCount', { count: works.length, max: GALLERY_LIMITS.maxWorks })}
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 short:grid-cols-4">
              {works.map((work, index) => (
                <li key={work.id} className="relative">
                  <img
                    src={work.url}
                    alt={t('studio.workAlt', {
                      number: works.length - index,
                      date: date(work.createdAt),
                    })}
                    className="aspect-[4/3] w-full rounded-card bg-surface object-cover shadow-press"
                  />
                  <IconButton
                    label={t('studio.deleteWork')}
                    className="absolute top-2 right-2 size-12! bg-surface/90"
                    onClick={() => setDeleting(work)}
                  >
                    <TrashIcon size={24} />
                  </IconButton>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {deleting && (
        <Dialog
          role="alertdialog"
          dismissible={false}
          initialFocus={keepButton}
          size="sm"
          title={t('studio.deleteTitle')}
          media={
            <img
              src={deleting.url}
              alt=""
              className="aspect-[4/3] w-40 rounded-card object-cover shadow-press"
            />
          }
          onClose={() => setDeleting(null)}
        >
          <div className="flex w-full flex-wrap justify-center gap-3">
            <Button ref={keepButton} variant="soft" size="md" onClick={() => setDeleting(null)}>
              {t('studio.clearNo')}
            </Button>
            <Button variant="oops" size="md" onClick={() => void remove(deleting)}>
              {t('studio.deleteYes')}
            </Button>
          </div>
        </Dialog>
      )}
    </Screen>
  )
}
