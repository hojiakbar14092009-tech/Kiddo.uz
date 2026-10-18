import type { PoseDelta } from './rig'
import { track } from './rig'

/**
 * Procedural, mocap-style animation clips. Each clip returns a pose offset
 * for a time `t` in seconds. Motion follows the classic principles a human
 * body shows: anticipation before big moves, overshoot and follow-through
 * after them, and limbs that lag slightly behind the body.
 *
 * Joint conventions (the robot faces +z, its left side is +x):
 *  - shoulder z: + raises the left arm outwards, − raises the right arm
 *  - arm (elbow) x: − bends the forearm forwards
 *  - head y: + turns to the robot’s left (viewer’s right); head x: + looks down
 *  - leg x: − swings the leg forwards
 */
export type ClipName =
  | 'idle'
  | 'look_around'
  | 'stretch'
  | 'scratch_head'
  | 'wave'
  | 'talk'
  | 'happy_jump'
  | 'oops'
  | 'celebrate'
  | 'sleepy'

export type Expression = 'smile' | 'happy' | 'oops' | 'sleepy'

export interface ClipDefinition {
  /** Seconds; `null` loops forever. */
  duration: number | null
  expression: Expression
  /** Clip to continue with when a one-shot clip ends. */
  next?: ClipName
  sample: (t: number) => PoseDelta
}

const TAU = Math.PI * 2
const wave = (t: number, period: number, phase = 0) => Math.sin(TAU * (t / period) + phase)

/**
 * Life underneath every clip: breathing on a 3.4 s cycle and a weight shift
 * between the feet on an incommensurable 5.3 s cycle, so the body never
 * repeats exactly. The head counter-rotates to stay level, as people do.
 */
export function breathing(t: number, amount = 1): PoseDelta {
  const breath = wave(t, 3.4)
  const shift = wave(t, 5.3, 0.7)
  return {
    rootY: 0.012 * breath * amount,
    rootX: 0.018 * shift * amount,
    joints: {
      hips: [0, 0, 0.035 * shift * amount],
      spine: [0.02 * breath * amount, 0, -0.012 * shift * amount],
      chest: [0.015 * breath * amount, 0.02 * wave(t, 7.1) * amount, 0],
      head: [0.012 * wave(t, 4.3) * amount, 0.03 * wave(t, 8.9) * amount, -0.02 * shift * amount],
      leftShoulder: [0, 0, 0.03 * breath * amount],
      rightShoulder: [0, 0, -0.03 * wave(t, 3.4, 0.4) * amount],
      leftLeg: [0, 0, 0.02 * shift * amount],
      rightLeg: [0, 0, 0.02 * shift * amount],
    },
  }
}

function combine(...deltas: PoseDelta[]): PoseDelta {
  const result: Required<Omit<PoseDelta, 'joints'>> & { joints: NonNullable<PoseDelta['joints']> } =
    {
      joints: {},
      rootX: 0,
      rootY: 0,
      squashX: 1,
      squashY: 1,
      mouth: 0,
    }
  for (const delta of deltas) {
    for (const [name, rotation] of Object.entries(delta.joints ?? {})) {
      const key = name as keyof typeof result.joints
      const current = result.joints[key] ?? [0, 0, 0]
      result.joints[key] = [
        current[0] + rotation[0],
        current[1] + rotation[1],
        current[2] + rotation[2],
      ]
    }
    result.rootX += delta.rootX ?? 0
    result.rootY += delta.rootY ?? 0
    result.squashX *= delta.squashX ?? 1
    result.squashY *= delta.squashY ?? 1
    result.mouth = Math.max(result.mouth, delta.mouth ?? 0)
  }
  return result
}

export const CLIPS: Record<ClipName, ClipDefinition> = {
  idle: {
    duration: null,
    expression: 'smile',
    sample: (t) => breathing(t),
  },

  look_around: {
    duration: 3.4,
    expression: 'smile',
    next: 'idle',
    sample: (t) =>
      combine(breathing(t), {
        joints: {
          head: [
            track(t, [
              [0, 0],
              [0.5, -0.06],
              [1.3, -0.06],
              [1.9, -0.1],
              [2.7, -0.1],
              [3.4, 0],
            ]),
            track(t, [
              [0, 0],
              [0.55, 0.48],
              [1.3, 0.48],
              [1.9, -0.45],
              [2.7, -0.45],
              [3.4, 0],
            ]),
            0,
          ],
          chest: [
            0,
            track(t, [
              [0, 0],
              [0.7, 0.12],
              [1.3, 0.12],
              [2.1, -0.12],
              [2.7, -0.12],
              [3.4, 0],
            ]),
            0,
          ],
        },
      }),
  },

  stretch: {
    duration: 3.2,
    expression: 'happy',
    next: 'idle',
    sample: (t) => {
      const up = track(t, [
        [0, 0],
        [0.25, -0.05],
        [0.9, 1],
        [2.0, 1],
        [2.8, 0],
        [3.2, 0],
      ])
      return combine(breathing(t, 0.5), {
        rootY: 0.05 * up,
        squashY: 1 + 0.03 * up,
        joints: {
          spine: [-0.14 * up, 0, 0],
          head: [-0.22 * up, 0, 0],
          leftShoulder: [0, 0, 2.55 * up],
          rightShoulder: [0, 0, -2.55 * up],
          leftArm: [0.15 * up, 0, 0],
          rightArm: [0.15 * up, 0, 0],
        },
        mouth:
          0.6 *
          track(t, [
            [0.8, 0],
            [1.2, 1],
            [1.9, 1],
            [2.2, 0],
          ]),
      })
    },
  },

  scratch_head: {
    duration: 3.0,
    expression: 'smile',
    next: 'idle',
    sample: (t) => {
      const raise = track(t, [
        [0, 0],
        [0.55, 1],
        [2.3, 1],
        [3.0, 0],
      ])
      const scratch = t > 0.6 && t < 2.2 ? wave(t, 0.22) * 0.35 : 0
      return combine(breathing(t), {
        joints: {
          rightShoulder: [0, -0.3 * raise, -2.25 * raise],
          rightArm: [-1.5 * raise, 0, 0],
          rightHand: [0, 0, scratch],
          head: [0.08 * raise, -0.12 * raise, 0.16 * raise],
        },
      })
    },
  },

  wave: {
    duration: null,
    expression: 'smile',
    sample: (t) => {
      const raise = track(t, [
        [0, 0],
        [0.45, 1],
      ])
      const swing = wave(t, 0.9) * 0.38 * raise
      return combine(breathing(t), {
        joints: {
          rightShoulder: [0, 0, -2.35 * raise],
          rightArm: [-0.25 * raise, 0, swing],
          rightHand: [0, 0, swing * 0.6],
          head: [0, 0.1 * raise, 0.1 * raise + 0.04 * wave(t, 1.8)],
          chest: [0, 0, 0.04 * raise],
        },
      })
    },
  },

  talk: {
    duration: null,
    expression: 'smile',
    sample: (t) =>
      combine(breathing(t), {
        joints: {
          head: [
            0.06 * wave(t, 0.77) + 0.03 * wave(t, 1.9),
            0.05 * wave(t, 2.3),
            0.04 * wave(t, 3.1),
          ],
          rightShoulder: [-0.25, 0, -0.45 - 0.3 * (0.5 + 0.5 * wave(t, 2.6))],
          rightArm: [-1.0 - 0.25 * wave(t, 1.3), 0, 0],
          rightHand: [0, 0, 0.3 * wave(t, 1.3, 1)],
          leftShoulder: [-0.1, 0, 0.25 + 0.1 * wave(t, 3.7)],
          leftArm: [-0.5, 0, 0],
        },
        // irregular syllables: a sum of non-repeating sines, clamped to 0–1
        mouth: Math.max(0, 0.45 + 0.35 * wave(t, 0.23) + 0.2 * wave(t, 0.37, 1.3)),
      }),
  },

  // anticipation (crouch) → jump with arms up and legs tucked → soft landing with squash → settle
  happy_jump: {
    duration: 1.25,
    expression: 'happy',
    next: 'idle',
    sample: (t) => {
      const air = track(t, [
        [0, 0],
        [0.36, 1],
        [0.78, 1],
        [1.1, 0],
      ])
      return combine(breathing(t, 0.4), {
        rootY: track(t, [
          [0, 0],
          [0.18, -0.13],
          [0.52, 0.62],
          [0.86, -0.08],
          [1.05, 0.03],
          [1.25, 0],
        ]),
        squashY: track(t, [
          [0, 1],
          [0.18, 0.86],
          [0.42, 1.09],
          [0.86, 0.9],
          [1.05, 1.03],
          [1.25, 1],
        ]),
        squashX: track(t, [
          [0, 1],
          [0.18, 1.08],
          [0.42, 0.95],
          [0.86, 1.07],
          [1.05, 0.99],
          [1.25, 1],
        ]),
        joints: {
          leftShoulder: [0, 0, 2.4 * air],
          rightShoulder: [0, 0, -2.4 * air],
          leftArm: [0.2 * air, 0, 0],
          rightArm: [0.2 * air, 0, 0],
          leftLeg: [-0.45 * air, 0, 0.12 * air],
          rightLeg: [-0.45 * air, 0, -0.12 * air],
          spine: [
            track(t, [
              [0, 0],
              [0.18, 0.18],
              [0.45, -0.12],
              [0.86, 0.1],
              [1.25, 0],
            ]),
            0,
            0,
          ],
          head: [
            track(t, [
              [0, 0],
              [0.18, 0.12],
              [0.45, -0.2],
              [0.9, 0.08],
              [1.25, 0],
            ]),
            0,
            0,
          ],
        },
      })
    },
  },

  // shrug and a decaying head shake, then a little encouraging fist
  oops: {
    duration: 2.2,
    expression: 'oops',
    next: 'idle',
    sample: (t) => {
      const shrug = track(t, [
        [0, 0],
        [0.3, 1],
        [1.3, 1],
        [1.7, 0],
      ])
      const cheer = track(t, [
        [1.5, 0],
        [1.8, 1],
        [2.2, 0],
      ])
      return combine(breathing(t, 0.6), {
        rootY: -0.03 * shrug,
        joints: {
          leftShoulder: [0, 0, 0.85 * shrug],
          rightShoulder: [0, 0, -0.85 * shrug - 1.6 * cheer],
          leftArm: [-1.2 * shrug, 0, 0],
          rightArm: [-1.2 * shrug - 1.1 * cheer, 0, 0],
          head: [
            0.08 * shrug,
            track(t, [
              [0, 0],
              [0.25, 0.32],
              [0.5, -0.28],
              [0.75, 0.18],
              [1.0, -0.1],
              [1.25, 0.04],
              [1.45, 0],
            ]),
            0.14 * shrug,
          ],
          chest: [0.06 * shrug, 0, 0],
        },
      })
    },
  },

  celebrate: {
    duration: null,
    expression: 'happy',
    sample: (t) => {
      const beat = wave(t, 0.84)
      return combine(breathing(t, 0.4), {
        rootY: 0.1 * Math.abs(wave(t, 0.84)),
        rootX: 0.06 * beat,
        joints: {
          hips: [0, 0.12 * beat, 0.12 * beat],
          chest: [0, -0.16 * beat, -0.06 * beat],
          head: [0.06 * Math.abs(beat), 0.1 * beat, 0.12 * beat],
          leftShoulder: [0, 0, 2.3 + 0.45 * wave(t, 0.84, Math.PI / 2)],
          rightShoulder: [0, 0, -2.3 + 0.45 * wave(t, 0.84, Math.PI / 2)],
          leftArm: [-0.4, 0, 0.3 * beat],
          rightArm: [-0.4, 0, 0.3 * beat],
          leftLeg: [-0.18 * Math.max(0, beat), 0, 0],
          rightLeg: [-0.18 * Math.max(0, -beat), 0, 0],
        },
      })
    },
  },

  // drooping head, slow breathing and a big yawn with a stretch every few seconds
  sleepy: {
    duration: null,
    expression: 'sleepy',
    sample: (t) => {
      const cycle = t % 8
      const yawn = track(cycle, [
        [0, 0],
        [2.6, 0],
        [3.4, 1],
        [4.6, 1],
        [5.4, 0],
        [8, 0],
      ])
      return combine(breathing(t * 0.6, 1.3), {
        rootY: -0.04,
        joints: {
          spine: [0.12 - 0.12 * yawn, 0, 0],
          head: [0.38 - 0.55 * yawn + 0.04 * wave(t, 4.7), 0, 0.1],
          leftShoulder: [0, 0, -0.06 + 0.4 * yawn],
          rightShoulder: [0, 0, 0.06 - 2.2 * yawn],
          rightArm: [-0.6 * yawn, 0, 0],
        },
        mouth: yawn,
      })
    },
  },
}

/** Clips the robot picks from on its own when it has been idle for a while. */
export const IDLE_VARIATIONS: readonly ClipName[] = ['look_around', 'stretch', 'scratch_head']
