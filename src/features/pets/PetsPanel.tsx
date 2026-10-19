import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, CoinIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import { useMascot } from '@/features/mascot/useMascot'
import { Robot } from '@/features/mascot/Robot'
import { useMascotModel } from '@/store/familyStore'
import { useChildKey, useProgress, useProgressStore, useWearing } from '@/store/progressStore'
import { PetSprite } from './PetSprite'
import { PET_IDS, PET_PRICE, type PetId } from './pets'
import { playPetSound } from './petSounds'

/**
 * The pet corner of the shop: five lively pets. Tapping one lets it say hello
 * in its own voice; a pet the child has can walk with the robot. A new one is
 * tried first – it stands next to the robot exactly as it will after adopting
 * it, for free – and a second tap (or “Adopt”) buys it for coins.
 */
export function PetsPanel({
  previewing,
  onPreview,
}: {
  /** The pet standing next to the robot on trial (not bought yet). */
  previewing: PetId | null
  onPreview: (pet: PetId | null) => void
}) {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const { coins, pets = [], pet: activePet } = useProgress()
  const buyPet = useProgressStore((state) => state.buyPet)
  const choosePet = useProgressStore((state) => state.choosePet)
  const { react } = useMascot()
  const [pending, setPending] = useState<PetId | null>(null)

  const select = (pet: PetId) => {
    playPetSound(pet)
    if (pets.includes(pet)) {
      onPreview(null)
      choosePet(childKey, activePet === pet ? null : pet)
      return
    }
    if (previewing !== pet) {
      // First tap: try it on – the pet stands next to the robot, nothing is spent.
      onPreview(pet)
      react('greet', { text: t('shop.petPreview', { name: t(`shop.pets.${pet}`) }), emoji: '👀' })
      return
    }
    adopt(pet)
  }

  const adopt = (pet: PetId) => {
    if (coins < PET_PRICE) {
      react('greet', { text: t('shop.notEnough', { count: PET_PRICE - coins }), emoji: '💪' })
      return
    }
    setPending(pet)
  }

  const confirm = () => {
    if (pending && buyPet(childKey, pending)) {
      playPetSound(pending)
      onPreview(null)
      react('celebrate', {
        text: t('shop.petBought', { name: t(`shop.pets.${pending}`) }),
        emoji: '🎉',
      })
    }
    setPending(null)
  }

  return (
    <>
      <ul className="grid w-full flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
        {PET_IDS.map((pet) => {
          const owned = pets.includes(pet)
          const walking = activePet === pet
          const trying = previewing === pet
          const affordable = coins >= PET_PRICE
          const name = t(`shop.pets.${pet}`)
          const status = walking
            ? t('shop.petWalking')
            : trying
              ? `${t('shop.petTrying')} – ${t('shop.petPrice', { count: PET_PRICE })}`
              : owned
                ? t('shop.petTake')
                : affordable
                  ? t('shop.petPrice', { count: PET_PRICE })
                  : t('shop.need', { count: PET_PRICE - coins })
          return (
            <li key={pet} data-roam="shop" className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => select(pet)}
                aria-pressed={owned ? walking : trying}
                aria-label={`${name} — ${status}`}
                className={clsx(
                  'flex h-full w-full flex-col items-center gap-2 rounded-[28px] border-4 bg-surface p-4 transition-transform active:translate-y-1',
                  walking
                    ? 'border-primary shadow-[0_6px_0_var(--color-primary-shadow)]'
                    : trying
                      ? 'border-dashed border-coin-shadow shadow-[0_6px_0_var(--color-coin-shadow)]'
                      : 'border-transparent shadow-[0_6px_0_var(--color-line)]',
                )}
              >
                <span className="flex aspect-square w-full max-w-40 items-end justify-center rounded-[24px] bg-white">
                  <PetSprite pet={pet} className="w-[92%]" />
                </span>
                <span className="font-display text-xl font-bold">{name}</span>
                {walking ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 font-bold text-white">
                    <CheckIcon size={18} />
                    {status}
                  </span>
                ) : trying ? (
                  <span className="rounded-full bg-coin px-3 py-1 font-bold text-ink">
                    👀 {t('shop.petTrying')}
                  </span>
                ) : owned ? (
                  <span className="rounded-full bg-primary-soft px-3 py-1 font-bold text-primary-ink">
                    {status}
                  </span>
                ) : (
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-3 py-1 font-display text-lg font-bold',
                      affordable ? 'bg-coin-soft text-ink' : 'bg-cream text-ink-soft',
                    )}
                  >
                    <CoinIcon size={22} />
                    {PET_PRICE}
                  </span>
                )}
              </button>
              {trying && (
                <Button variant="coin" size="md" onClick={() => adopt(pet)}>
                  <CoinIcon size={22} />
                  {t('shop.petBuy')} · {PET_PRICE}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {pending && (
        <PetBuyDialog pet={pending} onConfirm={confirm} onCancel={() => setPending(null)} />
      )}
    </>
  )
}

function PetBuyDialog({
  pet,
  onConfirm,
  onCancel,
}: {
  pet: PetId
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const yes = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  useFocusTrap(dialog, yes)
  const name = t(`shop.pets.${pet}`)
  const model = useMascotModel()
  const wearing = useWearing()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-buy-title"
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-[36px] bg-surface p-6 text-center text-ink shadow-[0_8px_0_var(--color-line)]"
      >
        {/* exactly how they will stand together */}
        <div className="relative w-40">
          <Robot model={model} wearing={wearing} size={160} followPointer={false} mood="happy" />
          <PetSprite pet={pet} emotion="happy" className="absolute bottom-0 left-[62%] w-[58%]" />
        </div>
        <h2 id="pet-buy-title" className="font-display text-3xl font-extrabold">
          {t('shop.petConfirm', { name })}
        </h2>
        <p className="inline-flex items-center gap-2 text-xl text-ink-soft">
          <CoinIcon size={28} />
          {t('shop.confirmText', { count: PET_PRICE })}
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
