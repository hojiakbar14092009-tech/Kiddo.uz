import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { CrownIcon } from '@/components/icons'

/**
 * The small gold PRO chip on a control that needs PRO (voice, premium
 * content). The control itself stays usable on Free and explains, calmly and
 * for a parent, what PRO adds – there are no purchase pop-ups for children.
 * Always `aria-hidden`: the control's own label says "(PRO)".
 */
export function ProBadge({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  const { t } = useTranslation()
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'pointer-events-none absolute inline-flex items-center gap-0.5 rounded-full bg-coin font-display font-bold text-ink shadow-[0_2px_0_var(--color-coin-shadow)]',
        size === 'sm'
          ? '-top-2 -right-2 px-1.5 py-0.5 text-xs'
          : '-top-3 -right-2 px-2 py-0.5 text-sm',
        className,
      )}
    >
      <CrownIcon size={size === 'sm' ? 12 : 14} />
      {t('tier.proFeature')}
    </span>
  )
}
