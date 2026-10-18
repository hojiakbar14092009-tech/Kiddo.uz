import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { CheckIcon, CoinIcon } from '@/components/icons'
import type { Outfit } from './outfits'

interface OutfitCardProps {
  outfit: Outfit
  owned: boolean
  worn: boolean
  coins: number
  onSelect: () => void
}

export function OutfitCard({ outfit, owned, worn, coins, onSelect }: OutfitCardProps) {
  const { t } = useTranslation()
  const name = t(`shop.items.${outfit.id}`)
  const affordable = coins >= outfit.price

  const status = worn
    ? t('shop.wearing')
    : owned
      ? t('shop.wear')
      : affordable
        ? t('shop.price', { count: outfit.price })
        : t('shop.need', { count: outfit.price - coins })

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={owned ? worn : undefined}
      aria-label={`${name} — ${status}`}
      className={clsx(
        'flex h-full w-full flex-col items-center gap-2 rounded-[28px] border-4 bg-surface p-4 transition-transform active:translate-y-1',
        worn
          ? 'border-primary shadow-[0_6px_0_var(--color-primary-shadow)]'
          : 'border-transparent shadow-[0_6px_0_var(--color-line)]',
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'flex size-20 items-center justify-center rounded-full text-5xl sm:size-24 sm:text-6xl',
          owned ? 'bg-primary-soft' : 'bg-cream',
          !owned && !affordable && 'opacity-60',
        )}
      >
        {outfit.emoji}
      </span>
      <span className="font-display text-xl font-bold first-letter:uppercase">{name}</span>

      {worn ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 font-bold text-white">
          <CheckIcon size={18} />
          {status}
        </span>
      ) : owned ? (
        <span className="rounded-full bg-primary-soft px-3 py-1 font-bold text-primary-ink">
          {status}
        </span>
      ) : (
        <span className="flex flex-col items-center gap-0.5">
          <span
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-3 py-1 font-display text-lg font-bold',
              affordable ? 'bg-coin-soft text-ink' : 'bg-cream text-ink-soft',
            )}
          >
            <CoinIcon size={22} />
            {outfit.price}
          </span>
          {!affordable && <span className="text-sm text-ink-soft">{status}</span>}
        </span>
      )}
    </button>
  )
}
