import { afterEach, describe, expect, it } from 'vitest'
import type { DomainEvent } from '@/domain/universe/progression'
import { publish } from '@/domain/universe/progression'
import { useFamilyStore } from '@/store/familyStore'
import { emitMascotSignal, mascotListeners, onMascotSignal } from './bridge'
import { MAX_QUEUE, MascotDirector, PRIORITY, TapGate, type Performance } from './director'
import {
  Blinker,
  blendFace,
  blinkRoom,
  EMOTION_FACES,
  EMOTIONS,
  FACE_TARGETS,
  Syllables,
  type FaceWeights,
} from './emotions'
import { baseGesture, clipFor, LOOPING } from './gestures'
import { resolveReaction, type Signal } from './reactions'
import {
  CONTEXT_ROUTES,
  contextOf,
  GESTURES,
  MASCOT_IDS,
  MASCOTS,
  mascotFor,
  type MascotId,
} from './registry'

const perf = (
  gesture: string,
  priority: number,
  rank = 1,
  extra: Partial<Performance> = {},
): Performance => ({
  gesture,
  emotion: 'happy',
  priority,
  rank,
  ...extra,
})

describe('mascot registry', () => {
  it('has ten unique mascots with a model, a picture and a name', () => {
    expect(new Set(MASCOT_IDS).size).toBe(10)
    for (const id of MASCOT_IDS) {
      const def = MASCOTS[id]
      expect(def.id).toBe(id)
      expect(def.model).toBe(`/mascots/${id}.glb`)
      expect(def.poster).toBe(`/mascots/posters/${id}.webp`)
      expect(def.personality.blendMs).toBeGreaterThanOrEqual(150)
      expect(def.personality.blendMs).toBeLessThanOrEqual(400)
    }
  })

  it('maps every context to exactly one guide, pages by route (config, not code)', () => {
    const contexts = MASCOT_IDS.flatMap((id) => MASCOTS[id].contexts)
    expect(new Set(contexts).size).toBe(contexts.length)
    expect(mascotFor(contextOf('/home'))).toBe('kidobot')
    expect(mascotFor(contextOf('/learn/space/lesson'))).toBe('astro')
    expect(mascotFor(contextOf('/worlds/dino/quiz'))).toBe('dinoo')
    expect(mascotFor(contextOf('/worlds/uzbekistan/map'))).toBe('ziyo')
    expect(mascotFor(contextOf('/mistake-garden'))).toBe('leafy')
    expect(mascotFor(contextOf('/spaceport'))).toBe('pixel')
    expect(mascotFor(contextOf('/spaceport/mars'))).toBe('astro')
    expect(mascotFor(contextOf('/tasks/trace'))).toBe('scribble')
    expect(mascotFor(contextOf('/learn/tales/1'))).toBe('story')
    // a prefix is a whole path segment
    expect(contextOf('/alphabetical')).toBe('home')
    for (const [prefix] of CONTEXT_ROUTES) expect(prefix.startsWith('/')).toBe(true)
  })
})

describe('shared gestures', () => {
  const available = (...names: string[]) => new Set(names)

  it('resolves a gesture to the mascot’s own clip first, then the shared one, then idle', () => {
    expect(clipFor(MASCOTS.dinoo, 'celebrate', available('celebrate', 'happy_hop'))).toBe(
      'happy_hop',
    )
    expect(clipFor(MASCOTS.kidobot, 'celebrate', available('celebrate'))).toBe('celebrate')
    expect(clipFor(MASCOTS.kidobot, 'moonwalk', available('idle'))).toBe('idle')
    expect(baseGesture(MASCOTS.astro, 'space')).toBe('float')
    expect(baseGesture(MASCOTS.astro, 'home')).toBe('idle')
    expect(LOOPING.has('idle') && !LOOPING.has('celebrate')).toBe(true)
    expect(GESTURES).toContain('wave')
  })
})

describe('emotions', () => {
  it('every emotion uses known face targets with weights in 0…1', () => {
    expect(EMOTIONS).toHaveLength(13)
    for (const emotion of EMOTIONS) {
      for (const [key, value] of Object.entries(EMOTION_FACES[emotion])) {
        expect(FACE_TARGETS).toContain(key)
        expect(value).toBeGreaterThan(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('blends a face over about blendMs instead of switching at once', () => {
    let face: FaceWeights = {}
    face = blendFace(face, EMOTION_FACES.happy, 0.05, 300)
    expect(face.mouth_smile).toBeGreaterThan(0.05)
    expect(face.mouth_smile).toBeLessThan(0.5)
    for (let i = 0; i < 12; i += 1) face = blendFace(face, EMOTION_FACES.happy, 0.05, 300)
    expect(face.mouth_smile).toBeGreaterThan(0.7)
  })

  it('blinks at irregular, bounded intervals and not through closed eyes', () => {
    const blinker = new Blinker(42)
    const starts: number[] = []
    let t = 0
    let closed = false
    for (let i = 0; i < 60 * 60; i += 1) {
      const v = blinker.step(1 / 60)
      t += 1 / 60
      if (v > 0.5 && !closed) starts.push(t)
      closed = v > 0.5
    }
    const gaps = starts.slice(1).map((s, i) => s - starts[i]!)
    expect(starts.length).toBeGreaterThan(8)
    expect(Math.min(...gaps)).toBeGreaterThan(0.05)
    expect(Math.max(...gaps)).toBeLessThan(6.5)
    expect(new Set(gaps.map((g) => g.toFixed(1))).size).toBeGreaterThan(3)
    expect(blinkRoom({ eyes_happy: 1 })).toBe(0)
  })

  it('opens the mouth only while speech plays (no fake lip-sync data)', () => {
    const s = new Syllables(3)
    const open = Array.from({ length: 60 }, () => s.step(1 / 30, true))
    expect(Math.max(...open)).toBeGreaterThan(0.3)
    for (let i = 0; i < 30; i += 1) s.step(1 / 30, false)
    expect(s.step(1 / 30, false)).toBe(0)
  })
})

describe('director (state machine)', () => {
  const make = () => {
    const d = new MascotDirector()
    d.setDurations((p) => (p.gesture === 'idle' || p.gesture === 'talk' ? Infinity : 1000))
    return d
  }

  it('plays a reaction, then returns to the base pose', () => {
    const d = make()
    d.setBase('float', 'neutral')
    expect(d.tick(0).gesture).toBe('float')
    expect(d.request(perf('celebrate', PRIORITY.reaction, 3), 0)).toBe('started')
    expect(d.tick(500).gesture).toBe('celebrate')
    expect(d.tick(1200)).toMatchObject({ gesture: 'float', priority: PRIORITY.idle })
  })

  it('a burst of events plays one strongest moment; the queue stays bounded', () => {
    const d = make()
    d.request(perf('encourage', PRIORITY.reaction, 1), 0)
    expect(d.request(perf('surprised', PRIORITY.reaction, 2), 50)).toBe('merged')
    expect(d.request(perf('celebrate', PRIORITY.reaction, 3), 100)).toBe('merged')
    expect(d.tick(120).gesture).toBe('celebrate')
    for (let i = 0; i < 10; i += 1) d.request(perf(`r${i}`, PRIORITY.reaction, 1), 600 + i)
    expect(d.pending).toBeLessThanOrEqual(MAX_QUEUE)
    // everything plays out and the mascot is idle again
    let t = 700
    for (let i = 0; i < 100; i += 1) d.tick((t += 100))
    expect(d.tick(t).gesture).toBe('idle')
    expect(d.pending).toBe(0)
  })

  it('interruptions follow priority: a world unlock cuts in, an idle gesture never does', () => {
    const d = make()
    d.request(perf('celebrate', PRIORITY.reaction, 3), 0)
    expect(d.request(perf('look_around', PRIORITY.context, 0), 500)).toBe('dropped')
    expect(d.request(perf('wave', PRIORITY.interaction, 1), 500)).toBe('dropped')
    expect(d.request(perf('surprised', PRIORITY.critical, 4), 600)).toBe('started')
    expect(d.tick(700).gesture).toBe('surprised')
  })

  it('speech is a layer: talk while speaking, a reaction plays over it, then talk again', () => {
    const d = make()
    d.setSpeaking(true)
    expect(d.tick(0).gesture).toBe('talk')
    expect(d.request(perf('look_around', PRIORITY.context, 0), 10)).toBe('dropped')
    d.request(perf('nod', PRIORITY.reaction, 1), 20)
    expect(d.tick(500).gesture).toBe('nod')
    expect(d.tick(1500).gesture).toBe('talk')
    d.setSpeaking(false)
    expect(d.tick(1600).gesture).toBe('idle')
  })

  it('a sequence plays in order (look → surprised → celebrate)', () => {
    const d = make()
    d.request(
      perf('surprised', PRIORITY.reaction, 4, { then: perf('celebrate', PRIORITY.reaction, 4) }),
      0,
    )
    expect(d.tick(100).gesture).toBe('surprised')
    expect(d.tick(1100).gesture).toBe('celebrate')
    expect(d.tick(2300).gesture).toBe('idle')
  })

  it('taps are rate-limited (no reaction spam)', () => {
    const gate = new TapGate()
    expect(gate.allow(0)).toBe(true)
    expect(gate.allow(300)).toBe(false)
    expect(gate.allow(1300)).toBe(true)
    expect(gate.allow(2600)).toBe(true)
    expect(gate.allow(4000)).toBe(false)
    expect(gate.allow(12_000)).toBe(true)
  })
})

describe('reaction resolver', () => {
  const state = (mascot: MascotId = 'kidobot', extra = {}) => ({
    mascot,
    streak: 0,
    reducedMotion: false,
    ...extra,
  })
  const domain = (event: DomainEvent): Signal => ({ kind: 'domain', event })
  const NEGATIVE = new Set(['gentle_sad', 'confused'])

  it('a wrong answer makes the mascot think and encourage, never sad', () => {
    for (const id of MASCOT_IDS) {
      const r = resolveReaction({ kind: 'mood', mood: 'oops' }, state(id))!
      expect(['think', 'encourage']).toContain(r.gesture)
      expect(NEGATIVE.has(r.emotion)).toBe(false)
    }
    expect(
      resolveReaction(
        domain({ type: 'mistake.made', childKey: 'k', skill: 's', strand: 'number' }),
        state(),
      ),
    ).toBeNull()
  })

  it('a right answer nods; a streak celebrates', () => {
    expect(resolveReaction({ kind: 'mood', mood: 'happy' }, state())?.gesture).toBe('encourage')
    expect(
      resolveReaction({ kind: 'mood', mood: 'happy' }, state('kidobot', { streak: 3 }))?.gesture,
    ).toBe('celebrate')
  })

  it('quest, reward, unlock and find events get the right size of moment', () => {
    expect(
      resolveReaction(domain({ type: 'quest.completed', childKey: 'k', quest: 'q' }), state())
        ?.gesture,
    ).toBe('celebrate')
    const crystal = resolveReaction(
      domain({
        type: 'resource.changed',
        childKey: 'k',
        entry: {
          id: 'e',
          childKey: 'k',
          resource: 'crystal',
          amount: 1,
          reason: 'r',
          refId: 'x',
          at: '',
        },
      } as DomainEvent),
      state('astro'),
    )!
    expect(crystal.gesture).toBe('surprised')
    expect(crystal.then?.gesture).toBe('celebrate')
    const spent = {
      type: 'resource.changed',
      childKey: 'k',
      entry: {
        id: 'e',
        childKey: 'k',
        resource: 'crystal',
        amount: -2,
        reason: 'r',
        refId: 'x',
        at: '',
      },
    } as DomainEvent
    expect(resolveReaction(domain(spent), state())).toBeNull()
    const unlock = resolveReaction(
      domain({ type: 'world.unlocked', childKey: 'k', id: 'mars' }),
      state(),
    )!
    expect(unlock.priority).toBe(PRIORITY.critical)
    expect(unlock.then?.emotion).toBe('excited')
    expect(
      resolveReaction(
        domain({ type: 'journey.step', childKey: 'k', journey: 'j', step: 's' }),
        state(),
      )?.gesture,
    ).toBe('point')
  })

  it('Leafy blooms with the garden; Pixel repairs; others stay generic', () => {
    const bloom = domain({ type: 'mistake.resolved', childKey: 'k', skill: 's', code: 'c' })
    expect(resolveReaction(bloom, state('leafy'))?.gesture).toBe('bloom')
    expect(
      resolveReaction(
        domain({ type: 'mistake.confirmed', childKey: 'k', skill: 's', code: 'c' }),
        state('leafy'),
      )?.emotion,
    ).toBe('encouraging')
    expect(
      resolveReaction(
        domain({ type: 'mistake.confirmed', childKey: 'k', skill: 's', code: 'c' }),
        state('dinoo'),
      ),
    ).toBeNull()
    expect(
      resolveReaction(
        domain({ type: 'building.upgraded', childKey: 'k', id: 'spaceport', level: 1 }),
        state('pixel'),
      )?.gesture,
    ).toBe('wrench')
  })

  it('reduced motion: no jumps or spins, a pose and a face instead', () => {
    const r = resolveReaction(
      domain({ type: 'world.unlocked', childKey: 'k', id: 'mars' }),
      state('kidobot', { reducedMotion: true }),
    )!
    expect(r.then?.gesture).toBe('celebrate_calm')
    expect(
      resolveReaction({ kind: 'mood', mood: 'celebrate' }, state('dinoo', { reducedMotion: true }))
        ?.gesture,
    ).toBe('celebrate_calm')
    // Lumi encourages by rising and shining (illuminate): calm too
    expect(
      resolveReaction({ kind: 'mood', mood: 'happy' }, state('lumi', { reducedMotion: true }))
        ?.gesture,
    ).toBe('celebrate_calm')
  })

  it('a tap is a small interaction that never pays anything', () => {
    const r = resolveReaction({ kind: 'tap' }, state())!
    expect(r.priority).toBe(PRIORITY.interaction)
    expect(Object.keys(r)).not.toContain('reward')
  })
})

describe('event bridge', () => {
  afterEach(() => useFamilyStore.setState({ activeChildId: null }))

  it('hears world events of the playing child only, and stops listening with the last mascot', () => {
    useFamilyStore.setState({ activeChildId: 'kid' })
    const heard: string[] = []
    const off = onMascotSignal(
      (s) => s.kind === 'domain' && heard.push(`${s.event.type}:${s.event.childKey}`),
    )
    publish({ type: 'world.unlocked', childKey: 'kid', id: 'mars' })
    publish({ type: 'world.unlocked', childKey: 'other', id: 'mars' })
    emitMascotSignal({ kind: 'tap' })
    expect(heard).toEqual(['world.unlocked:kid'])
    expect(mascotListeners()).toBe(1)
    off()
    expect(mascotListeners()).toBe(0)
    publish({ type: 'world.unlocked', childKey: 'kid', id: 'mars' })
    expect(heard).toHaveLength(1)
  })
})
