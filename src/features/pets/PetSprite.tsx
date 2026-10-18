import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { petFrame, PET_EMOTIONS, type PetEmotion, type PetId } from './pets'

/** Idle poses a pet moves between, with how long each lasts (ms). */
const IDLE: readonly [PetEmotion, number][] = [
  ['happy', 2200],
  ['shy', 1800],
  ['surprised', 900],
  ['happy', 1600],
  ['shy', 1400],
]

interface PetSpriteProps {
  pet: PetId
  /** Fixed pose (e.g. sad when the robot is sad); otherwise the pet changes poses by itself. */
  emotion?: PetEmotion
  className?: string
  /** Bouncing like a living animal; off for the reduced-motion setting. */
  lively?: boolean
}

/**
 * A pet drawn in six poses. It breathes (a soft squash and stretch), hops now
 * and then and switches between happy, shy and surprised poses on its own.
 */
export function PetSprite({ pet, emotion, className, lively = true }: PetSpriteProps) {
  const reduceMotion = useReducedMotion() ?? false
  const [step, setStep] = useState(0)
  const animate = lively && !reduceMotion
  const shown = emotion ?? IDLE[step % IDLE.length]![0]

  useEffect(() => {
    if (emotion || !animate) return undefined
    const timer = setTimeout(() => setStep((current) => current + 1), IDLE[step % IDLE.length]![1])
    return () => clearTimeout(timer)
  }, [animate, emotion, step])

  return (
    <motion.span
      className={clsx('relative inline-block aspect-square', className)}
      animate={
        animate
          ? { scaleY: [1, 0.94, 1.03, 1], scaleX: [1, 1.04, 0.98, 1], y: [0, 0, -6, 0] }
          : undefined
      }
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ originY: 1 }}
    >
      {/* All poses are loaded at once, so switching never flickers. */}
      {PET_EMOTIONS.map((pose) => (
        <img
          key={pose}
          src={petFrame(pet, pose)}
          alt=""
          draggable={false}
          className={clsx(
            'pointer-events-none absolute inset-0 size-full object-contain transition-opacity duration-200 select-none',
            pose === shown ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
    </motion.span>
  )
}
