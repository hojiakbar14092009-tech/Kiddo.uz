import { useTranslation } from 'react-i18next'
import { CoinIcon } from '@/components/icons'

interface CoinBadgeProps {
  amount: number
}

export function CoinBadge({ amount }: CoinBadgeProps) {
  const { t } = useTranslation()

  return (
    <div
      className="inline-flex h-14 items-center gap-2 rounded-full border-[3px] border-coin bg-surface pr-4 pl-2"
      aria-label={`${t('common.coins')}: ${amount}`}
      role="status"
    >
      <CoinIcon size={32} />
      <span className="font-display text-2xl font-bold tabular-nums">{amount}</span>
    </div>
  )
}
