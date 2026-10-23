/*
 * How the explored model is turned and zoomed: by a finger or the mouse, two
 * fingers (pinch), the wheel, or the keyboard. Pure (no three.js), so the
 * page that shows the still picture can keep it without loading 3D, and the
 * limits are unit-tested.
 */

export const ORBIT_LIMITS = {
  minZoom: 0.65,
  maxZoom: 1.8,
  minPitch: -0.45,
  maxPitch: 0.6,
} as const

/** The model starts turned a little (radians), like the still pictures. */
export const START_YAW = -0.6
/** …and seen a little from above, so backs (plates, armour) show. */
export const START_PITCH = 0.22

/** One arrow key press turns the model by this much (radians). */
export const KEY_TURN = 0.35
/** One +/− press (or button) zooms by this factor. */
export const KEY_ZOOM = 1.2

const DRAG_SPEED = 0.012
/** A gentle turn when nobody touches the model (never with reduced motion). */
const IDLE_SPEED = 0.25
/**
 * The idle turn ends after one revolution or this many seconds, whichever
 * comes first; after that frames are drawn only when the child interacts.
 */
export const IDLE_MAX_SECONDS = 6
const IDLE_MAX_TURN = Math.PI * 2

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

interface PointerPoint {
  x: number
  y: number
  /** Mouse (and pen) drags may tilt the model; a finger only turns it (vertical swipes scroll). */
  tilt: boolean
}

export class Orbit {
  yaw = 0
  pitch = 0
  zoom = 1
  velocity = 0
  /**
   * The idle turn only invites the first touch: once the child turns, zooms
   * or taps a point, the model stays where they put it (points stay still to tap).
   */
  idleOver = false
  /** Seconds the idle turn has run (it counts only while it actually turns). */
  private idleTime = 0
  private pointers = new Map<number, PointerPoint>()
  private pinch: { distance: number; zoom: number } | null = null

  get touching(): boolean {
    return this.pointers.size > 0
  }

  down(id: number, x: number, y: number, tilt = false): void {
    this.pointers.set(id, { x, y, tilt })
    this.velocity = 0
    this.idleOver = true
    this.pinch = this.pointers.size === 2 ? { distance: this.spread(), zoom: this.zoom } : null
  }

  /** Returns true when the view changed. */
  move(id: number, x: number, y: number): boolean {
    const last = this.pointers.get(id)
    if (!last) return false
    this.pointers.set(id, { ...last, x, y })
    if (this.pinch && this.pointers.size === 2) {
      const distance = this.spread()
      if (this.pinch.distance > 0) this.setZoom(this.pinch.zoom * (distance / this.pinch.distance))
      return true
    }
    if (this.pointers.size !== 1) return false
    const step = (x - last.x) * DRAG_SPEED
    this.yaw += step
    this.velocity = step
    if (last.tilt) this.setPitch(this.pitch + (y - last.y) * DRAG_SPEED)
    return true
  }

  up(id: number): void {
    this.pointers.delete(id)
    if (this.pointers.size < 2) this.pinch = null
  }

  turn(dYaw: number, dPitch = 0): void {
    this.velocity = 0
    this.idleOver = true
    this.yaw += dYaw
    this.setPitch(this.pitch + dPitch)
  }

  /** Multiplies the zoom; returns false when it was already at that limit. */
  zoomBy(factor: number): boolean {
    const before = this.zoom
    this.idleOver = true
    this.setZoom(this.zoom * factor)
    return this.zoom !== before
  }

  /** Ends the idle turn (e.g. a point was tapped). */
  settle(): void {
    this.idleOver = true
  }

  reset(): void {
    this.yaw = 0
    this.pitch = 0
    this.zoom = 1
    this.velocity = 0
  }

  /**
   * One frame: a flick keeps turning a little and slows down; with `idle` a
   * gentle turn that stops for good after one revolution or IDLE_MAX_SECONDS.
   * Returns true while the view still moves (another frame is needed).
   */
  step(dt: number, idle: boolean): boolean {
    if (this.touching) return false
    this.yaw += this.velocity
    this.velocity *= 0.9
    if (Math.abs(this.velocity) < 0.0005) this.velocity = 0
    let turning = idle && !this.idleOver
    if (turning) {
      this.yaw += dt * IDLE_SPEED
      this.idleTime += dt
      if (this.idleTime >= IDLE_MAX_SECONDS || this.idleTime * IDLE_SPEED >= IDLE_MAX_TURN) {
        // one invitation is enough: from now on the canvas draws only on demand
        this.idleOver = true
        turning = false
      }
    }
    return turning || this.velocity !== 0
  }

  private setZoom(value: number) {
    this.zoom = clamp(value, ORBIT_LIMITS.minZoom, ORBIT_LIMITS.maxZoom)
  }

  private setPitch(value: number) {
    this.pitch = clamp(value, ORBIT_LIMITS.minPitch, ORBIT_LIMITS.maxPitch)
  }

  private spread(): number {
    const [a, b] = [...this.pointers.values()]
    if (!a || !b) return 0
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
}

/**
 * What the Explorer's buttons (outside the lazy 3D view) use to turn the
 * model: the orbit, and a way to ask the view for a new frame.
 */
export class ExplorerRemote {
  readonly orbit = new Orbit()
  private draw: () => void = () => undefined
  /** The model it turns (a new model gets a new remote, starting from the front). */
  readonly modelId: string

  constructor(modelId: string) {
    this.modelId = modelId
  }

  /** The 3D view connects its "draw a frame" here (and disconnects with null). */
  connect(draw: (() => void) | null): void {
    this.draw = draw ?? (() => undefined)
  }

  redraw(): void {
    this.draw()
  }
}
