import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Robot } from '@/features/mascot/Robot'
import type { MascotModel } from '@/store/familyStore'
import type { Outfit, Wearing } from './outfits'

interface BuyDialogProps {
  outfit: Outfit
  /** The child’s robot already wearing the item, so they see what they buy. */
  model: MascotModel
  wearing: Wearing
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A second, explicit “yes” before coins are spent, so a stray tap never buys
 * anything. Big buttons, one question, the price shown as coins.
 */
export function BuyDialog({ outfit, model, wearing, onConfirm, onCancel }: BuyDialogProps) {
  const { t } = useTranslation()
  const yes = useRef<HTMLButtonElement>(null)
  const name = t(`shop.items.${outfit.id}`)

  useEffect(() => {
    yes.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-title"
        aria-describedby="buy-text"
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-[36px] bg-surface p-6 text-center shadow-[0_8px_0_var(--color-line)]"
      >
        <Robot model={model} wearing={wearing} size={120} followPointer={false} />
        <h2 id="buy-title" className="font-display text-3xl font-extrabold">
          <span aria-hidden="true">{outfit.emoji} </span>
          {t('shop.confirm', { name })}
        </h2>
        <p id="buy-text" className="inline-flex items-center gap-2 text-xl text-ink-soft">
          <CoinIcon size={28} />
          {t('shop.confirmText', { count: outfit.price })}
        </p>
        <div className="flex w-full flex-wrap justify-center gap-3">
          <Button variant="soft" onClick={onCancel}>
            {t('shop.no')}
          </Button>
          <Button ref={yes} variant="coin" onClick={onConfirm}>
            {t('shop.yes')}
          </Button>
        </div>
      </div>
    </div>
  )
}
