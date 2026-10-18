import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LockIcon } from '@/components/icons'

/**
 * The way into the parent area: a proper button in the app's style, but calm
 * (no bright colour, at the bottom) so children are not drawn to it. The
 * parent gate behind it does the real protecting.
 */
export function ParentAreaLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/parent"
      aria-label={t('common.parentArea')}
      className="inline-flex min-h-14 items-center gap-3 rounded-full border-2 border-line-strong bg-surface py-2 pr-6 pl-2 font-display text-lg font-bold text-ink shadow-[0_5px_0_var(--color-line)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_var(--color-line)]"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        <LockIcon size={20} />
      </span>
      <span className="flex flex-col items-start leading-tight">
        {t('common.parentArea')}
        <span className="text-xs font-semibold text-ink-soft">{t('common.parentAreaHint')}</span>
      </span>
    </Link>
  )
}
