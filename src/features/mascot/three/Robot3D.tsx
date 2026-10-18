import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import type { MascotModel } from '@/store/familyStore'
import type { Wearing } from '@/features/shop/outfits'
import type { MascotMood } from '../types'
import { RobotModel } from './RobotModel'

export interface Robot3DProps {
  model: MascotModel
  mood: MascotMood
  reactionKey: number
  followPointer: boolean
  reducedMotion: boolean
  wearing?: Wearing
  label?: string
  className?: string
  /** Called when WebGL breaks (e.g. the context is lost), to switch to the 2D robot. */
  onFail: () => void
}

/**
 * The 3D robot on its own transparent canvas. Rendering pauses while the
 * robot is off screen, to save battery on tablets and phones.
 */
export default function Robot3D({
  model,
  mood,
  reactionKey,
  followPointer,
  reducedMotion,
  wearing,
  label,
  className,
  onFail,
}: Robot3DProps) {
  const container = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(true)

  useEffect(() => {
    const element = container.current
    if (!element || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) =>
      setOnScreen(entry?.isIntersecting ?? true),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={container}
      className={clsx('relative aspect-[5/6]', className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <Canvas
        frameloop={onScreen ? 'always' : 'never'}
        dpr={[1, 2]}
        camera={{ position: [0, 1.45, 5.8], fov: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        onCreated={({ gl, camera }) => {
          camera.lookAt(0, 1.35, 0)
          gl.domElement.addEventListener('webglcontextlost', onFail, { once: true })
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <hemisphereLight args={['#FFFAF0', '#D8CFE6', 1.1]} />
        <directionalLight position={[3, 5, 4]} intensity={1.7} />
        <directionalLight position={[-4, 3, -3]} intensity={0.8} color="#DDEEFC" />
        {/* Soft studio reflections generated locally, so it also works offline */}
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={2} position={[0, 3, 4]} scale={[6, 2, 1]} />
          <Lightformer intensity={1} position={[-4, 1, 2]} scale={[2, 4, 1]} color="#FFF0C2" />
          <Lightformer intensity={1} position={[4, 1, 2]} scale={[2, 4, 1]} color="#DDEEFC" />
        </Environment>

        <RobotModel
          model={model}
          mood={mood}
          reactionKey={reactionKey}
          followPointer={followPointer}
          reducedMotion={reducedMotion}
          wearing={wearing}
        />
        <ContactShadows
          position={[0, 0.001, 0]}
          opacity={0.32}
          scale={3}
          blur={2.6}
          far={1.6}
          color="#3A2E4D"
        />
      </Canvas>
    </div>
  )
}
