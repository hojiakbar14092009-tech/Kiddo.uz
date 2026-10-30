import clsx from 'clsx'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { onIdle } from '@/lib/onIdle'
import { SPECIES_MOTION, weakDevice } from './motion'
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
 * A pet drawn in six poses. It moves in its own species' way (motion.ts) and
 * switches between happy, shy and surprised poses on its own; it rests off
 * screen, on weak devices and with reduced motion.
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
  const [weak] = useState(weakDevice)
  const box = useRef<HTMLSpanElement>(null)
  // off screen (a long shop list, a scrolled page) the pet rests: no work for the browser
  const inView = useInView(box, { margin: '80px' })
  const animate = lively && !reduceMotion && !weak
  const moving = animate && inView
  const species = SPECIES_MOTION[pet]
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
    if (emotion || !moving) return undefined
    const timer = setTimeout(() => setStep((current) => current + 1), IDLE[step % IDLE.length]![1])
    return () => clearTimeout(timer)
  }, [moving, emotion, step])

  return (
    <motion.span
      ref={box}
      className={clsx('relative inline-block aspect-square', className)}
      data-motion={moving ? pet : 'still'}
      animate={moving ? species.animate : { x: 0, y: 0, rotate: 0, scaleX: 1, scaleY: 1 }}
      transition={moving ? species.transition : { duration: 0.3 }}
      style={{ originY: species.originY }}
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
