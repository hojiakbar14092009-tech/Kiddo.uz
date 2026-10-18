import { useTranslation } from 'react-i18next'

/** Shown for the moment a lazily loaded screen takes to arrive. */
export function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div role="status" data-loading-screen className="flex min-h-dvh items-center justify-center">
      <span className="sr-only">{t('common.loading')}</span>
      <span
        aria-hidden="true"
        className="size-14 animate-spin rounded-full border-[6px] border-primary-soft border-t-primary motion-reduce:animate-none"
      />
    </div>
  )
}
