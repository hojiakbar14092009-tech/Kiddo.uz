import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import clsx from 'clsx'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { FrameTicker } from '@/components/three/FrameTicker'
import { prepareRenderer } from '@/components/three/prepareRenderer'
import { RENDER_BUDGET } from '@/components/three/renderBudget'
import { useInView } from '@/components/three/useInView'
import type { Wearing } from '@/features/shop/outfits'
import type { MascotMood } from '../types'
import { FaceOutfit3D, HeadOutfit3D, NeckOutfit3D } from './outfits3d'
import { acquire, release } from './assets'
import { onMascotSignal } from './bridge'
import { MascotController, type ModelStats, type Palette } from './controller'
import type { Emotion } from './emotions'
import { MascotDirector, PRIORITY, TapGate, type Performance, type Shown } from './director'
import { baseGesture, IDLE_VARIATIONS } from './gestures'
import { resolveReaction, type Signal } from './reactions'
import { MASCOTS, type MascotContext, type MascotId } from './registry'

export interface Character3DProps {
  mascot: MascotId
  context: MascotContext
  mood: MascotMood
  reactionKey: number
  followPointer: boolean
  reducedMotion: boolean
  /** Lively pages (Home) get spontaneous idle gestures; lessons stay calm. */
  lively: boolean
  quality: 'high' | 'low'
  palette?: Palette
  /** KidoBot wears the child's outfits from the shop. */
  wearing?: Wearing
  label?: string
  className?: string
  onReady: () => void
  /** The model failed to load or WebGL broke: the caller shows the picture instead. */
  onFail: () => void
  /** Mascot Lab only: drive the mascot directly and read its numbers. */
  lab?: LabHooks
}

export interface LabHooks {
  /** Receives the scene's "play now" function (gesture / emotion at once). */
  bind?: (play: (perf: Performance) => void) => void
  onStats?: (stats: ModelStats, clips: string[]) => void
  onFrame?: (shown: Shown, clip: string) => void
  /** Turntable angle in degrees (null: the mascot faces the viewer). */
  yaw?: number | null
  showSkeleton?: boolean
  speaking?: boolean
  /** The base emotion shown while idle. */
  emotion?: Emotion
}

const BUDGET = RENDER_BUDGET.ambient
const FOV = 30
const LOOK_MS = 3000
/** Modest devices: fewer frames (a steady 20 beats an unsteady 30) and no spontaneous gestures. */
const LOW_FPS = 20

/**
 * One 3D mascot on its own transparent canvas (a decoration beside the
 * content, so it draws on demand at the ambient frame rate and not at all off
 * screen or in a hidden tab). The model is shared and counted (assets.ts);
 * the director decides what plays, the controller plays it.
 */
export default function Character3D(props: Character3DProps) {
  const container = useRef<HTMLDivElement>(null)
  const onScreen = useInView(container)
  const [airborne, setAirborne] = useState(false)
  const [taps] = useState(() => new TapGate())
  const [tapChannel] = useState(() => new TapChannel())
  const { reducedMotion, quality, label, className } = props
  const live = airborne && !reducedMotion && quality === 'high'
  // leaving the page releases the WebGL context on purpose: that is not a failure
  const leaving = useRef(false)
  useLayoutEffect(() => {
    leaving.current = false
    return () => {
      leaving.current = true
    }
  }, [])

  return (
    <div
      ref={container}
      data-mascot={props.mascot}
      className={clsx('relative aspect-[5/6]', className)}
      onPointerDown={() => {
        // a friendly reaction to a tap, rate-limited; it never earns anything
        if (taps.allow(performance.now())) tapChannel.emit()
      }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <Canvas
        frameloop="demand"
        dpr={quality === 'high' ? BUDGET.dpr : [1, 1]}
        camera={{ position: [0, 1.4, 6], fov: FOV }}
        gl={{ antialias: quality === 'high', alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          prepareRenderer(gl)
          gl.domElement.addEventListener(
            'webglcontextlost',
            () => {
              if (!leaving.current) props.onFail()
            },
            { once: true },
          )
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <FrameTicker
          fps={reducedMotion ? BUDGET.reducedMotionFps : quality === 'high' ? BUDGET.fps : LOW_FPS}
          active={onScreen}
        />
        <hemisphereLight args={['#FFFAF0', '#D8CFE6', 1.15]} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <directionalLight position={[-4, 3, -3]} intensity={0.8} color="#DDEEFC" />
        {quality === 'high' && (
          // soft studio reflections made locally (works offline), once
          <Environment resolution={64} frames={1}>
            <Lightformer intensity={2} position={[0, 3, 4]} scale={[6, 2, 1]} />
            <Lightformer intensity={1} position={[-4, 1, 2]} scale={[2, 4, 1]} color="#FFF0C2" />
            <Lightformer intensity={1} position={[4, 1, 2]} scale={[2, 4, 1]} color="#DDEEFC" />
          </Environment>
        )}
        <Scene
          {...props}
          taps={tapChannel}
          onAirborne={setAirborne}
          onClip={(clip) => container.current?.setAttribute('data-clip', clip)}
        />
        {/* drawn once while standing; live only while the feet leave the ground */}
        <ContactShadows
          key={live ? 'live' : `still-${props.mascot}`}
          frames={live ? Infinity : 1}
          position={[0, 0.001, 0]}
          opacity={0.3}
          scale={3.4}
          blur={2.6}
          far={1.6}
          resolution={quality === 'high' ? 256 : 128}
          color="#3A2E4D"
        />
      </Canvas>
    </div>
  )
}

function Scene({
  mascot,
  context,
  mood,
  reactionKey,
  followPointer,
  reducedMotion,
  lively,
  quality,
  palette,
  wearing,
  onReady,
  onFail,
  lab,
  taps,
  onAirborne,
  onClip,
}: Character3DProps & {
  taps: TapChannel
  onAirborne: (on: boolean) => void
  /** The clip now playing (written to the box as data-clip, for tests and tools). */
  onClip: (clip: string) => void
}) {
  const def = MASCOTS[mascot]
  const [controller, setController] = useState<MascotController | null>(null)
  const ctrl = useRef<MascotController | null>(null)
  const [director] = useState(() => new MascotDirector())
  const clock = useRef(0)
  const streak = useRef<{ count: number; at: number }>({ count: 0, at: -Infinity })
  const look = useRef<{ x: number; y: number; at: number } | null>(null)
  const variation = useRef({ next: 0, index: 0 })
  const air = useRef(false)
  const lastClip = useRef('')
  const camera = useThree((state) => state.camera as THREE.PerspectiveCamera)
  const size = useThree((state) => state.size)
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const accent = palette?.accent
  const glow = palette?.glow
  const callbacks = useRef({ onReady, onFail })
  useEffect(() => {
    callbacks.current = { onReady, onFail }
  })

  // load (shared, counted) and build this mascot's controller
  useEffect(() => {
    let alive = true
    let made: MascotController | null = null
    acquire(def.model).then(
      (gltf) => {
        if (!alive) return
        made = new MascotController(def, gltf, {
          palette: accent && glow ? { accent, glow } : undefined,
          seed: def.id.length * 7919 + 13,
        })
        ctrl.current = made
        const owner = made
        director.setDurations((perf) => owner.durationMs(perf.gesture))
        setController(made)
      },
      (error: unknown) => {
        if (!alive) return
        console.warn(`[mascot] ${def.model} did not load`, error)
        callbacks.current.onFail()
      },
    )
    return () => {
      alive = false
      made?.dispose()
      ctrl.current = null
      release(def.model)
    }
  }, [def, accent, glow, director])

  // fit the camera to this mascot (tall Scribble, wide Leafy, small Story)
  useEffect(() => {
    if (!controller) return
    const box = new THREE.Box3().setFromObject(controller.root)
    const height = box.max.y - Math.min(0, box.min.y) + 0.35 // room for a hop
    const width = Math.max(box.max.x - box.min.x, 0.6)
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    const aspect = size.width / Math.max(1, size.height)
    const distance = Math.max(height / 2 / tan, width / 2 / (tan * aspect)) * 1.12
    const centre = (box.max.y + 0.35) / 2
    camera.position.set(0, centre + distance * 0.06, distance + Math.max(0, box.max.z))
    camera.lookAt(0, centre, 0)
    camera.updateProjectionMatrix()
    lab?.onStats?.(controller.stats(), [...controller.clips])
    invalidate()
    // shown only once framed (no first frame at the wrong size)
    callbacks.current.onReady()
  }, [controller, camera, size.width, size.height, invalidate, lab])

  // the page's mood: a base pose, a speaking layer and moments
  useEffect(() => {
    director.setBase(
      mood === 'sleepy' ? 'sleep' : baseGesture(def, context),
      mood === 'sleepy' ? 'sleepy' : (lab?.emotion ?? 'neutral'),
    )
    director.setSpeaking(mood === 'talk' || Boolean(lab?.speaking))
    invalidate()
  }, [director, def, context, mood, lab?.speaking, lab?.emotion, invalidate])

  const reactTo = useRef<(signal: Signal) => void>(() => undefined)
  useEffect(() => {
    reactTo.current = (signal: Signal) => {
      const now = clock.current
      if (signal.kind === 'mood' && signal.mood === 'happy') {
        streak.current = {
          count: now - streak.current.at < 20_000 ? streak.current.count + 1 : 1,
          at: now,
        }
      } else if (signal.kind === 'mood' && signal.mood === 'oops') {
        streak.current = { count: 0, at: now }
      }
      const perf = resolveReaction(signal, { mascot, streak: streak.current.count, reducedMotion })
      if (perf) director.request(perf, now)
      invalidate()
    }
  }, [mascot, reducedMotion, director, invalidate])

  const lastKey = useRef(reactionKey)
  useEffect(() => {
    if (reactionKey === lastKey.current) return
    lastKey.current = reactionKey
    reactTo.current({ kind: 'mood', mood })
  }, [reactionKey, mood])

  // world events (Phase 18) through the bridge
  useEffect(() => onMascotSignal((signal) => reactTo.current(signal)), [])

  useEffect(() => taps.listen(() => reactTo.current({ kind: 'tap' })), [taps])
  useEffect(() => {
    lab?.bind?.((perf) => {
      director.request(perf, clock.current)
      invalidate()
    })
  }, [lab, director, invalidate])

  // a touch draws a glance (no constant mouse following)
  useEffect(() => {
    if (!followPointer) return undefined
    const onPointer = (event: PointerEvent) => {
      const box = gl.domElement.getBoundingClientRect()
      const x = (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2)
      const y = (event.clientY - (box.top + box.height * 0.3)) / (window.innerHeight / 2)
      look.current = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
        at: clock.current,
      }
    }
    window.addEventListener('pointerdown', onPointer)
    return () => window.removeEventListener('pointerdown', onPointer)
  }, [followPointer, gl])

  useFrame((_, delta) => {
    const c = ctrl.current
    if (!c) return
    const dt = Math.min(delta, 0.1)
    clock.current += dt * 1000
    const now = clock.current
    // spontaneous idle gestures, only on lively pages
    if (lively && !reducedMotion && quality === 'high') {
      const v = variation.current
      if (v.next === 0) v.next = now + seconds(def.personality.idleEvery, v.index) * 1000
      if (now >= v.next) {
        const gesture = IDLE_VARIATIONS[v.index % IDLE_VARIATIONS.length]!
        director.request({ gesture, emotion: 'curious', priority: PRIORITY.context, rank: 0 }, now)
        v.index += 1
        v.next = now + seconds(def.personality.idleEvery, v.index) * 1000
      }
    }
    const shown = director.tick(now)
    c.show(shown, { reducedMotion, calm: !lively })
    const glance = look.current && now - look.current.at < LOOK_MS ? look.current : null
    c.update(dt, {
      speaking: shown.gesture === 'talk' || Boolean(lab?.speaking),
      look: glance,
      reducedMotion,
      calm: !lively,
    })
    if (lab?.yaw !== undefined && lab.yaw !== null)
      c.root.rotation.y = THREE.MathUtils.degToRad(lab.yaw)
    lab?.onFrame?.(shown, c.currentClip)
    if (c.currentClip !== lastClip.current) {
      lastClip.current = c.currentClip
      onClip(c.currentClip)
    }
    const up = def.airborne.includes(c.currentClip)
    if (up !== air.current) {
      air.current = up
      onAirborne(up)
    }
  })

  if (!controller) return null
  return (
    <>
      <primitive object={controller.root} />
      {lab?.showSkeleton && <SkeletonLines root={controller.root} />}
      {mascot === 'kidobot' && wearing && <Outfits controller={controller} wearing={wearing} />}
    </>
  )
}

/** Taps on the mascot's box, handed to the scene inside the canvas. */
class TapChannel {
  private listener: (() => void) | null = null

  listen(listener: () => void): () => void {
    this.listener = listener
    return () => {
      if (this.listener === listener) this.listener = null
    }
  }

  emit(): void {
    this.listener?.()
  }
}

function seconds([min, max]: readonly [number, number], index: number): number {
  // deterministic spread inside the personality's range
  return min + ((index * 0.618) % 1) * (max - min)
}

/** The shop's outfits on KidoBot's sockets (they follow every head turn and nod). */
function Outfits({ controller, wearing }: { controller: MascotController; wearing: Wearing }) {
  const head = controller.socket('Socket_Head')
  const face = controller.socket('Socket_Face')
  const neck = controller.socket('Socket_Neck')
  // sockets rest in the model's frame: undo their rest rotation once
  const offsets = useMemo(() => {
    const undo = (node: THREE.Object3D | undefined) => {
      if (!node) return new THREE.Quaternion()
      controller.root.updateMatrixWorld(true)
      const world = node.getWorldQuaternion(new THREE.Quaternion())
      const root = controller.root.getWorldQuaternion(new THREE.Quaternion())
      return world.invert().multiply(root)
    }
    return { head: undo(head), face: undo(face), neck: undo(neck) }
  }, [controller, head, face, neck])
  return (
    <>
      {head &&
        createPortal(
          <group quaternion={offsets.head}>
            <HeadOutfit3D id={wearing.head} />
            <HeadOutfit3D id={wearing.ear} />
          </group>,
          head,
        )}
      {face &&
        createPortal(
          <group quaternion={offsets.face}>
            <FaceOutfit3D id={wearing.face} />
          </group>,
          face,
        )}
      {neck &&
        createPortal(
          <group quaternion={offsets.neck}>
            <NeckOutfit3D id={wearing.neck} />
          </group>,
          neck,
        )}
    </>
  )
}

/** Mascot Lab: the skeleton as lines between joints. */
function SkeletonLines({ root }: { root: THREE.Object3D }) {
  const helper = useMemo(() => {
    const h = new THREE.SkeletonHelper(root)
    ;(h.material as THREE.LineBasicMaterial).depthTest = false
    ;(h.material as THREE.LineBasicMaterial).color.set('#FF3D7F')
    return h
  }, [root])
  useEffect(() => () => helper.dispose(), [helper])
  return <primitive object={helper} />
}
