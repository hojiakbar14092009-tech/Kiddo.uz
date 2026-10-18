import { useSpring, type MotionValue } from 'framer-motion'
import { useEffect, type RefObject } from 'react'
import { randomBetween } from '@/lib/random'

const POINTER_ATTENTION_MS = 3000
const GAZE_SPRING = { stiffness: 70, damping: 15, mass: 0.8 }

const clamp = (value: number) => Math.max(-1, Math.min(1, value))

export interface Gaze {
  /** −1 (left) … 1 (right) */
  x: MotionValue<number>
  /** −1 (up) … 1 (down) */
  y: MotionValue<number>
}

/**
 * Where the robot looks: towards the child’s finger or cursor, and when nobody
 * has touched the screen for a while, it glances around on its own like a person would.
 */
export function useGaze(target: RefObject<Element | null>, enabled: boolean): Gaze {
  const x = useSpring(0, GAZE_SPRING)
  const y = useSpring(0, GAZE_SPRING)

  useEffect(() => {
    if (!enabled) {
      x.set(0)
      y.set(0)
      return undefined
    }

    let lastPointerAt = 0
    let glanceTimer: ReturnType<typeof setTimeout>
    let returnTimer: ReturnType<typeof setTimeout>

    const lookAtPointer = (event: PointerEvent) => {
      const box = target.current?.getBoundingClientRect()
      if (!box) return
      const centerX = box.left + box.width / 2
      const centerY = box.top + box.height * 0.35
      x.set(clamp((event.clientX - centerX) / (window.innerWidth / 2)))
      y.set(clamp((event.clientY - centerY) / (window.innerHeight / 2)))
      lastPointerAt = Date.now()
    }

    const idle = () => Date.now() - lastPointerAt > POINTER_ATTENTION_MS

    const glance = () => {
      if (idle()) {
        const roll = Math.random()
        x.set(roll < 0.4 ? -0.8 : roll < 0.8 ? 0.8 : 0)
        y.set(roll < 0.8 ? -0.15 : -0.7)
        returnTimer = setTimeout(
          () => {
            if (idle()) {
              x.set(0)
              y.set(0)
            }
          },
          randomBetween(900, 1600),
        )
      }
      glanceTimer = setTimeout(glance, randomBetween(4500, 9000))
    }

    window.addEventListener('pointermove', lookAtPointer)
    window.addEventListener('pointerdown', lookAtPointer)
    glanceTimer = setTimeout(glance, randomBetween(2500, 5000))

    return () => {
      window.removeEventListener('pointermove', lookAtPointer)
      window.removeEventListener('pointerdown', lookAtPointer)
      clearTimeout(glanceTimer)
      clearTimeout(returnTimer)
    }
  }, [enabled, target, x, y])

  return { x, y }
}
