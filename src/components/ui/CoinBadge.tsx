import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon } from '@/components/icons'

interface CoinBadgeProps {
  amount: number
}

export function CoinBadge({ amount }: CoinBadgeProps) {
  const { t } = useTranslation()
  // MVP: a gain is seen where the nuts live — the nut hops and "+N" rises (not under reduced motion)
  const [shown, setShown] = useState(amount)
  const [gain, setGain] = useState<{ n: number; at: number } | null>(null)
  if (amount !== shown) {
    setGain(amount > shown ? { n: amount - shown, at: amount } : null)
    setShown(amount)
  }

  return (
    <div
      className="relative inline-flex h-10 items-center gap-1 rounded-full border-[3px] border-coin bg-surface pr-2.5 pl-1 sm:h-14 sm:gap-2 sm:pr-4 sm:pl-2"
      data-testid="coin-counter"
      aria-label={`${t('common.coins')}: ${amount}`}
      role="status"
    >
      <span key={gain?.at} className={gain ? 'motion-safe:animate-pop-in' : undefined}>
        <CoinIcon size={26} />
      </span>
      <span className="font-display text-lg font-bold tabular-nums sm:text-2xl">{amount}</span>
      {gain && (
        <span
          key={gain.at}
          aria-hidden="true"
          data-testid="coin-gain"
          className="pointer-events-none absolute -top-5 left-1 font-display text-base font-extrabold text-coin-shadow opacity-0 motion-safe:animate-nut-rise"
        >
          +{gain.n}
        </span>
      )}
    </div>
  )
}
