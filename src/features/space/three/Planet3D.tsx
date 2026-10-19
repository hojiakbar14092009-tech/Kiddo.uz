import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import * as THREE from 'three'
import type { BodyId } from '../content'
import { addLights, buildPlanet, type PlanetModel } from './planetModel'

/** How far the planet is turned: by a finger, the arrow keys, or slowly by itself. */
class Turn {
  angle = 0
  velocity = 0
  pointer: number | null = null
  lastX = 0

  down(pointer: number, x: number) {
    this.pointer = pointer
    this.lastX = x
    this.velocity = 0
  }

  move(pointer: number, x: number) {
    if (this.pointer !== pointer) return
    const step = (x - this.lastX) * 0.012
    this.lastX = x
    this.angle += step
    this.velocity = step
  }

  up(pointer: number) {
    if (this.pointer === pointer) this.pointer = null
  }

  nudge(by: number) {
    this.velocity = 0
    this.angle += by
  }

  /** One frame: a flick keeps turning a little, then slows; a gentle idle turn unless motion is reduced. */
  step(dt: number, reducedMotion: boolean): number {
    if (this.pointer === null) {
      this.angle += this.velocity
      this.velocity *= reducedMotion ? 0.6 : 0.92
      if (!reducedMotion) this.angle += dt * 0.22
    }
    return this.angle
  }
}

export interface Planet3DProps {
  id: BodyId
  label: string
  reducedMotion: boolean
  onFail: () => void
}

/** The view starts turned the same way as the rendered pictures. */
const START_ANGLE = -0.5

function Scene({ id, turn, reducedMotion }: { id: BodyId; turn: Turn; reducedMotion: boolean }) {
  const { scene, camera } = useThree()
  const model = useMemo(() => buildPlanet(id, 'high'), [id])

  useEffect(() => {
    const lights = addLights(scene)
    return () => {
      lights.forEach((light) => {
        scene.remove(light)
        light.dispose()
      })
    }
  }, [scene])

  // the model is turned every frame through this ref
  const live = useRef<PlanetModel | null>(null)
  useEffect(() => {
    live.current = model
    camera.position.set(0, 0, model.distance)
    camera.lookAt(0, 0, 0)
    return () => {
      live.current = null
      model.dispose()
    }
  }, [camera, model])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const angle = turn.step(dt, reducedMotion)
    const current = live.current
    if (!current) return
    current.root.rotation.y = START_ANGLE + angle
    if (!reducedMotion) {
      current.spinner.rotation.y += dt * 0.12
      if (current.clouds) current.clouds.rotation.y += dt * 0.16
    }
  })

  return <primitive object={model.root} />
}

/**
 * A planet as a real 3D model: swipe sideways (or use the arrow keys) to turn
 * it. Vertical swipes still scroll the page (touch-action: pan-y).
 */
export default function Planet3D({ id, label, reducedMotion, onFail }: Planet3DProps) {
  const [turn] = useState(() => new Turn())

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) =>
    turn.down(event.pointerId, event.clientX)
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) =>
    turn.move(event.pointerId, event.clientX)
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => turn.up(event.pointerId)
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      turn.nudge(event.key === 'ArrowLeft' ? -0.35 : 0.35)
    }
  }

  return (
    <div
      role="img"
      aria-label={label}
      tabIndex={0}
      className="space-model size-full"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerEnd}
      onKeyDown={onKeyDown}
    >
      <Canvas
        flat
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ touchAction: 'pan-y' }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x000000), 0)
          gl.domElement.style.touchAction = 'pan-y'
          gl.domElement.addEventListener('webglcontextlost', onFail, { once: true })
        }}
      >
        <Scene id={id} turn={turn} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  )
}
