import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, CoinIcon, HeartIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/Dialog'
import { useMascot } from '@/features/mascot/useMascot'
import { PriceLine } from '@/features/shop/BuyDialog'
import { Robot } from '@/features/mascot/Robot'
import { useMascotModel } from '@/store/familyStore'
import { useChildKey, useProgress, useProgressStore, useWearing } from '@/store/progressStore'
import { PetSprite } from './PetSprite'
import { bondLevel, daysToNextHeart, MAX_BOND } from './bond'
import { PET_IDS, PET_PRICE, type PetEmotion, type PetId } from './pets'
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
  const { coins, pets = [], pet: activePet, petBond = {} } = useProgress()
  const buyPet = useProgressStore((state) => state.buyPet)
  const choosePet = useProgressStore((state) => state.choosePet)
  const { react } = useMascot()
  const [pending, setPending] = useState<PetId | null>(null)
  // a tapped pet answers: surprised for a moment, then glad to see the child
  const [reaction, setReaction] = useState<{ pet: PetId; pose: PetEmotion } | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), [])
  const answer = (pet: PetId) => {
    timers.current.forEach((id) => window.clearTimeout(id))
    setReaction({ pet, pose: 'surprised' })
    timers.current = [
      window.setTimeout(() => setReaction({ pet, pose: 'happy' }), 700),
      window.setTimeout(() => setReaction(null), 1900),
    ]
  }

  const select = (pet: PetId) => {
    playPetSound(pet)
    answer(pet)
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
          const hearts = bondLevel(petBond[pet]?.days ?? 0)
          const left = daysToNextHeart(petBond[pet]?.days ?? 0)
          const bond = `${t('shop.petBond', { count: hearts, total: MAX_BOND })}. ${
            left === null ? t('shop.petBondFull') : t('shop.petBondNext', { count: left })
          }`
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
                aria-label={owned ? `${name} — ${status}. ${bond}` : `${name} — ${status}`}
                className={clsx(
                  'flex h-full w-full flex-col items-center gap-2 rounded-card border-4 bg-surface p-4 transition-transform active:translate-y-1',
                  walking
                    ? 'border-primary shadow-press-primary'
                    : trying
                      ? 'border-dashed border-coin-shadow shadow-press-coin'
                      : 'border-transparent shadow-press',
                )}
              >
                <span className="flex aspect-square w-full max-w-40 items-end justify-center rounded-tile bg-white">
                  <PetSprite
                    pet={pet}
                    emotion={reaction?.pet === pet ? reaction.pose : undefined}
                    className="w-[92%]"
                  />
                </span>
                <span className="font-display text-xl font-bold">{name}</span>
                {owned && <BondHearts level={hearts} days={petBond[pet]?.days ?? 0} />}
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

/** The friendship with an owned pet: five hearts, filled one by one on days played together. */
function BondHearts({ level, days }: { level: number; days: number }) {
  const { t } = useTranslation()
  const left = daysToNextHeart(days)
  return (
    <span className="flex flex-col items-center gap-0.5" data-testid="pet-bond" data-level={level}>
      <span className="flex gap-0.5 text-highlight" aria-hidden="true">
        {Array.from({ length: MAX_BOND }, (_, index) => (
          <HeartIcon key={index} size={18} filled={index < level} />
        ))}
      </span>
      <span className="text-sm text-ink-soft" aria-hidden="true">
        {left === null ? t('shop.petBondFull') : t('shop.petBondNext', { count: left })}
      </span>
    </span>
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
  const name = t(`shop.pets.${pet}`)
  const model = useMascotModel()
  const wearing = useWearing()

  return (
    <BottomSheet
      role="alertdialog"
      dismissible={false}
      initialFocus={yes}
      onClose={onCancel}
      testId="pet-buy-dialog"
      media={
        // exactly how they will stand together
        <div className="relative w-40">
          <Robot model={model} wearing={wearing} size={160} followPointer={false} mood="happy" />
          <PetSprite pet={pet} emotion="happy" className="absolute bottom-0 left-[62%] w-[58%]" />
        </div>
      }
      title={t('shop.petConfirm', { name })}
      description={<PriceLine price={PET_PRICE} />}
    >
      <div className="flex w-full flex-wrap justify-center gap-3">
        <Button variant="soft" onClick={onCancel}>
          {t('shop.no')}
        </Button>
        <Button ref={yes} variant="coin" data-sound="confirm" onClick={onConfirm}>
          {t('shop.yes')}
        </Button>
      </div>
    </BottomSheet>
  )
}
