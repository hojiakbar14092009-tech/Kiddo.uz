import { Billboard } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useInView } from '@/components/three/useInView'
import { prepareRenderer } from '@/components/three/prepareRenderer'
import { BACKDROPS, type BackdropLook } from '../backdrops'
import { AnimalActor } from './AnimalActor'
import type { Actor, SceneSpec } from '../content'
import {
  MOOD_FACE,
  particleAt,
  particleInto,
  poseAt,
  seededPoints,
  WEATHER_COLOURS,
  type Mood,
  type Weather,
} from './life'

/*
 * A small real 3D world for a tale scene: rounded low-poly ground, hills,
 * trees, sky and soft light. The characters are the Fluent Emoji 3D renders
 * (flat pictures) standing in it as billboards – they hop along the path and
 * the camera drifts gently for depth. Everything made here (geometries,
 * materials, textures, the renderer) is released when the scene closes.
 *
 * Since Phase 74 the same stage also plays the child's own stories: the hero
 * breathes, squashes and stretches, and shows how it feels (happy, curious,
 * surprised, joyful, sleepy) with a small face above its head; the place has its
 * weather (falling leaves, snow, bubbles, fireflies, confetti…), mountain peaks
 * and market stalls (life.ts holds the motion, tested on its own).
 */

/** A place's look on the 3D stage: the tales' looks, with the stories' extras. */
export interface StageLook extends BackdropLook {
  awnings?: boolean
  peaks?: string
}

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

/** An emoji drawn once into a texture (the hero's feeling above its head). */
function useFaceTexture(face: string | null) {
  const texture = useMemo(() => {
    if (!face || typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.arc(64, 64, 60, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = '84px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(face, 64, 70)
    const made = new THREE.CanvasTexture(canvas)
    made.colorSpace = THREE.SRGBColorSpace
    return made
  }, [face])
  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}

function ActorSprite({
  actor,
  texture,
  reducedMotion,
  mood,
}: {
  actor: Actor
  texture: THREE.Texture | undefined
  reducedMotion: boolean
  /** The hero's feeling (only the hopping hero has one). */
  mood?: Mood
}) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const bubble = useRef<THREE.Group>(null)
  const started = useRef<number | null>(null)
  const feeling = actor.hop && mood ? mood : undefined
  const face = useFaceTexture(feeling ? MOOD_FACE[feeling] : null)
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
    if (feeling && !walking) {
      const pose = poseAt(feeling, local)
      node.position.set(x + pose.shift, y + pose.lift * size, z)
      body.current?.scale.set(pose.sx, pose.sy, 1)
      if (body.current) body.current.rotation.z = pose.lean
      // the feeling pops up a moment after the page opens
      const pop = Math.min(1, Math.max(0, (local - 0.4) / 0.25))
      bubble.current?.scale.setScalar(pop * (1 + Math.sin(local * 3) * 0.04))
      return
    }
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
        {face && (
          <group
            ref={bubble}
            position={[size * 0.42, size * 1.08, 0.01]}
            scale={reducedMotion ? 1 : 0}
          >
            <mesh>
              <planeGeometry args={[size * 0.36, size * 0.36]} />
              <meshBasicMaterial map={face} transparent toneMapped={false} depthWrite={false} />
            </mesh>
          </group>
        )}
        <group ref={body}>
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
        </group>
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

/** Far snowy peaks behind the hills (the mountains). */
function Peaks({ colour }: { colour: string }) {
  return (
    <>
      {[
        [-4.5, -11, 4.2],
        [0.5, -12, 5.2],
        [5.5, -10.5, 3.8],
      ].map(([x, z, h], index) => (
        <group key={index} position={[x!, 0, z!]}>
          <mesh position={[0, h! / 2, 0]}>
            <coneGeometry args={[h! * 0.75, h!, 6]} />
            <meshStandardMaterial color={colour} flatShading roughness={1} />
          </mesh>
          <mesh position={[0, h! * 0.82, 0]}>
            <coneGeometry args={[h! * 0.75 * 0.36, h! * 0.36, 6]} />
            <meshStandardMaterial color="#FFFFFF" flatShading roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  )
}

/** Market stalls with striped roofs at the back (the bazaar). */
function Stalls() {
  return (
    <>
      {[
        [-3.6, -3.2, '#E8604C'],
        [0, -3.8, '#F5C04A'],
        [3.6, -3.2, '#4FAE8C'],
      ].map(([x, z, colour], index) => (
        <group key={index} position={[x as number, 0, z as number]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[1.8, 0.9, 0.8]} />
            <meshStandardMaterial color="#C99A62" roughness={1} />
          </mesh>
          <mesh position={[0, 1.75, 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[1.45, 0.6, 4]} />
            <meshStandardMaterial color={colour as string} flatShading roughness={0.9} />
          </mesh>
          {[-0.75, 0.75].map((side) => (
            <mesh key={side} position={[side, 0.95, 0.3]}>
              <cylinderGeometry args={[0.04, 0.04, 1.6, 6]} />
              <meshStandardMaterial color="#8A5A34" />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

/** A soft round dot for the particles. */
function useDotTexture() {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    glow.addColorStop(0, 'rgba(255,255,255,1)')
    glow.addColorStop(0.55, 'rgba(255,255,255,0.85)')
    glow.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(canvas)
  }, [])
  useEffect(() => () => texture?.dispose(), [texture])
  return texture
}

const PARTICLES = 70

/** The place's weather: leaves, snow, bubbles, fireflies, stars, dust or confetti. */
function Particles({ weather, reducedMotion }: { weather: Weather; reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const dot = useDotTexture()
  const starts = useMemo(() => seededPoints(PARTICLES, weather.length * 31), [weather])
  const { positions, colours } = useMemo(() => {
    const palette = WEATHER_COLOURS[weather].map((hex) => new THREE.Color(hex))
    const positions = new Float32Array(PARTICLES * 3)
    const colours = new Float32Array(PARTICLES * 3)
    starts.forEach((start, index) => {
      positions.set(particleAt(weather, start, index, 0), index * 3)
      const colour = palette[index % palette.length]!
      colours.set([colour.r, colour.g, colour.b], index * 3)
    })
    return { positions, colours }
  }, [starts, weather])
  const scratch = useMemo<[number, number, number]>(() => [0, 0, 0], [])
  useFrame(({ clock }) => {
    const node = points.current
    // stars stand still (only their light twinkles below)
    if (!node || reducedMotion) return
    if (weather === 'stars') {
      ;(node.material as THREE.PointsMaterial).opacity =
        0.65 + Math.sin(clock.elapsedTime * 2.2) * 0.3
      return
    }
    const t = clock.elapsedTime
    const attribute = node.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < starts.length; index += 1) {
      particleInto(scratch, weather, starts[index]!, index, t)
      attribute.setXYZ(index, scratch[0], scratch[1], scratch[2])
    }
    attribute.needsUpdate = true
    const material = node.material as THREE.PointsMaterial
    if (weather === 'fireflies') material.opacity = 0.65 + Math.sin(t * 2.2) * 0.3
  })
  const size = weather === 'confetti' || weather === 'leaves' || weather === 'petals' ? 0.16 : 0.12
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colours, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        map={dot ?? undefined}
        vertexColors
        transparent
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  )
}

function World({ look, reducedMotion }: { look: StageLook; reducedMotion: boolean }) {
  return (
    <>
      <color attach="background" args={[look.sky]} />
      <fog attach="fog" args={[look.skyLow, 10, 24]} />
      <hemisphereLight args={[look.skyLow, look.ground, look.stars ? 0.9 : 1.25]} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={look.stars ? 0.6 : 1.3}
        color={look.stars ? '#C9D6FF' : '#FFF4E0'}
      />
      {look.peaks && <Peaks colour={look.peaks} />}
      {look.awnings && <Stalls />}
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

function Actors({
  actors,
  sceneKey,
  reducedMotion,
  mood,
}: {
  actors: readonly Actor[]
  sceneKey: string
  reducedMotion: boolean
  mood?: Mood
}) {
  const assets = useMemo(() => [...new Set(actors.map((actor) => actor.asset))], [actors])
  const textures = useTextures(assets)
  return (
    <>
      {actors.map((actor, index) => {
        const sprite = (
          <ActorSprite
            key={`${sceneKey}-${index}`}
            actor={actor}
            texture={textures.get(actor.asset)}
            reducedMotion={reducedMotion}
            mood={mood}
          />
        )
        return actor.model ? (
          <AnimalActor
            key={`${sceneKey}-${index}-3d`}
            animal={actor.model}
            actor={actor}
            mood={actor.hop ? mood : undefined}
            reducedMotion={reducedMotion}
            fallback={sprite}
          />
        ) : (
          sprite
        )
      })}
    </>
  )
}

export interface Stage3DProps {
  look: StageLook
  actors: readonly Actor[]
  /** Changes when the page changes, so the characters start again. */
  sceneKey: string
  label: string
  reducedMotion: boolean
  onFail: () => void
  /** How the hero (the hopping character) feels on this page. */
  mood?: Mood
  /** The place's weather. */
  weather?: Weather
}

/** The 3D stage: a place, its characters, and (for the stories) feelings and weather. */
export function Stage3D({
  look,
  actors,
  sceneKey,
  label,
  reducedMotion,
  onFail,
  mood,
  weather,
}: Stage3DProps) {
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
          {weather && <Particles key={weather} weather={weather} reducedMotion={reducedMotion} />}
          <Actors actors={actors} sceneKey={sceneKey} reducedMotion={reducedMotion} mood={mood} />
          <CameraDrift reducedMotion={reducedMotion} />
          <ReleaseOnClose />
        </Canvas>
      </div>
    </SceneErrorBoundary>
  )
}

export default function TaleScene3D({
  scene,
  sceneKey,
  label,
  reducedMotion,
  onFail,
}: TaleScene3DProps) {
  return (
    <Stage3D
      look={BACKDROPS[scene.backdrop]}
      actors={scene.actors}
      sceneKey={sceneKey}
      label={label}
      reducedMotion={reducedMotion}
      onFail={onFail}
    />
  )
}
