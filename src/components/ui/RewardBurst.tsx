import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { CoinIcon, StarIcon } from '@/components/icons'
import { POP_SPRING } from '@/styles/motion'

/**
 * The one celebration of the app: the reward in the middle pops in and a few
 * coins or stars fly out once around it – short, no flashing, no loop. With
 * reduced motion the reward is simply shown. Purely decorative: the reward
 * itself (e.g. "+5 coins") is said in text next to it.
 */
export function RewardBurst({
  children,
  kind = 'stars',
  pieces = 8,
  delay = 0,
  className,
}: {
  /** The reward in the middle (a trophy, a sticker, the coin badge…). */
  children: ReactNode
  kind?: 'stars' | 'coins'
  pieces?: number
  /** Seconds before it starts (to follow other things popping in). */
  delay?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion() ?? false
  const wrapper = clsx('relative inline-flex items-center justify-center', className)
  if (reduceMotion) return <div className={wrapper}>{children}</div>

  return (
    <div className={wrapper}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        {Array.from({ length: pieces }, (_, index) => {
          const angle = (index / pieces) * Math.PI * 2 - Math.PI / 2
          const distance = 70 + (index % 2) * 22
          return (
            <motion.span
              key={index}
              className="absolute top-1/2 left-1/2 -mt-3 -ml-3"
              initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
              animate={{
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                scale: [0.4, 1, 0.8],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1.1, delay: delay + 0.15 + index * 0.02, ease: 'easeOut' }}
            >
              {kind === 'coins' ? (
                <CoinIcon size={24} />
              ) : (
                <StarIcon size={24} className="text-coin" />
              )}
            </motion.span>
          )
        })}
      </span>
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ ...POP_SPRING, delay }}
      >
        {children}
      </motion.div>
    </div>
  )
}
