import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, LockIcon } from '@/components/icons'

/**
 * The way into the parent area: a clear card in the app's style, but calm
 * (no bright colour, at the bottom) so children are not drawn to it. The
 * parent gate behind it does the real protecting.
 */
export function ParentAreaLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/parent"
      aria-label={t('common.parentArea')}
      className="flex w-full max-w-md items-center gap-4 rounded-[28px] border-2 border-line-strong bg-surface p-4 text-left text-ink shadow-[0_7px_0_var(--color-line)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_var(--color-line)]"
    >
      <span className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-primary-soft text-primary-ink">
        <LockIcon size={30} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-xl font-extrabold">{t('common.parentArea')}</span>
        <span className="text-sm font-semibold text-ink-soft">{t('common.parentAreaHint')}</span>
      </span>
      <ChevronRightIcon size={28} aria-hidden="true" />
    </Link>
  )
}
