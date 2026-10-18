/**
 * The robot’s skeleton: a humanoid joint hierarchy, a pose format and the
 * math used to blend poses. Pure functions only, so it is easy to test.
 *
 *   hips ─ spine ─ chest ─ neck ─ head
 *     │              ├─ leftShoulder ─ leftArm (elbow) ─ leftHand
 *     │              └─ rightShoulder ─ rightArm (elbow) ─ rightHand
 *     ├─ leftLeg
 *     └─ rightLeg
 */
export const JOINTS = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'leftShoulder',
  'leftArm',
  'leftHand',
  'rightShoulder',
  'rightArm',
  'rightHand',
  'leftLeg',
  'rightLeg',
] as const

export type JointName = (typeof JOINTS)[number]

/** Euler rotation in radians, applied in XYZ order. */
export type Rotation = readonly [x: number, y: number, z: number]

export interface Pose {
  joints: Record<JointName, Rotation>
  /** Whole-body offset (jumping, weight shift) in model units. */
  rootX: number
  rootY: number
  /** Squash and stretch of the whole body, anchored at the feet. */
  squashX: number
  squashY: number
  /** 0 = closed, 1 = open. */
  mouth: number
}

/** Arms hang slightly away from the body, as a relaxed person’s would. */
export const REST_POSE: Pose = {
  joints: {
    hips: [0, 0, 0],
    spine: [0, 0, 0],
    chest: [0, 0, 0],
    neck: [0, 0, 0],
    head: [0, 0, 0],
    leftShoulder: [0, 0, 0.14],
    leftArm: [-0.15, 0, 0],
    leftHand: [0, 0, 0],
    rightShoulder: [0, 0, -0.14],
    rightArm: [-0.15, 0, 0],
    rightHand: [0, 0, 0],
    leftLeg: [0, 0, 0],
    rightLeg: [0, 0, 0],
  },
  rootX: 0,
  rootY: 0,
  squashX: 1,
  squashY: 1,
  mouth: 0,
}

export type PoseDelta = {
  joints?: Partial<Record<JointName, Rotation>>
  rootX?: number
  rootY?: number
  squashX?: number
  squashY?: number
  mouth?: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Rest pose plus additive offsets (squash multiplies). */
export function applyDelta(base: Pose, delta: PoseDelta): Pose {
  const joints = { ...base.joints }
  for (const [name, rotation] of Object.entries(delta.joints ?? {}) as [JointName, Rotation][]) {
    const current = joints[name]
    joints[name] = [current[0] + rotation[0], current[1] + rotation[1], current[2] + rotation[2]]
  }
  return {
    joints,
    rootX: base.rootX + (delta.rootX ?? 0),
    rootY: base.rootY + (delta.rootY ?? 0),
    squashX: base.squashX * (delta.squashX ?? 1),
    squashY: base.squashY * (delta.squashY ?? 1),
    mouth: Math.max(base.mouth, delta.mouth ?? 0),
  }
}

export function blendPoses(from: Pose, to: Pose, weight: number): Pose {
  const t = Math.min(1, Math.max(0, weight))
  const joints = {} as Record<JointName, Rotation>
  for (const name of JOINTS) {
    const a = from.joints[name]
    const b = to.joints[name]
    joints[name] = [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
  }
  return {
    joints,
    rootX: lerp(from.rootX, to.rootX, t),
    rootY: lerp(from.rootY, to.rootY, t),
    squashX: lerp(from.squashX, to.squashX, t),
    squashY: lerp(from.squashY, to.squashY, t),
    mouth: lerp(from.mouth, to.mouth, t),
  }
}

/**
 * Frame-rate independent exponential smoothing towards a target.
 * `lambda` is how quickly it follows (higher = snappier).
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt))
}

export function dampPose(current: Pose, target: Pose, lambda: number, dt: number): Pose {
  return blendPoses(current, target, 1 - Math.exp(-lambda * dt))
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Keyframe track with ease-in-out between keys: `[[time, value], …]`.
 * Before the first key it holds the first value, after the last the last one.
 */
export function track(t: number, keys: readonly (readonly [number, number])[]): number {
  if (keys.length === 0) return 0
  const first = keys[0]!
  if (t <= first[0]) return first[1]
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, v1] = keys[i]!
    const [t0, v0] = keys[i - 1]!
    if (t <= t1) return lerp(v0, v1, smoothstep(t0, t1, t))
  }
  return keys[keys.length - 1]![1]
}
