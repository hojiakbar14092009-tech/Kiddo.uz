import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { acquire, release } from '@/features/mascot/characters/assets'
import { MascotController } from '@/features/mascot/characters/controller'
import type { Shown } from '@/features/mascot/characters/director'
import { LOOPING } from '@/features/mascot/characters/gestures'
import type { Actor } from '../content'
import { ANIMALS, animalModel, MOOD_PERFORMANCE, type AnimalId } from '../animals'
import type { Mood } from './life'

/*
 * A story animal as a real rigged 3D character on the stage (Phase 78): it walks
 * in on its own legs (the stage moves it, the clip moves the legs), turns to the
 * child, shows the page's feeling with its body and face, then rests. While the
 * model loads – or if it cannot – the flat picture stands in (`fallback`).
 */

const WALK_SECONDS = 2.4
/** The models are about 2.3 units tall; a character on the stage is about 1.15. */
const MODEL_SCALE = 0.5
const FACING = 0.25 // a little turned toward the middle of the stage

const ease = (t: number) => t * t * (3 - 2 * t)

export function AnimalActor({
  animal,
  actor,
  mood,
  reducedMotion,
  fallback,
}: {
  animal: AnimalId
  actor: Actor
  mood?: Mood
  reducedMotion: boolean
  fallback: ReactNode
}) {
  const [controller, setController] = useState<MascotController | null>(null)
  const [failed, setFailed] = useState(false)
  const group = useRef<THREE.Group>(null)
  const timeline = useRef({ t: 0, serial: 0, phase: 'start' as 'start' | 'walk' | 'mood' | 'rest' })

  useEffect(() => {
    let alive = true
    let made: MascotController | null = null
    const url = animalModel(animal)
    acquire(url).then(
      (gltf) => {
        if (!alive) return
        made = new MascotController(ANIMALS[animal], gltf, { seed: animal.length * 7919 + 13 })
        setController(made)
      },
      (error: unknown) => {
        if (!alive) return
        console.warn(`[stage] ${url} did not load`, error)
        setFailed(true)
      },
    )
    return () => {
      alive = false
      made?.dispose()
      release(url)
    }
  }, [animal])

  const scale = (actor.size ?? 1) * MODEL_SCALE
  const y = actor.y ?? 0
  const z = actor.z ?? 0
  const endX = actor.toX ?? actor.x
  const walks = actor.toX !== undefined && !reducedMotion
  const perform = MOOD_PERFORMANCE[mood ?? 'happy']

  useFrame((_, delta) => {
    const c = controller
    const node = group.current
    if (!c || !node) return
    const dt = Math.min(delta, 0.1)
    const line = timeline.current
    line.t += dt
    const play = (gesture: string, phase: typeof line.phase) => {
      line.serial += 1
      line.phase = phase
      line.t = 0
      const shown: Shown = { gesture, emotion: perform.emotion, priority: 0, serial: line.serial }
      c.show(shown, { reducedMotion, calm: false })
    }
    if (line.phase === 'start') play(walks ? 'walk' : perform.gesture, walks ? 'walk' : 'mood')
    let x = endX
    let turn = FACING * Math.sign(-endX || 1)
    if (line.phase === 'walk') {
      const progress = Math.min(1, line.t / WALK_SECONDS)
      x = actor.x + (endX - actor.x) * ease(progress)
      turn = (Math.PI / 2) * Math.sign(endX - actor.x)
      if (progress >= 1) play(perform.gesture, 'mood')
    } else if (line.phase === 'mood') {
      const ms = c.durationMs(perform.gesture)
      // a looping feeling (sleep) stays; a gesture plays once and then the animal rests
      if (!LOOPING.has(c.clipOf(perform.gesture)) && line.t * 1000 >= ms) play('idle', 'rest')
    }
    node.position.set(x, y, z)
    // turn smoothly toward where it goes (or back to the child)
    node.rotation.y += (turn - node.rotation.y) * Math.min(1, dt * 6)
    c.update(dt, { speaking: false, look: null, reducedMotion, calm: false })
  })

  if (failed) return <>{fallback}</>
  return (
    <>
      {!controller && fallback}
      {controller && (
        <group ref={group} position={[reducedMotion ? endX : actor.x, y, z]}>
          {y === 0 && (
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
              <circleGeometry args={[scale * 0.75, 24]} />
              <meshBasicMaterial color="#1F2A44" transparent opacity={0.16} depthWrite={false} />
            </mesh>
          )}
          <primitive object={controller.root} scale={scale} />
        </group>
      )}
    </>
  )
}
