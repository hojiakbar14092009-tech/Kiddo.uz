import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useIsPro } from '@/store/subscriptionStore'
import type { MascotMessage } from './types'

interface MascotThoughtBubbleProps {
  message: MascotMessage | null
  /** Changes on every event, so a repeated message animates in again. */
  messageKey: number
  /** Which side of the bubble the mascot’s head is on. */
  side?: 'left' | 'right'
  className?: string
}

const POP = { type: 'spring', stiffness: 320, damping: 18 } as const

/**
 * Free: a silent thought bubble that grows out of three little circles next to
 * the robot’s head (o → O → ☁). PRO: the robot speaks, and the same text is
 * shown as a speech-bubble subtitle.
 */
export function MascotThoughtBubble({
  message,
  messageKey,
  side = 'left',
  className,
}: MascotThoughtBubbleProps) {
  const isPro = useIsPro()
  const reduceMotion = useReducedMotion() ?? false
  const fromLeft = side === 'left'

  return (
    <div
      aria-live="polite"
      className={clsx(
        'pointer-events-none relative flex items-end',
        fromLeft ? 'flex-row' : 'flex-row-reverse',
        className,
      )}
    >
      <AnimatePresence mode="popLayout">
        {message && (
          <motion.div
            key={messageKey}
            className={clsx('flex items-end gap-1.5', fromLeft ? 'flex-row' : 'flex-row-reverse')}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
          >
            {!isPro && (
              <div
                className={clsx(
                  'flex items-end gap-1 pb-1',
                  fromLeft ? 'flex-row' : 'flex-row-reverse',
                )}
                aria-hidden="true"
              >
                {[10, 15, 21].map((size, index) => (
                  <motion.span
                    key={size}
                    className="rounded-full bg-surface shadow-[0_3px_0_var(--color-line)]"
                    style={{ width: size, height: size, marginBottom: index * 6 }}
                    initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...POP, delay: index * 0.09 }}
                  />
                ))}
              </div>
            )}

            <motion.div
              initial={reduceMotion ? false : { scale: 0.4, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ ...POP, delay: isPro ? 0 : 0.28 }}
              style={{ transformOrigin: fromLeft ? '0% 100%' : '100% 100%' }}
              className={clsx(
                'relative flex max-w-[min(22rem,60vw)] items-center gap-3 bg-surface px-5 py-3 shadow-[0_5px_0_var(--color-line)]',
                isPro ? 'rounded-3xl' : 'rounded-[2.5rem]',
              )}
            >
              {!isPro && <CloudBumps />}
              <span className="relative font-body text-lg leading-snug font-extrabold sm:text-xl">
                {message.text}
              </span>
              {message.emoji && (
                <span
                  aria-hidden="true"
                  className="relative shrink-0 text-3xl leading-none sm:text-4xl"
                >
                  {message.emoji}
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Soft bumps along the top edge that make the bubble read as a cloud. */
function CloudBumps() {
  return (
    <span aria-hidden="true" className="absolute inset-x-6 -top-3 flex justify-around">
      <span className="size-7 rounded-full bg-surface" />
      <span className="-mt-1.5 size-9 rounded-full bg-surface" />
      <span className="size-7 rounded-full bg-surface" />
    </span>
  )
}
