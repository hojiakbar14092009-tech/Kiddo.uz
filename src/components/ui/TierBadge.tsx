import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { CrownIcon } from '@/components/icons'
import { useProTier } from '@/domain/entitlements'

/** Shows whether the family is on Free or PRO, always in the same place in the top bar. */
export function TierBadge() {
  const { t } = useTranslation()
  const isPro = useProTier() === 'pro'

  return (
    <span
      role="status"
      aria-label={isPro ? t('tier.proActive') : t('tier.freeActive')}
      className={clsx(
        'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-1.5 font-display text-[11px] font-bold sm:h-9 sm:px-3 sm:text-sm',
        isPro ? 'bg-coin text-ink' : 'bg-surface text-ink-soft shadow-[0_3px_0_var(--color-line)]',
      )}
    >
      {isPro && <CrownIcon size={16} />}
      <span className={clsx(isPro && 'hidden sm:inline')}>
        {isPro ? t('tier.pro') : t('tier.free')}
      </span>
    </span>
  )
}
