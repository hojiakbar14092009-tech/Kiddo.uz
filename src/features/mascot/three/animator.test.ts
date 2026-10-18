import { describe, expect, it } from 'vitest'
import { seededRandom } from '@/lib/random'
import type { MascotMood } from '../types'
import { RobotAnimator, type AnimatorFrame, type AnimatorInput } from './animator'
import { CLIPS, type ClipName } from './clips'
import { JOINTS, track } from './rig'

const FRAME = 1 / 60

function run(animator: RobotAnimator, seconds: number, input: Partial<AnimatorInput> = {}) {
  const frames: AnimatorFrame[] = []
  const full: AnimatorInput = {
    mood: 'idle',
    reactionKey: 0,
    gaze: null,
    reducedMotion: false,
    ...input,
  }
  for (let t = 0; t < seconds; t += FRAME) frames.push(animator.update(FRAME, full))
  return frames
}

function biggestJointStep(frames: AnimatorFrame[]): number {
  let biggest = 0
  for (let i = 1; i < frames.length; i += 1) {
    for (const joint of JOINTS) {
      const a = frames[i - 1]!.pose.joints[joint]
      const b = frames[i]!.pose.joints[joint]
      for (let axis = 0; axis < 3; axis += 1)
        biggest = Math.max(biggest, Math.abs(b[axis]! - a[axis]!))
    }
  }
  return biggest
}

describe('track', () => {
  it('eases between keys and holds the ends', () => {
    const keys = [
      [0, 0],
      [1, 10],
    ] as const
    expect(track(-1, keys)).toBe(0)
    expect(track(0.5, keys)).toBeCloseTo(5)
    expect(track(2, keys)).toBe(10)
  })
})

describe('clips', () => {
  it.each(Object.keys(CLIPS) as ClipName[])('%s produces finite poses', (name) => {
    for (let t = 0; t < 10; t += 0.37) {
      const delta = CLIPS[name].sample(t)
      Object.values(delta.joints ?? {}).forEach((rotation) =>
        rotation.forEach((value) => expect(Number.isFinite(value)).toBe(true)),
      )
    }
  })
})

describe('RobotAnimator', () => {
  it.each<MascotMood>(['idle', 'wave', 'talk', 'happy', 'oops', 'sleepy', 'celebrate'])(
    'moves smoothly without sudden jumps in %s',
    (mood) => {
      const animator = new RobotAnimator(seededRandom(1))
      run(animator, 1)
      const frames = run(animator, 4, { mood })
      // no joint turns more than ~11° in one 60 fps frame, even across the crossfade
      expect(biggestJointStep(frames)).toBeLessThan(0.2)
    },
  )

  it('really leaves the ground on a happy jump, then lands', () => {
    const frames = run(new RobotAnimator(seededRandom(2)), 2, { mood: 'happy', reactionKey: 1 })
    expect(Math.max(...frames.map((f) => f.pose.rootY))).toBeGreaterThan(0.3)
    expect(Math.abs(frames.at(-1)!.pose.rootY)).toBeLessThan(0.05)
    expect(frames.some((f) => f.expression === 'happy')).toBe(true)
  })

  it('does something on its own after being idle for 6–12 seconds', () => {
    const animator = new RobotAnimator(seededRandom(3))
    const clips = new Set(run(animator, 13).map((frame) => frame.clip))
    expect([...clips].some((clip) => clip !== 'idle')).toBe(true)
  })

  it('stays calm with reduced motion: no spontaneous gestures', () => {
    const clips = new Set(
      run(new RobotAnimator(seededRandom(3)), 20, { reducedMotion: true }).map((f) => f.clip),
    )
    expect([...clips]).toEqual(['idle'])
  })

  it('turns its head up to 30° towards the child’s finger, eyes first', () => {
    const animator = new RobotAnimator(seededRandom(4))
    const early = run(animator, 0.15, { gaze: { x: 1, y: 0 } }).at(-1)!
    expect(early.eyeX).toBeGreaterThan(early.headYaw / ((30 * Math.PI) / 180))

    const settled = run(animator, 3, { gaze: { x: 1, y: 0 } }).at(-1)!
    expect(settled.headYaw).toBeGreaterThan(0.45)
    expect(settled.headYaw).toBeLessThanOrEqual((30 * Math.PI) / 180 + 1e-6)
  })

  it('blinks every few seconds', () => {
    const blinks = run(new RobotAnimator(seededRandom(5)), 12).filter((frame) => frame.blink > 0.9)
    expect(blinks.length).toBeGreaterThan(0)
  })

  it('wobbles the antenna when the body jumps, then settles', () => {
    const animator = new RobotAnimator(seededRandom(6))
    const jump = run(animator, 1.2, { mood: 'happy', reactionKey: 1 })
    expect(Math.max(...jump.map((f) => Math.abs(f.wobble)))).toBeGreaterThan(0.05)
    const later = run(animator, 4, { mood: 'happy', reactionKey: 1, reducedMotion: true }).at(-1)!
    expect(Math.abs(later.wobble)).toBeLessThan(0.05)
  })
})
