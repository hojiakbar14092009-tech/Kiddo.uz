import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { CheckIcon, CoinIcon } from '@/components/icons'
import type { Outfit, OutfitTone } from './outfits'
import { OutfitPreview } from './OutfitPreview'

interface OutfitCardProps {
  outfit: Outfit
  owned: boolean
  worn: boolean
  coins: number
  /** Colours of the learner's character stage (Phase 31). */
  tone: OutfitTone
  onSelect: () => void
}

export function OutfitCard({ outfit, owned, worn, coins, tone, onSelect }: OutfitCardProps) {
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
          'flex size-20 items-center justify-center overflow-hidden rounded-full border-4 bg-white p-1 sm:size-24',
          owned ? 'border-primary-soft' : 'border-cream',
          !owned && !affordable && 'opacity-60',
        )}
      >
        <OutfitPreview outfit={outfit} tone={tone} className="size-full" />
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
