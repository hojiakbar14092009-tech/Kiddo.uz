import { motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MascotMood } from '@/features/mascot/types'
import { PetSprite } from './PetSprite'
import type { PetEmotion, PetId } from './pets'
import { playPetSound } from './petSounds'

/** The pet's feelings follow the robot's. */
function emotionFor(mood: MascotMood | undefined): PetEmotion | undefined {
  if (mood === 'happy' || mood === 'celebrate') return 'happy'
  if (mood === 'oops') return 'sad'
  return undefined
}

interface PetCompanionProps {
  pet: PetId
  mood?: MascotMood
  /** Width of the pet relative to the robot box it stands next to. */
  className?: string
}

/**
 * The child's pet at the robot's feet. It wanders a little to the left and
 * right – always inside the robot's frame – turns around, and makes its own
 * sound when tapped.
 */
export function PetCompanion({ pet, mood, className }: PetCompanionProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const walk = useAnimationControls()
  const [facing, setFacing] = useState<1 | -1>(1)

  useEffect(() => {
    if (reduceMotion) return undefined
    let alive = true
    const spots = ['0%', '55%', '20%', '70%', '35%']
    const run = async () => {
      let index = 0
      let previous = 0
      while (alive) {
        const target = spots[index % spots.length]!
        const value = Number.parseFloat(target)
        setFacing(value >= previous ? 1 : -1)
        previous = value
        await walk.start({
          left: target,
          y: [0, -8, 0, -8, 0],
          transition: { duration: 1.8, ease: 'easeInOut' },
        })
        if (!alive) return
        await new Promise((resolve) => setTimeout(resolve, 1600 + Math.random() * 1800))
        index += 1
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [reduceMotion, walk])

  return (
    <motion.button
      type="button"
      onClick={() => playPetSound(pet)}
      animate={walk}
      initial={{ left: '0%' }}
      aria-label={t(`shop.pets.${pet}`)}
      className={className ?? 'absolute bottom-0 w-[42%]'}
    >
      <span className="block transition-transform" style={{ transform: `scaleX(${facing})` }}>
        <PetSprite pet={pet} emotion={emotionFor(mood)} className="w-full" />
      </span>
    </motion.button>
  )
}
