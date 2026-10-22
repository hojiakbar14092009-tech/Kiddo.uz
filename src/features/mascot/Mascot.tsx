import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { Wearing } from '@/features/shop/outfits'
import { useMascotModel } from '@/store/familyStore'
import { useActivePet, useWearing } from '@/store/progressStore'
import { PetCompanion } from '@/features/pets/PetCompanion'
import type { PetId } from '@/features/pets/pets'
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
  /**
   * The mouth moves only while sound really plays (`speaking`): an instruction
   * shown in the bubble alone does not make the robot look as if it talks.
   */
  talkOnlyWhileSpeaking?: boolean
  /** Overrides the child’s clothes, e.g. to try an item on in the shop. */
  wearing?: Wearing
  /** Marks the robot’s spot (`data-roam`), so a roaming robot can start from it. */
  robotRoam?: string
  /** Overrides the pet at its feet, e.g. to try a pet before adopting it (null: none). */
  pet?: PetId | null
  /** Shown under the bubble, beside the robot (e.g. a button), never on top of the robot. */
  aside?: ReactNode
  className?: string
}

/**
 * The robot that lives on a screen together with its thought bubble (Free)
 * or subtitle (PRO). Mood and message come from the shared mascot store,
 * so any part of the screen can make it react through `useMascot()`.
 */
/** Moods the robot leaves to talk while speech plays (a cheer or an “oops” stays as it is). */
const TALKS_IN = new Set(['idle', 'wave', 'talk', 'sleepy'])

export function Mascot({
  robotClassName = 'w-24 sm:w-36',
  bubbleSide = 'right',
  speaking = false,
  talkOnlyWhileSpeaking = false,
  wearing,
  robotRoam,
  pet: petOverride,
  aside,
  className,
}: MascotProps) {
  const model = useMascotModel()
  const ownWearing = useWearing()
  const activePet = useActivePet()
  const pet = petOverride === undefined ? activePet : petOverride
  const mood = useMascotStore((state) => state.mood)
  const message = useMascotStore((state) => state.message)
  const reactionKey = useMascotStore((state) => state.reactionKey)
  const shownMood =
    speaking && TALKS_IN.has(mood)
      ? 'talk'
      : talkOnlyWhileSpeaking && !speaking && mood === 'talk'
        ? 'idle'
        : mood

  return (
    <div
      className={clsx(
        'flex items-center gap-1',
        bubbleSide === 'right' ? 'flex-row' : 'flex-row-reverse',
        className,
      )}
    >
      <div
        data-roam={robotRoam}
        data-mood={shownMood}
        data-testid="mascot"
        className={clsx('relative shrink-0', robotClassName)}
      >
        <MascotFigure
          model={model}
          wearing={wearing ?? ownWearing}
          mood={shownMood}
          reactionKey={reactionKey}
          className="h-auto w-full"
        />
        {pet && <PetCompanion key={pet} pet={pet} mood={mood} />}
      </div>
      {aside ? (
        <div className="flex min-w-0 flex-1 flex-col items-center justify-start gap-2 self-stretch">
          <MascotThoughtBubble
            message={message}
            messageKey={reactionKey}
            side={bubbleSide === 'right' ? 'left' : 'right'}
            className="w-full min-w-0"
          />
          {aside}
        </div>
      ) : (
        <MascotThoughtBubble
          message={message}
          messageKey={reactionKey}
          side={bubbleSide === 'right' ? 'left' : 'right'}
          className="min-w-0 flex-1"
        />
      )}
    </div>
  )
}
