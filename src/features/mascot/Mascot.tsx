import clsx from 'clsx'
import type { Wearing } from '@/features/shop/outfits'
import { useMascotModel } from '@/store/familyStore'
import { useActivePet, useWearing } from '@/store/progressStore'
import { PetCompanion } from '@/features/pets/PetCompanion'
import { useMascotStore } from './mascotStore'
import { MascotThoughtBubble } from './MascotThoughtBubble'
import { MascotFigure } from './MascotFigure'

interface MascotProps {
  /** Width classes for the robot, e.g. `w-24 sm:w-36`. */
  robotClassName?: string
  /** Where the bubble appears relative to the robot. */
  bubbleSide?: 'left' | 'right'
  /** When the screen is speaking (PRO), the robot moves its mouth. */
  speaking?: boolean
  /** Overrides the child’s clothes, e.g. to try an item on in the shop. */
  wearing?: Wearing
  /** Marks the robot’s spot (`data-roam`), so a roaming robot can start from it. */
  robotRoam?: string
  className?: string
}

/**
 * The robot that lives on a screen together with its thought bubble (Free)
 * or subtitle (PRO). Mood and message come from the shared mascot store,
 * so any part of the screen can make it react through `useMascot()`.
 */
export function Mascot({
  robotClassName = 'w-24 sm:w-36',
  bubbleSide = 'right',
  speaking = false,
  wearing,
  robotRoam,
  className,
}: MascotProps) {
  const model = useMascotModel()
  const ownWearing = useWearing()
  const pet = useActivePet()
  const mood = useMascotStore((state) => state.mood)
  const message = useMascotStore((state) => state.message)
  const reactionKey = useMascotStore((state) => state.reactionKey)

  return (
    <div
      className={clsx(
        'flex items-center gap-1',
        bubbleSide === 'right' ? 'flex-row' : 'flex-row-reverse',
        className,
      )}
    >
      <div data-roam={robotRoam} className={clsx('relative shrink-0', robotClassName)}>
        <MascotFigure
          model={model}
          wearing={wearing ?? ownWearing}
          mood={mood === 'idle' && speaking ? 'talk' : mood}
          reactionKey={reactionKey}
          className="h-auto w-full"
        />
        {pet && <PetCompanion pet={pet} mood={mood} />}
      </div>
      <MascotThoughtBubble
        message={message}
        messageKey={reactionKey}
        side={bubbleSide === 'right' ? 'left' : 'right'}
        className="min-w-0 flex-1"
      />
    </div>
  )
}
