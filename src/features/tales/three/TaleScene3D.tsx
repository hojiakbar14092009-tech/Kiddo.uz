import { Billboard } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useInView } from '@/components/three/useInView'
import { prepareRenderer } from '@/components/three/prepareRenderer'
import { BACKDROPS, type BackdropLook } from '../backdrops'
import type { Actor, SceneSpec } from '../content'

/*
 * A small real 3D world for a tale scene: rounded low-poly ground, hills,
 * trees, sky and soft light. The characters are the Fluent Emoji 3D renders
 * (flat pictures) standing in it as billboards – they hop along the path and
 * the camera drifts gently for depth. Everything made here (geometries,
 * materials, textures, the renderer) is released when the scene closes.
 */

export interface TaleScene3DProps {
  scene: SceneSpec
  /** Changes when the scene changes, so the characters start walking again. */
  sceneKey: string
  label: string
  reducedMotion: boolean
  onFail: () => void
}

class SceneErrorBoundary extends Component<{ onError: () => void; children: ReactNode }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Loads each picture once for the life of the canvas and frees them all at the end. */
function useTextures(assets: readonly string[]) {
  const owned = useRef(new Map<string, THREE.Texture>())
  const [textures, setTextures] = useState<ReadonlyMap<string, THREE.Texture>>(() => new Map())
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let alive = true
    for (const asset of assets) {
      if (owned.current.has(asset)) continue
      const texture = loader.load(`/3d/${asset}.webp`, () => {
        if (!alive) return
        setTextures((current) => new Map(current).set(asset, texture))
        invalidate()
      })
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 4
      owned.current.set(asset, texture)
    }
    return () => {
      alive = false
    }
  }, [assets, invalidate])

  useEffect(() => {
    const all = owned.current
    return () => {
      all.forEach((texture) => texture.dispose())
      all.clear()
    }
  }, [])

  return textures
}

/** On close: free whatever is still in the scene and the renderer's lists. */
function ReleaseOnClose() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  useEffect(
    () => () => {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose()
        const material = mesh.material
        if (Array.isArray(material)) material.forEach((m) => m.dispose())
        else material?.dispose()
      })
      gl.renderLists.dispose()
      gl.dispose()
    },
    [gl, scene],
  )
  return null
}

const ease = (p: number) => 1 - Math.pow(1 - p, 3)
const WALK_SECONDS = 2.8

function ActorSprite({
  actor,
  texture,
  reducedMotion,
}: {
  actor: Actor
  texture: THREE.Texture | undefined
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const started = useRef<number | null>(null)
  const size = (actor.size ?? 1) * 1.25
  const y = actor.y ?? 0
  const z = actor.z ?? 0
  const endX = actor.toX ?? actor.x
  const startX = reducedMotion ? endX : actor.x

  useFrame(({ clock }) => {
    const node = group.current
    if (!node || reducedMotion) return
    const now = clock.elapsedTime
    if (started.current === null) started.current = now
    const local = now - started.current
    const progress = actor.toX === undefined ? 1 : Math.min(1, local / WALK_SECONDS)
    const walking = progress < 1
    const x = actor.x + (endX - actor.x) * ease(progress)
    const bounce = walking
      ? Math.abs(Math.sin(local * 7)) * 0.2
      : actor.hop
        ? Math.abs(Math.sin(local * 3)) * 0.14
        : Math.sin(local * 1.6) * 0.015
    node.position.set(x, y + bounce * size, z)
  })

  return (
    <group ref={group} position={[startX, y, z]}>
      {y === 0 && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
          <circleGeometry args={[size * 0.3, 24]} />
          <meshBasicMaterial color="#1F2A44" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
      <Billboard lockX lockZ>
        <mesh position={[0, size / 2, 0]}>
          <planeGeometry args={[size, size]} />
          {/* a new material once the picture has loaded (a compiled material would not pick up a new map) */}
          {texture ? (
            <meshBasicMaterial
              key={texture.uuid}
              map={texture}
              transparent
              alphaTest={0.08}
              toneMapped={false}
            />
          ) : (
            <meshBasicMaterial key="empty" transparent opacity={0} />
          )}
        </mesh>
      </Billboard>
    </group>
  )
}

function Tree({
  position,
  scale,
  look,
}: {
  position: [number, number, number]
  scale: number
  look: BackdropLook
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1, 7]} />
        <meshStandardMaterial color="#9A6B47" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 1.35, 0]}>
        <icosahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial color={look.leaf} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0.35, 1.05, 0.2]}>
        <icosahedronGeometry args={[0.45, 1]} />
        <meshStandardMaterial color={look.leaf} flatShading roughness={0.9} />
      </mesh>
    </group>
  )
}

function Cloud({
  x,
  y,
  z,
  reducedMotion,
}: {
  x: number
  y: number
  z: number
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.position.x = x + Math.sin(clock.elapsedTime * 0.08 + x) * 1.2
  })
  return (
    <group ref={group} position={[x, y, z]}>
      {[
        [0, 0, 0, 0.7],
        [0.7, -0.1, 0, 0.55],
        [-0.7, -0.12, 0, 0.5],
        [0.25, 0.3, 0, 0.5],
      ].map(([cx, cy, cz, r], index) => (
        <mesh key={index} position={[cx!, cy!, cz!]}>
          <icosahedronGeometry args={[r!, 1]} />
          <meshStandardMaterial color="#FFFFFF" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

const TREE_SPOTS: [number, number, number][] = [
  [-3.9, 0, -2.6],
  [4, 0, -3.2],
  [-2.2, 0, -5],
]
const STAR_SPOTS: [number, number, number][] = [
  [-4, 4.2, -9],
  [-1.5, 5, -9],
  [1.2, 4.4, -9],
  [3.6, 5.2, -9],
  [5.2, 3.8, -9],
  [-5.4, 3.6, -9],
]

function World({ look, reducedMotion }: { look: BackdropLook; reducedMotion: boolean }) {
  return (
    <>
      <color attach="background" args={[look.sky]} />
      <fog attach="fog" args={[look.skyLow, 10, 24]} />
      <hemisphereLight args={[look.skyLow, look.ground, look.stars ? 0.9 : 1.25]} />
      <directionalLight position={[3, 6, 4]} intensity={look.stars ? 0.6 : 1.3} />
      {/* ground and a sandy path the characters walk along */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color={look.ground} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, 0.45]} scale={[5.2, 0.75, 1]}>
        <circleGeometry args={[1, 40]} />
        <meshStandardMaterial color={look.path} roughness={1} />
      </mesh>
      {look.water && (
        <mesh rotation-x={-Math.PI / 2} position={[1.3, 0.008, -1.1]} scale={[2.3, 1.1, 1]}>
          <circleGeometry args={[1, 40]} />
          <meshStandardMaterial color="#6EC6F0" roughness={0.3} />
        </mesh>
      )}
      {/* soft rounded hills */}
      {[
        [-5, -8, 4.2],
        [1, -9, 5],
        [6.5, -7.5, 3.8],
      ].map(([x, z, r], index) => (
        <mesh key={index} position={[x!, -r! * 0.55, z!]} scale={[1.4, 1, 1]}>
          <icosahedronGeometry args={[r!, 2]} />
          <meshStandardMaterial color={look.hill} flatShading roughness={1} />
        </mesh>
      ))}
      {TREE_SPOTS.slice(0, look.trees).map((spot, index) => (
        <Tree key={index} position={spot} scale={1.1 - index * 0.1} look={look} />
      ))}
      {look.stars
        ? STAR_SPOTS.map((spot, index) => (
            <mesh key={index} position={spot}>
              <octahedronGeometry args={[0.09, 0]} />
              <meshBasicMaterial color="#FFF3B0" />
            </mesh>
          ))
        : [
            [-3.4, 4, -8],
            [3.2, 4.6, -9],
          ].map(([x, y, z], index) => (
            <Cloud key={index} x={x!} y={y!} z={z!} reducedMotion={reducedMotion} />
          ))}
    </>
  )
}

/** A slow sway of the camera (and a little follow of the finger) for depth. */
function CameraDrift({ reducedMotion }: { reducedMotion: boolean }) {
  const get = useThree((state) => state.get)
  useEffect(() => {
    const { camera, invalidate } = get()
    camera.lookAt(0, 0.9, 0)
    invalidate()
  }, [get])
  useFrame(({ clock, pointer, camera }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime
    camera.position.x = Math.sin(t * 0.22) * 0.35 + pointer.x * 0.25
    camera.position.y = 1.7 + Math.sin(t * 0.17) * 0.07 + pointer.y * 0.1
    camera.lookAt(0, 0.9, 0)
  })
  return null
}

function Actors({ scene, sceneKey, reducedMotion }: Omit<TaleScene3DProps, 'label' | 'onFail'>) {
  const assets = useMemo(() => [...new Set(scene.actors.map((actor) => actor.asset))], [scene])
  const textures = useTextures(assets)
  return (
    <>
      {scene.actors.map((actor, index) => (
        <ActorSprite
          key={`${sceneKey}-${index}`}
          actor={actor}
          texture={textures.get(actor.asset)}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  )
}

export default function TaleScene3D({
  scene,
  sceneKey,
  label,
  reducedMotion,
  onFail,
}: TaleScene3DProps) {
  const look = BACKDROPS[scene.backdrop]
  const frame = useRef<HTMLDivElement>(null)
  const inView = useInView(frame)
  return (
    <SceneErrorBoundary onError={onFail}>
      <div ref={frame} role="img" aria-label={label} className="size-full">
        <Canvas
          dpr={[1, 1.75]}
          frameloop={!inView ? 'never' : reducedMotion ? 'demand' : 'always'}
          camera={{ position: [0, 1.7, 6.4], fov: 42 }}
          gl={{ antialias: true, powerPreference: 'low-power' }}
          onCreated={({ gl }) => {
            prepareRenderer(gl)
            gl.domElement.addEventListener('webglcontextlost', onFail, { once: true })
          }}
        >
          <World look={look} reducedMotion={reducedMotion} />
          <Actors scene={scene} sceneKey={sceneKey} reducedMotion={reducedMotion} />
          <CameraDrift reducedMotion={reducedMotion} />
          <ReleaseOnClose />
        </Canvas>
      </div>
    </SceneErrorBoundary>
  )
}
