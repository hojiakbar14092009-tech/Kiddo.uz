import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/Dialog'
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
 * anything. Big buttons, one question, the price shown as coins. A tap
 * outside does not answer it (only “no”, “yes” or Escape do).
 */
export function BuyDialog({ outfit, model, wearing, onConfirm, onCancel }: BuyDialogProps) {
  const { t } = useTranslation()
  const yes = useRef<HTMLButtonElement>(null)
  const name = t(`shop.items.${outfit.id}`)

  return (
    <BottomSheet
      role="alertdialog"
      dismissible={false}
      initialFocus={yes}
      onClose={onCancel}
      testId="buy-dialog"
      media={<Robot model={model} wearing={wearing} size={120} followPointer={false} />}
      title={
        <>
          <span aria-hidden="true">{outfit.emoji} </span>
          {t('shop.confirm', { name })}
        </>
      }
      description={<PriceLine price={outfit.price} />}
    >
      <div className="flex w-full flex-wrap justify-center gap-3">
        <Button variant="soft" onClick={onCancel}>
          {t('shop.no')}
        </Button>
        <Button ref={yes} variant="coin" onClick={onConfirm}>
          {t('shop.yes')}
        </Button>
      </div>
    </BottomSheet>
  )
}

/** “It costs N coins”, with the coin. Shared by the outfit and the pet purchase. */
export function PriceLine({ price }: { price: number }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-2 text-xl">
      <CoinIcon size={28} />
      {t('shop.confirmText', { count: price })}
    </span>
  )
}
