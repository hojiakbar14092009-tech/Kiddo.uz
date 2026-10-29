import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { levelOfChild, useActiveChild } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { PetSprite } from '@/features/pets/PetSprite'
import type { PetId } from '@/features/pets/pets'
import {
  BIRTHDAY_COINS,
  birthdayDue,
  claimBirthdayGift,
  giftablePets,
  tashkentDay,
} from './birthday'

/**
 * The birthday party (Phase 24): in the birthday week the child gets 50 coins
 * and picks one pet as a present, once a year. It waits until the new-age
 * unlock party (age/UnlockCelebration) has been seen, so two never overlap.
 */
export function BirthdayCelebration() {
  const child = useActiveChild()
  if (!child) return null
  // the unlock party of a new age comes first
  if (levelOfChild(child) > child.celebratedLevel) return null
  const year = birthdayDue(child, tashkentDay())
  if (year === null) return null
  return <Party key={`${child.id}-${year}`} childId={child.id} name={child.name} year={year} />
}

function Party({ childId, name, year }: { childId: string; name: string; year: number }) {
  const { t } = useTranslation()
  const { sayText } = useSpeaker()
  const progress = useProgress(childId)
  // the choices stay as they were when the party opened
  const [choices] = useState(() => giftablePets(progress.pets ?? []))
  const [pet, setPet] = useState<PetId | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  // focus starts on the first choice (the present button waits for one)
  const firstPet = useRef<HTMLButtonElement>(null)
  const title = t('birthday.title', { name })
  const text =
    choices.length > 0
      ? t('birthday.text', { coins: BIRTHDAY_COINS })
      : t('birthday.textAllPets', { coins: BIRTHDAY_COINS })

  useEffect(() => {
    void sayText(`${title} ${text}`)
  }, [sayText, text, title])

  const ready = choices.length === 0 || pet !== null
  const claim = () => {
    if (!ready) return
    claimBirthdayGift(childId, year, pet)
  }

  return (
    <Dialog
      title={title}
      description={text}
      onClose={claim}
      dismissible={false}
      closeOnEscape={false}
      initialFocus={choices.length > 0 ? firstPet : button}
      testId="birthday-celebration"
      media={
        <RewardBurst kind="coins" pieces={12}>
          <span aria-hidden="true" className="text-7xl">
            🎂
          </span>
        </RewardBurst>
      }
    >
      <p
        className="font-display text-2xl font-extrabold text-coin-shadow"
        data-testid="birthday-coins"
      >
        +{BIRTHDAY_COINS} 🪙
      </p>
      {choices.length > 0 && (
        <fieldset className="flex w-full flex-col gap-2">
          <legend className="mb-1 font-display text-lg font-bold">{t('birthday.choosePet')}</legend>
          <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
            {choices.map((id, index) => (
              <button
                key={id}
                ref={index === 0 ? firstPet : undefined}
                type="button"
                aria-pressed={pet === id}
                onClick={() => setPet(id)}
                data-testid={`birthday-pet-${id}`}
                className={clsx(
                  'flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl border-4 p-2 font-bold',
                  pet === id ? 'border-primary bg-primary-soft' : 'border-line bg-surface',
                )}
              >
                <PetSprite pet={id} emotion="happy" lively={false} className="size-14" />
                {t(`shop.pets.${id}`)}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <Button
        ref={button}
        variant="coin"
        onClick={claim}
        disabled={!ready}
        data-testid="birthday-claim"
      >
        {choices.length > 0 && pet === null ? t('birthday.pickFirst') : t('birthday.claim')}
      </Button>
    </Dialog>
  )
}
