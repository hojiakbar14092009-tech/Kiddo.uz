import { Canvas, useFrame, useThree } from '@react-three/fiber'
import clsx from 'clsx'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import * as THREE from 'three'
import { tDynamic } from '@/lib/tDynamic'
import { addExplorerLights, disposeObject } from './lights'
import { MARKER_GAP, MARKER_SIZE, clamp, separate } from './markers'
import {
  KEY_TURN,
  KEY_ZOOM,
  START_PITCH,
  START_YAW,
  type ExplorerRemote,
  type Orbit,
} from './orbit'
import type { ExplorerHotspot, ExplorerModelDef, ExplorerQuality } from './types'

/*
 * The live 3D view of the Explorer, loaded only when it opens (three.js and
 * R3F stay out of the page's chunk). It renders on demand: a frame is drawn
 * only while something moves (a drag, a flick, the idle turn), and the idle
 * turn stops while the view is off screen or the tab is hidden.
 */

export interface ExplorerViewProps {
  model: ExplorerModelDef
  label: string
  quality: ExplorerQuality
  reducedMotion: boolean
  onHotspot?: (id: string) => void
  activeHotspot?: string | null
  /** WebGL broke (context lost) or the model could not be built. */
  onFail: () => void
  /** Shown while the model loads. */
  placeholder: ReactNode
  /** The orbit, shared with the zoom and reset buttons outside this view. */
  remote: ExplorerRemote
}

interface SceneProps {
  object: THREE.Object3D
  orbit: Orbit
  distance: number
  idle: boolean
  active: { current: boolean }
  hotspots: readonly ExplorerHotspot[]
  anchors: { current: (HTMLButtonElement | null)[] }
  /** Gives the view's handlers a way to ask for a new frame (frameloop 'demand'). */
  remote: ExplorerRemote
}

function Scene({ object, orbit, distance, idle, active, hotspots, anchors, remote }: SceneProps) {
  const { scene, camera, invalidate, size } = useThree()
  const [pivot] = useState(() => new THREE.Group())
  const point = useRef(new THREE.Vector3())
  const centre = useRef(new THREE.Vector3())

  useEffect(() => {
    const lights = addExplorerLights(scene)
    pivot.add(object)
    scene.add(pivot)
    return () => {
      scene.remove(pivot)
      pivot.remove(object)
      lights.forEach((light) => {
        scene.remove(light)
        light.dispose()
      })
    }
  }, [object, pivot, scene])

  // pointer and key handlers outside the canvas ask for a new frame through this
  useEffect(() => {
    remote.connect(() => invalidate())
    invalidate()
    return () => remote.connect(null)
  }, [invalidate, remote])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const moving = orbit.step(dt, idle && active.current)
    pivot.rotation.set(START_PITCH + orbit.pitch, START_YAW + orbit.yaw, 0)
    camera.position.set(0, 0, distance / orbit.zoom)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    pivot.updateMatrixWorld(true)

    // the numbered buttons follow their points on the model
    centre.current.set(0, 0, 0).applyMatrix4(camera.matrixWorldInverse)
    const half = MARKER_SIZE / 2
    const placed = hotspots.map((spot) => {
      const p = point.current.set(...spot.position).applyMatrix4(object.matrixWorld)
      const depth = p.clone().applyMatrix4(camera.matrixWorldInverse).z
      p.project(camera)
      const x = ((p.x + 1) / 2) * size.width
      const y = ((1 - p.y) / 2) * size.height
      const outside = x < 0 || x > size.width || y < 0 || y > size.height
      return { x, y, outside, behind: depth < centre.current.z - 0.15 }
    })
    // spread apart inside the frame (a clamp afterwards could stack them again)
    separate(placed, MARKER_SIZE + MARKER_GAP, {
      width: size.width,
      height: size.height,
      inset: half,
    })
    placed.forEach((spot, index) => {
      const element = anchors.current[index]
      if (!element) return
      // kept inside the frame (half a button from the edge): a point turned or zoomed out
      // of view never lands on the buttons or text around the model; such a point is
      // dimmed and cannot be tapped until it turns back into view
      const x = clamp(spot.x, half, size.width - half)
      const y = clamp(spot.y, half, size.height - half)
      element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`
      element.dataset.behind = spot.behind ? 'true' : 'false'
      element.dataset.offscreen = spot.outside ? 'true' : 'false'
      element.style.visibility = 'visible'
    })
    if (moving) invalidate()
  })

  return null
}

/** Holds the turning model and its numbered points; keys and fingers turn it. */
export default function ExplorerView({
  model,
  label,
  quality,
  reducedMotion,
  onHotspot,
  activeHotspot,
  onFail,
  placeholder,
  remote,
}: ExplorerViewProps) {
  const { t } = useTranslation()
  const orbit = remote.orbit
  const [object, setObject] = useState<THREE.Object3D | null>(null)
  const anchors = useRef<(HTMLButtonElement | null)[]>([])
  const active = useRef(true)
  const frame = useRef<HTMLDivElement>(null)
  const hotspots = model.hotspots ?? []
  // the latest definition and callback, without rebuilding the model when a parent re-renders
  const latest = useRef({ model, onFail })
  useEffect(() => {
    latest.current = { model, onFail }
  })

  // build the model once per model id; the GPU memory goes with it
  useEffect(() => {
    let built: THREE.Object3D | null = null
    let cancelled = false
    latest.current.model
      .load()
      .then((build) => {
        if (cancelled) return
        built = build(quality)
        setObject(built)
      })
      .catch(() => {
        if (!cancelled) latest.current.onFail()
      })
    return () => {
      cancelled = true
      if (built) disposeObject(built)
    }
  }, [model.id, quality])

  // the idle turn rests while the view is off screen or the tab is hidden
  useEffect(() => {
    const element = frame.current
    let visible = true
    const update = () => {
      active.current = visible && document.visibilityState !== 'hidden'
      if (active.current) remote.redraw()
    }
    document.addEventListener('visibilitychange', update)
    let observer: IntersectionObserver | null = null
    if (element && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting)
        update()
      })
      observer.observe(element)
    }
    return () => {
      document.removeEventListener('visibilitychange', update)
      observer?.disconnect()
    }
  }, [remote])

  // the wheel zooms (a non-passive listener, so the page does not scroll while it does)
  useEffect(() => {
    const element = frame.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (orbit.zoomBy(event.deltaY < 0 ? 1.08 : 1 / 1.08)) {
        event.preventDefault()
        remote.redraw()
      }
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [orbit, remote])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // a finger on a point or a control stops the idle turn at once (the point stays put)
    if ((event.target as HTMLElement).closest('button')) {
      orbit.settle()
      return
    }
    orbit.down(event.pointerId, event.clientX, event.clientY, event.pointerType !== 'touch')
    remote.redraw()
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (orbit.move(event.pointerId, event.clientX, event.clientY)) remote.redraw()
  }
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    orbit.up(event.pointerId)
    remote.redraw()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    const turns: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_TURN, 0],
      ArrowRight: [KEY_TURN, 0],
      ArrowUp: [0, -KEY_TURN / 2],
      ArrowDown: [0, KEY_TURN / 2],
    }
    const turn = turns[event.key]
    if (turn) orbit.turn(turn[0], turn[1])
    else if (event.key === '+' || event.key === '=') orbit.zoomBy(KEY_ZOOM)
    else if (event.key === '-' || event.key === '_') orbit.zoomBy(1 / KEY_ZOOM)
    else return
    event.preventDefault()
    remote.redraw()
  }
  return (
    <div
      ref={frame}
      role="group"
      aria-label={t('explorer3d.keysHint')}
      tabIndex={0}
      data-testid="explorer-3d"
      data-ready={object ? 'true' : 'false'}
      // absolute: the canvas never props up its square frame, so it shrinks on a turn or resize
      className="absolute inset-0 touch-pan-y outline-none select-none focus-visible:ring-4 focus-visible:ring-primary"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      {object ? (
        <Canvas
          frameloop="demand"
          dpr={quality === 'low' ? [1, 1.5] : [1, 2]}
          camera={{ position: [0, 0, model.distance ?? 4], fov: 40, near: 0.1, far: 100 }}
          gl={{ antialias: quality === 'high', alpha: true, powerPreference: 'low-power' }}
          style={{ touchAction: 'pan-y' }}
          onCreated={({ gl }) => {
            gl.setClearColor(new THREE.Color(0x000000), 0)
            const canvas = gl.domElement
            canvas.style.touchAction = 'pan-y'
            canvas.setAttribute('role', 'img')
            canvas.setAttribute('aria-label', label)
            canvas.addEventListener('webglcontextlost', () => latest.current.onFail(), {
              once: true,
            })
          }}
        >
          <Scene
            object={object}
            orbit={orbit}
            distance={model.distance ?? 4}
            idle={!reducedMotion}
            active={active}
            hotspots={hotspots}
            anchors={anchors}
            remote={remote}
          />
        </Canvas>
      ) : (
        placeholder
      )}

      {object &&
        hotspots.map((spot, index) => {
          const name = tDynamic(t, spot.labelKey)
          return (
            <button
              key={spot.id}
              type="button"
              ref={(element) => {
                anchors.current[index] = element
              }}
              aria-label={t('explorer3d.hotspot', { number: index + 1, label: name })}
              aria-pressed={activeHotspot === spot.id}
              title={name}
              data-testid={`hotspot-${spot.id}`}
              onClick={() => {
                orbit.settle()
                remote.redraw()
                onHotspot?.(spot.id)
              }}
              style={{ visibility: 'hidden' }}
              className={clsx(
                'absolute top-0 left-0 flex size-12 items-center justify-center rounded-full border-4 border-white font-display text-xl font-extrabold shadow-press-sm transition-opacity',
                'data-[behind=true]:opacity-60 data-[offscreen=true]:pointer-events-none data-[offscreen=true]:opacity-40 focus-visible:ring-4 focus-visible:ring-ink',
                activeHotspot === spot.id ? 'bg-primary text-white' : 'bg-coin text-ink',
              )}
            >
              {index + 1}
            </button>
          )
        })}
    </div>
  )
}
