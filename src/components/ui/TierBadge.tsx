import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { CrownIcon } from '@/components/icons'
import { useIsPro } from '@/store/subscriptionStore'

/** Shows whether the family is on Free or PRO, always in the same place in the top bar. */
export function TierBadge() {
  const { t } = useTranslation()
  const isPro = useIsPro()

  return (
    <span
      role="status"
      aria-label={isPro ? t('tier.proActive') : t('tier.freeActive')}
      className={clsx(
        'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-1.5 font-display text-[11px] font-bold sm:h-9 sm:px-3 sm:text-sm',
        isPro ? 'bg-coin text-ink' : 'bg-muted text-ink-soft',
      )}
    >
      {isPro && <CrownIcon size={16} />}
      <span className={clsx(isPro && 'hidden sm:inline')}>
        {isPro ? t('tier.pro') : t('tier.free')}
      </span>
    </span>
  )
}
