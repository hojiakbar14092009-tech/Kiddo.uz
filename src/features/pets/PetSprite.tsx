import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { onIdle } from '@/lib/onIdle'
import { petFrame, PET_EMOTIONS, type PetEmotion, type PetId } from './pets'

/** The poses the idle loop moves through (loaded up front, so it never flickers). */
const IDLE_POSES: readonly PetEmotion[] = ['happy', 'shy', 'surprised']

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
  /**
   * Load every pose once the page is idle: for a pet whose pose follows the
   * robot's mood, so a sad or surprised face is ready (and works offline).
   */
  warm?: boolean
}

/**
 * A pet drawn in six poses. It breathes (a soft squash and stretch), hops now
 * and then and switches between happy, shy and surprised poses on its own.
 */
export function PetSprite({
  pet,
  emotion,
  className,
  lively = true,
  warm = false,
}: PetSpriteProps) {
  const reduceMotion = useReducedMotion() ?? false
  const [step, setStep] = useState(0)
  const animate = lively && !reduceMotion
  const shown = emotion ?? IDLE[step % IDLE.length]![0]
  // Only the poses this sprite can show are loaded: the fixed one, or the idle loop's
  // three (all six with `warm`, once the page is idle); a pose stays mounted once shown.
  const wanted = animate && !emotion ? [...IDLE_POSES, shown] : [shown]
  const [mounted, setMounted] = useState<readonly PetEmotion[]>(wanted)
  if (wanted.some((pose) => !mounted.includes(pose))) {
    setMounted([...new Set([...mounted, ...wanted])])
  }
  useEffect(() => (warm ? onIdle(() => setMounted(PET_EMOTIONS)) : undefined), [warm])
  const poses = PET_EMOTIONS.filter((pose) => mounted.includes(pose))

  // The pose on screen changes only once the new picture has loaded: until then
  // the previous one stays, so the pet never blinks out (slow network, offline).
  const [loaded, setLoaded] = useState<readonly PetEmotion[]>([])
  const [visible, setVisible] = useState<PetEmotion>(shown)
  if (visible !== shown && loaded.includes(shown)) setVisible(shown)

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
      {poses.map((pose) => (
        <img
          key={pose}
          src={petFrame(pet, pose)}
          alt=""
          draggable={false}
          onLoad={() =>
            setLoaded((current) => (current.includes(pose) ? current : [...current, pose]))
          }
          className={clsx(
            'pointer-events-none absolute inset-0 size-full object-contain transition-opacity duration-200 select-none',
            pose === visible ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
    </motion.span>
  )
}
