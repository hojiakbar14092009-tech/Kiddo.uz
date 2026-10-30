import {
  animate,
  useReducedMotion,
  type AnimationPlaybackControls,
  type MotionValue,
} from 'framer-motion'
import { useEffect, useRef } from 'react'
import { frameOf, SCALE_STOPS } from './scales'

/*
 * The rail is evenly spaced by stop (a path through places), the camera is
 * logarithmic: a rail position r between stops i and i + 1 is the camera
 * between their frames. Both maps are monotonic, so the slider is smooth.
 */
const FRAMES = SCALE_STOPS.map(frameOf)
const LAST = FRAMES.length - 1

/** Camera (log10 metres) for a rail position 0 … stops − 1. */
export function viewOf(rail: number): number {
  const r = Math.min(LAST, Math.max(0, rail))
  const i = Math.min(LAST - 1, Math.floor(r))
  return FRAMES[i]! + (r - i) * (FRAMES[i + 1]! - FRAMES[i]!)
}

/** Rail position for a camera value (clamped to the journey). */
export function railOf(view: number): number {
  if (view <= FRAMES[0]!) return 0
  if (view >= FRAMES[LAST]!) return LAST
  let i = 0
  while (i < LAST - 1 && view > FRAMES[i + 1]!) i += 1
  return i + (view - FRAMES[i]!) / (FRAMES[i + 1]! - FRAMES[i]!)
}

/** Camera moves: a smooth zoom whose length follows how far it goes; instant under reduced motion. */
export function useCamera(z: MotionValue<number>) {
  const reduceMotion = useReducedMotion() ?? false
  const running = useRef<AnimationPlaybackControls | null>(null)
  // leaving the portal stops any zoom still running
  useEffect(() => () => running.current?.stop(), [])
  return (target: number): Promise<void> => {
    running.current?.stop()
    if (reduceMotion) {
      z.set(target)
      return Promise.resolve()
    }
    const decades = Math.abs(target - z.get())
    const controls = animate(z, target, {
      duration: Math.min(2.4, 0.7 + decades * 0.35),
      ease: [0.65, 0, 0.35, 1],
    })
    running.current = controls
    return controls.then(() => undefined)
  }
}
