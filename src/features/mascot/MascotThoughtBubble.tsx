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
        // room for the cloud's bumps, so they never sit on the line above
        !isPro && 'pt-3',
        fromLeft ? 'flex-row' : 'flex-row-reverse',
        className,
      )}
    >
      <AnimatePresence mode="popLayout">
        {message && (
          <motion.div
            key={messageKey}
            className={clsx(
              'relative flex min-w-0 items-end gap-1.5',
              fromLeft ? 'flex-row' : 'flex-row-reverse',
            )}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
          >
            {!isPro && (
              <div
                className={clsx(
                  'flex shrink-0 items-end gap-0.5 pb-1 sm:gap-1',
                  // On phones the trail hangs from the cloud's corner instead of taking
                  // width from the words.
                  'max-sm:absolute max-sm:-bottom-3',
                  fromLeft ? 'flex-row max-sm:-left-3' : 'flex-row-reverse max-sm:-right-3',
                )}
                aria-hidden="true"
              >
                {['size-1.5 sm:size-2.5', 'size-2.5 sm:size-[15px]', 'size-3.5 sm:size-[21px]'].map(
                  (size, index) => (
                    <motion.span
                      key={size}
                      className={clsx(
                        'rounded-full bg-surface shadow-[0_3px_0_var(--color-line)]',
                        size,
                      )}
                      style={{ marginBottom: index * 6 }}
                      initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ ...POP, delay: index * 0.09 }}
                    />
                  ),
                )}
              </div>
            )}

            <motion.div
              initial={reduceMotion ? false : { scale: 0.4, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ ...POP, delay: isPro ? 0 : 0.28 }}
              style={{ transformOrigin: fromLeft ? '0% 100%' : '100% 100%' }}
              className={clsx(
                // Never wider than the screen; on phones the emoji sits on the corner like a sticker.
                'relative flex max-w-[min(22rem,calc(100vw-2rem))] min-w-0 items-center gap-3 bg-surface px-4 py-3 shadow-[0_5px_0_var(--color-line)] sm:px-5',
                isPro ? 'rounded-3xl' : 'rounded-[2.5rem]',
              )}
            >
              {!isPro && <CloudBumps />}
              {/* A readable width, so it never wraps one word per line (but fits small phones). */}
              <span className="relative min-w-[min(8.5rem,calc(100vw-13rem))] font-body text-lg leading-snug font-extrabold sm:min-w-[10rem] sm:text-xl">
                {message.text}
              </span>
              {message.emoji && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    'shrink-0 leading-none sm:relative sm:text-4xl',
                    'max-sm:absolute max-sm:-top-3 max-sm:text-2xl',
                    fromLeft ? 'max-sm:-right-1.5' : 'max-sm:-left-1.5',
                  )}
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
