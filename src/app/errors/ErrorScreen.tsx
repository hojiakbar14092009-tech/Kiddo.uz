import { useTranslation } from 'react-i18next'
import { KiddoMark } from '@/components/brand/KiddoLogo'

/**
 * A calm, child-friendly screen for when a page cannot be shown. It never
 * shows technical details; it offers to try again or go home. Used by the
 * router (`RouteErrorScreen`) and by the app-wide error boundary, so it does
 * not depend on the router.
 */
export function ErrorScreen({ updating = false }: { updating?: boolean }) {
  const { t } = useTranslation()
  return (
    <main
      role="alert"
      data-testid="error-screen"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-cream px-6 py-10 text-center text-ink"
    >
      <KiddoMark size={112} />
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        {updating ? t('errors.updatingTitle') : t('errors.title')}
      </h1>
      <p className="max-w-md text-lg text-ink-soft">
        {updating ? t('errors.updatingText') : t('errors.text')}
      </p>
      {!updating && (
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-14 rounded-full bg-primary px-7 font-display text-xl font-bold text-white shadow-press-primary active:translate-y-1"
          >
            {t('errors.retry')}
          </button>
          <a
            href="/home"
            className="inline-flex min-h-14 items-center rounded-full bg-surface px-7 font-display text-xl font-bold text-ink shadow-press"
          >
            {t('common.home')}
          </a>
        </div>
      )}
    </main>
  )
}
