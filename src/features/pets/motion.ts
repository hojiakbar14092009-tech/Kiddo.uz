import type { TargetAndTransition, Transition } from 'framer-motion'
import type { PetId } from './pets'

/*
 * How each pet moves when it is idle (Phase 27, full contract): not one
 * shared bounce, but each animal's own way — a cat breathes slowly and
 * leans, a parrot bobs its head and ruffles, a hamster breathes fast and
 * nibbles, a guinea pig waddles and a bunny hops. Transform-only (cheap),
 * paused off screen and on weak devices, off with reduced motion.
 */

export interface SpeciesMotion {
  animate: TargetAndTransition
  transition: Transition
  /** Where the body pivots (0 = top, 1 = feet). */
  originY: number
}

export const SPECIES_MOTION: Record<PetId, SpeciesMotion> = {
  // slow, deep breathing and an unhurried lean to one side and back
  cat: {
    animate: { scaleY: [1, 0.97, 1.02, 1], scaleX: [1, 1.02, 0.99, 1], rotate: [0, 0, -3, 0] },
    transition: { duration: 3.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.35, 0.7, 1] },
    originY: 1,
  },
  // quick head bobs, a ruffle of the feathers, then a still moment
  parrot: {
    animate: {
      y: [0, -3, 0, -3, 0, 0],
      rotate: [0, 6, -4, 5, 0, 0],
      scaleX: [1, 1, 1, 1, 1.06, 1],
    },
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
    originY: 0.9,
  },
  // fast little breaths and a nibbling shiver
  hamster: {
    animate: { scaleY: [1, 0.96, 1, 0.96, 1, 1], x: [0, 0, 0, 0, -1.5, 1.5, 0] },
    transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
    originY: 1,
  },
  // a side-to-side waddle
  'guinea-pig': {
    animate: { x: [0, 3, 0, -3, 0], rotate: [0, 3, 0, -3, 0] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    originY: 1,
  },
  // a crouch, a real hop with a stretch in the air, a soft landing, then a rest
  bunny: {
    animate: {
      y: [0, 0, -16, 0, 0, 0],
      scaleY: [1, 0.88, 1.08, 0.94, 1, 1],
      scaleX: [1, 1.08, 0.94, 1.05, 1, 1],
    },
    transition: {
      duration: 2.6,
      repeat: Infinity,
      ease: 'easeOut',
      times: [0, 0.12, 0.3, 0.45, 0.55, 1],
    },
    originY: 1,
  },
}

/** Very weak devices (≤ 2 cores or < 2 GB memory) keep the pets still to save power. */
export function weakDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const hints = navigator as Navigator & { deviceMemory?: number }
  if ((hints.hardwareConcurrency ?? 4) <= 2) return true
  return hints.deviceMemory !== undefined && hints.deviceMemory < 2
}
