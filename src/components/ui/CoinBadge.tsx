import { useTranslation } from 'react-i18next'
import { CoinIcon } from '@/components/icons'

interface CoinBadgeProps {
  amount: number
}

export function CoinBadge({ amount }: CoinBadgeProps) {
  const { t } = useTranslation()

  return (
    <div
      className="inline-flex h-10 items-center gap-1 rounded-full border-[3px] border-coin bg-surface pr-2.5 pl-1 sm:h-14 sm:gap-2 sm:pr-4 sm:pl-2"
      data-testid="coin-counter"
      aria-label={`${t('common.coins')}: ${amount}`}
      role="status"
    >
      <CoinIcon size={26} />
      <span className="font-display text-lg font-bold tabular-nums sm:text-2xl">{amount}</span>
    </div>
  )
}
