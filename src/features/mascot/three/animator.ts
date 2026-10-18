import type { MascotMood } from '../types'
import { CLIPS, IDLE_VARIATIONS, type ClipName, type Expression } from './clips'
import { applyDelta, blendPoses, damp, dampPose, REST_POSE, smoothstep, type Pose } from './rig'

const MOOD_CLIP: Record<MascotMood, ClipName> = {
  idle: 'idle',
  wave: 'wave',
  talk: 'talk',
  happy: 'happy_jump',
  oops: 'oops',
  sleepy: 'sleepy',
  celebrate: 'celebrate',
}

/** Clips during which the robot is busy and only glances at the child’s finger. */
const ABSORBING: ReadonlySet<ClipName> = new Set(['happy_jump', 'oops', 'celebrate', 'sleepy'])

export const CROSSFADE_SECONDS = 0.4
const MAX_HEAD_YAW = (30 * Math.PI) / 180
const MAX_HEAD_PITCH = (15 * Math.PI) / 180
const BLINK_SECONDS = 0.14

export interface Gaze {
  /** −1 (left) … 1 (right), in screen terms. */
  x: number
  /** −1 (up) … 1 (down). */
  y: number
}

export interface AnimatorInput {
  mood: MascotMood
  reactionKey: number
  /** Where the child last touched; `null` when nobody has for a while. */
  gaze: Gaze | null
  reducedMotion: boolean
}

export interface AnimatorFrame {
  pose: Pose
  expression: Expression
  /** 0 = eyes open, 1 = closed. */
  blink: number
  /** Extra head rotation from looking at the child (radians). */
  headYaw: number
  headPitch: number
  /** Eye shift on the visor, −1…1; eyes move faster than the head. */
  eyeX: number
  eyeY: number
  /** Antenna / bow wobble angle (radians) from spring physics. */
  wobble: number
  clip: ClipName
}

type Random = () => number

/**
 * Turns the mascot’s mood into a living pose, frame by frame:
 * clip selection with 0.4 s crossfades, spontaneous idle gestures every
 * 6–12 s, irregular blinking, look-at with a slow head and quick eyes,
 * and a damped spring for the antenna or bow.
 */
export class RobotAnimator {
  private clip: ClipName = 'idle'
  private clipTime = 0
  private previous: { clip: ClipName; time: number } | null = null
  private fade = 1
  private mood: MascotMood = 'idle'
  private reactionKey = -1
  private untilVariation: number
  private pose: Pose = REST_POSE
  private expression: Expression = 'smile'

  private untilBlink: number
  private blinkTime = -1
  private pendingDoubleBlink = false

  private headYaw = 0
  private headPitch = 0
  private eyeX = 0
  private eyeY = 0

  private wobble = 0
  private wobbleVelocity = 0
  private lastRoll = 0
  private lastRootY = 0

  private readonly random: Random

  constructor(random: Random = Math.random) {
    this.random = random
    this.untilVariation = this.nextVariationDelay()
    this.untilBlink = this.nextBlinkDelay()
  }

  get currentClip(): ClipName {
    return this.clip
  }

  update(deltaSeconds: number, input: AnimatorInput): AnimatorFrame {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.1)

    this.followMood(input)
    this.advanceClips(dt, input)

    const target = this.targetPose(input.reducedMotion)
    this.pose = dampPose(this.pose, target, 16, dt)

    this.updateLook(dt, input)
    const blink = this.updateBlink(dt)
    this.updateWobble(dt)

    return {
      pose: this.pose,
      expression: this.expression,
      blink,
      headYaw: this.headYaw,
      headPitch: this.headPitch,
      eyeX: this.eyeX,
      eyeY: this.eyeY,
      wobble: this.wobble,
      clip: this.clip,
    }
  }

  private play(clip: ClipName): void {
    this.previous = { clip: this.clip, time: this.clipTime }
    this.fade = 0
    this.clip = clip
    this.clipTime = 0
  }

  private followMood({ mood, reactionKey }: AnimatorInput): void {
    const replay = reactionKey !== this.reactionKey && (mood === 'happy' || mood === 'oops')
    if (mood !== this.mood || replay) {
      this.mood = mood
      this.play(MOOD_CLIP[mood])
    }
    this.reactionKey = reactionKey
  }

  private advanceClips(dt: number, { reducedMotion }: AnimatorInput): void {
    this.clipTime += dt
    if (this.previous) this.previous.time += dt
    this.fade = Math.min(1, this.fade + dt / CROSSFADE_SECONDS)
    if (this.fade >= 1) this.previous = null

    const definition = CLIPS[this.clip]
    if (definition.duration !== null && this.clipTime >= definition.duration) {
      this.play(definition.next ?? 'idle')
      this.untilVariation = this.nextVariationDelay()
    }

    if (this.clip === 'idle' && this.mood === 'idle' && !reducedMotion) {
      this.untilVariation -= dt
      if (this.untilVariation <= 0) {
        const index = Math.floor(this.random() * IDLE_VARIATIONS.length)
        this.play(IDLE_VARIATIONS[index] ?? 'look_around')
      }
    }
  }

  private targetPose(reducedMotion: boolean): Pose {
    const current = applyDelta(REST_POSE, CLIPS[this.clip].sample(this.clipTime))
    let target = current
    let expression = CLIPS[this.clip].expression

    if (this.previous) {
      const before = applyDelta(REST_POSE, CLIPS[this.previous.clip].sample(this.previous.time))
      const weight = smoothstep(0, 1, this.fade)
      target = blendPoses(before, current, weight)
      if (weight < 0.5) expression = CLIPS[this.previous.clip].expression
    }

    this.expression = expression
    // Reduced motion keeps the gestures readable but much calmer.
    return reducedMotion ? blendPoses(REST_POSE, target, 0.3) : target
  }

  private updateLook(dt: number, { gaze }: AnimatorInput): void {
    const attention = ABSORBING.has(this.clip) ? 0.25 : 1
    const x = gaze ? gaze.x * attention : 0
    const y = gaze ? gaze.y * attention : 0
    // The head follows slowly; the eyes get there first, as in people.
    this.headYaw = damp(this.headYaw, x * MAX_HEAD_YAW, 3.5, dt)
    this.headPitch = damp(this.headPitch, y * MAX_HEAD_PITCH, 3.5, dt)
    this.eyeX = damp(this.eyeX, x, 14, dt)
    this.eyeY = damp(this.eyeY, y, 14, dt)
  }

  private updateBlink(dt: number): number {
    if (this.blinkTime >= 0) {
      this.blinkTime += dt
      if (this.blinkTime >= BLINK_SECONDS) {
        this.blinkTime = -1
        if (this.pendingDoubleBlink) {
          this.pendingDoubleBlink = false
          this.untilBlink = 0.12
        } else {
          this.untilBlink = this.nextBlinkDelay()
        }
        return 0
      }
      const half = BLINK_SECONDS / 2
      return this.blinkTime < half ? this.blinkTime / half : 1 - (this.blinkTime - half) / half
    }

    this.untilBlink -= dt
    if (this.untilBlink <= 0) {
      this.blinkTime = 0
      if (!this.pendingDoubleBlink && this.random() < 0.2) this.pendingDoubleBlink = true
    }
    return 0
  }

  private updateWobble(dt: number): void {
    if (dt <= 0) return
    const roll = this.pose.joints.head[2] + this.pose.joints.chest[2] + this.headYaw * 0.3
    const rollSpeed = (roll - this.lastRoll) / dt
    const liftSpeed = (this.pose.rootY - this.lastRootY) / dt
    this.lastRoll = roll
    this.lastRootY = this.pose.rootY

    // A damped spring pushed by how fast the head turns and the body moves up or down.
    const stiffness = 70
    const damping = 5.5
    const drive = -rollSpeed * 6 - liftSpeed * 9
    this.wobbleVelocity += (-stiffness * this.wobble - damping * this.wobbleVelocity + drive) * dt
    this.wobble = Math.max(-0.7, Math.min(0.7, this.wobble + this.wobbleVelocity * dt))
  }

  private nextVariationDelay(): number {
    return 6 + this.random() * 6
  }

  private nextBlinkDelay(): number {
    return 2 + this.random() * 4
  }
}
