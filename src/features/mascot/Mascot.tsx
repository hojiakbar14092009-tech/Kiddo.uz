import clsx from 'clsx'
import { useMascotModel } from '@/store/familyStore'
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
  className,
}: MascotProps) {
  const model = useMascotModel()
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
      <MascotFigure
        model={model}
        mood={mood === 'idle' && speaking ? 'talk' : mood}
        reactionKey={reactionKey}
        className={clsx('h-auto shrink-0', robotClassName)}
      />
      <MascotThoughtBubble
        message={message}
        messageKey={reactionKey}
        side={bubbleSide === 'right' ? 'left' : 'right'}
        className="min-w-0 flex-1"
      />
    </div>
  )
}
