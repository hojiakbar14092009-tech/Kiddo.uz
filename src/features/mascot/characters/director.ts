import type { Emotion } from './emotions'

/*
 * The mascot's deterministic animation state machine. One director per shown
 * mascot decides what the body and the face do; components never play clips
 * themselves, so nothing fights over the animation.
 *
 * Priorities (a higher one may interrupt a lower one):
 *   critical (5)  world unlocked, a page-level moment
 *   reaction (4)  quest / reward / answer reactions
 *   speaking (3)  a layer: talking while speech plays, under reactions
 *   interaction(2) the child tapped the mascot
 *   context (1)   spontaneous idle gestures (look around, ...)
 *   idle (0)      the base pose of the page (idle, float, sleep, ...)
 *
 * Rapid events never pile up: a reaction asked for within MERGE_MS of the
 * one just started is merged into it (the stronger one wins), the queue keeps
 * at most MAX_QUEUE reactions (the strongest), and when everything has played
 * the mascot returns to its base.
 */

export const PRIORITY = {
  idle: 0,
  context: 1,
  interaction: 2,
  speaking: 3,
  reaction: 4,
  critical: 5,
} as const

export const MAX_QUEUE = 3
export const MERGE_MS = 350

export interface Performance {
  /** A shared gesture name or one of the mascot's own clips. */
  gesture: string
  emotion: Emotion
  priority: number
  /** Bigger moments win a merge (nod 1 … celebrate 3). */
  rank: number
  /** Minimum time on screen; loops play exactly this long. */
  holdMs?: number
  /** Played right after this one (look → surprised → celebrate). */
  then?: Performance
}

export interface Shown {
  gesture: string
  emotion: Emotion
  priority: number
  /** Changes whenever a new performance starts (to restart the same clip). */
  serial: number
}

export type RequestResult = 'started' | 'merged' | 'queued' | 'dropped'

interface Active {
  perf: Performance
  startedAt: number
  endsAt: number
}

export class MascotDirector {
  private current: Active | null = null
  private queue: Performance[] = []
  private speaking = false
  private base: { gesture: string; emotion: Emotion } = { gesture: 'idle', emotion: 'neutral' }
  private serial = 0

  private duration: (perf: Performance) => number = () => 1500

  /** `duration(perf)` gives the length of a performance's clip in ms (Infinity: a loop). */
  setDurations(duration: (perf: Performance) => number): void {
    this.duration = duration
  }

  setBase(gesture: string, emotion: Emotion): void {
    if (this.base.gesture !== gesture || this.base.emotion !== emotion) {
      this.base = { gesture, emotion }
      if (!this.current) this.serial += 1
    }
  }

  setSpeaking(on: boolean): void {
    if (this.speaking !== on) {
      this.speaking = on
      if (!this.current || this.current.perf.priority < PRIORITY.speaking) {
        // speech takes over from idle gestures at once
        if (on && this.current) this.current = null
        this.serial += 1
      }
    }
  }

  get pending(): number {
    return this.queue.length
  }

  request(perf: Performance, now: number): RequestResult {
    const active = this.current
    const floor = this.speaking ? PRIORITY.speaking : PRIORITY.idle
    if (!active) {
      if (perf.priority <= floor && perf.priority < PRIORITY.reaction) return 'dropped'
      this.start(perf, now)
      return 'started'
    }
    const current = active.perf
    // the same moment asked again while it plays: one performance
    if (perf.gesture === current.gesture && perf.priority <= current.priority) return 'merged'
    // a burst of reactions (answer + reward + quest): the strongest one plays
    if (
      perf.priority >= PRIORITY.reaction &&
      current.priority >= PRIORITY.reaction &&
      now - active.startedAt < MERGE_MS
    ) {
      if (perf.priority > current.priority || perf.rank > current.rank) this.start(perf, now)
      return 'merged'
    }
    if (perf.priority > current.priority) {
      this.start(perf, now)
      return 'started'
    }
    // lower or equal: reactions wait their turn, small things are not worth it
    if (perf.priority >= PRIORITY.reaction) return this.enqueue(perf)
    return 'dropped'
  }

  private enqueue(perf: Performance): RequestResult {
    const same = this.queue.findIndex((item) => item.gesture === perf.gesture)
    if (same >= 0) {
      const kept = this.queue[same]!
      if (perf.priority > kept.priority || perf.rank > kept.rank) this.queue[same] = perf
      return 'merged'
    }
    this.queue.push(perf)
    // strongest first; equal ones in arrival order (sort is stable)
    this.queue.sort((a, b) => b.priority - a.priority || b.rank - a.rank)
    if (this.queue.length > MAX_QUEUE) this.queue.length = MAX_QUEUE
    return this.queue.includes(perf) ? 'queued' : 'dropped'
  }

  private start(perf: Performance, now: number): void {
    const clip = this.duration(perf)
    const length = Number.isFinite(clip) ? Math.max(clip, perf.holdMs ?? 0) : (perf.holdMs ?? 2000)
    this.current = { perf, startedAt: now, endsAt: now + length }
    this.serial += 1
  }

  /** Advances time; returns what to show now. */
  tick(now: number): Shown {
    while (this.current && now >= this.current.endsAt) {
      const next = this.current.perf.then ?? this.queue.shift()
      const endedAt = this.current.endsAt
      this.current = null
      if (next) this.start(next, Math.max(endedAt, now - 1000))
      else this.serial += 1
    }
    if (this.current) {
      const { gesture, emotion, priority } = this.current.perf
      return { gesture, emotion, priority, serial: this.serial }
    }
    if (this.speaking) {
      return {
        gesture: 'talk',
        emotion: 'speaking',
        priority: PRIORITY.speaking,
        serial: this.serial,
      }
    }
    return { ...this.base, priority: PRIORITY.idle, serial: this.serial }
  }
}

/** Rate limit for taps on a mascot: one reaction per 1.2 s, three per 10 s. */
export class TapGate {
  private times: number[] = []

  allow(now: number): boolean {
    this.times = this.times.filter((t) => now - t < 10_000)
    const last = this.times[this.times.length - 1]
    if (last !== undefined && now - last < 1200) return false
    if (this.times.length >= 3) return false
    this.times.push(now)
    return true
  }
}
