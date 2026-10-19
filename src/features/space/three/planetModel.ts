import * as THREE from 'three'
import type { BodyId } from '../content'
import {
  paintEarth,
  paintEarthClouds,
  paintGlow,
  paintJupiter,
  paintMars,
  paintMercury,
  paintMoon,
  paintNeptune,
  paintSaturn,
  paintSaturnRings,
  paintSun,
  paintUranus,
  paintUranusRings,
  paintVenus,
  type Painter,
} from './paint'

/*
 * Kiddo's own planet models (plain three.js, no React), used both by the
 * interactive viewer and by scripts/render-planets.mjs for the pictures.
 */

export interface PlanetModel {
  /** Add this to the scene. */
  root: THREE.Group
  /** Turn this one around its own axis (the tilt stays). */
  spinner: THREE.Object3D
  /** Clouds turn a little faster than the ground. */
  clouds?: THREE.Object3D
  /** How far the camera should be to see the whole object. */
  distance: number
  dispose: () => void
}

interface Spec {
  surface: Painter
  /** Lit by the scene (planets) or glowing on its own (the Sun). */
  glows?: boolean
  roughness?: number
  /** Axial tilt in radians (sideways, around z). */
  tilt?: number
  /** How much the pole leans toward the viewer (around x), so rings open up. */
  lean?: number
  /** Turned a little around the vertical (Uranus, so its ring is not edge-on). */
  turn?: number
  rings?: { painter: Painter; inner: number; outer: number; opacity: number }
  clouds?: Painter
  distance: number
}

const SPECS: Record<BodyId, Spec> = {
  sun: { surface: paintSun, glows: true, distance: 4.2 },
  mercury: { surface: paintMercury, roughness: 1, distance: 3.4 },
  venus: { surface: paintVenus, roughness: 0.9, distance: 3.4 },
  earth: {
    surface: paintEarth,
    roughness: 0.75,
    tilt: 0.41,
    clouds: paintEarthClouds,
    distance: 3.4,
  },
  moon: { surface: paintMoon, roughness: 1, distance: 3.4 },
  mars: { surface: paintMars, roughness: 0.95, tilt: 0.44, distance: 3.4 },
  jupiter: { surface: paintJupiter, roughness: 0.85, tilt: 0.05, distance: 3.4 },
  saturn: {
    surface: paintSaturn,
    roughness: 0.85,
    tilt: 0.35,
    lean: 0.42,
    rings: { painter: paintSaturnRings, inner: 1.25, outer: 2.25, opacity: 1 },
    distance: 6.2,
  },
  uranus: {
    surface: paintUranus,
    roughness: 0.8,
    // Uranus spins lying on its side
    tilt: 1.71,
    turn: 1.05,
    rings: { painter: paintUranusRings, inner: 1.45, outer: 1.85, opacity: 0.9 },
    distance: 5.7,
  },
  neptune: { surface: paintNeptune, roughness: 0.8, tilt: 0.49, distance: 3.4 },
}

function texture(painter: Painter, width: number, height: number) {
  const map = new THREE.CanvasTexture(painter(width, height))
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  return map
}

/** A flat ring whose texture runs from the inner edge to the outer edge. */
function ringGeometry(inner: number, outer: number) {
  const geometry = new THREE.RingGeometry(inner, outer, 128, 1)
  const position = geometry.attributes.position!
  const uv = geometry.attributes.uv!
  const point = new THREE.Vector3()
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i)
    uv.setXY(i, (point.length() - inner) / (outer - inner), 0.5)
  }
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

export function buildPlanet(id: BodyId, quality: 'high' | 'low' = 'high'): PlanetModel {
  const spec = SPECS[id]
  const size = quality === 'high' ? 1024 : 512
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const textures: THREE.Texture[] = []
  const track = <T extends THREE.Texture>(t: T) => (textures.push(t), t)

  const root = new THREE.Group()
  root.name = id
  const tilt = new THREE.Group()
  tilt.rotation.set(spec.lean ?? 0.2, spec.turn ?? 0, spec.tilt ?? 0, 'YXZ')
  root.add(tilt)

  const sphere = new THREE.SphereGeometry(1, 96, 64)
  geometries.push(sphere)
  const map = track(texture(spec.surface, size, size / 2))
  const material = spec.glows
    ? new THREE.MeshBasicMaterial({ map })
    : new THREE.MeshStandardMaterial({ map, roughness: spec.roughness ?? 0.9, metalness: 0 })
  materials.push(material)
  const spinner = new THREE.Mesh(sphere, material)
  tilt.add(spinner)

  let clouds: THREE.Mesh | undefined
  if (spec.clouds) {
    const cloudMap = track(texture(spec.clouds, size, size / 2))
    const cloudMaterial = new THREE.MeshStandardMaterial({
      map: cloudMap,
      transparent: true,
      depthWrite: false,
      roughness: 1,
    })
    materials.push(cloudMaterial)
    const cloudSphere = new THREE.SphereGeometry(1.025, 96, 64)
    geometries.push(cloudSphere)
    clouds = new THREE.Mesh(cloudSphere, cloudMaterial)
    tilt.add(clouds)
  }

  if (spec.rings) {
    const ringMap = track(texture(spec.rings.painter, 512, 8))
    const ringMaterial = new THREE.MeshStandardMaterial({
      map: ringMap,
      transparent: true,
      opacity: spec.rings.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 1,
    })
    materials.push(ringMaterial)
    const ring = ringGeometry(spec.rings.inner, spec.rings.outer)
    geometries.push(ring)
    tilt.add(new THREE.Mesh(ring, ringMaterial))
  }

  if (spec.glows) {
    // a soft halo around the Sun: it shines by itself
    const glowMap = track(new THREE.CanvasTexture(paintGlow(256, 256)))
    glowMap.colorSpace = THREE.SRGBColorSpace
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowMap,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    })
    materials.push(glowMaterial)
    const glow = new THREE.Sprite(glowMaterial)
    glow.scale.setScalar(3)
    glow.renderOrder = -1
    root.add(glow)
  }

  return {
    root,
    spinner,
    clouds,
    distance: spec.distance,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((m) => m.dispose())
      textures.forEach((t) => t.dispose())
    },
  }
}

/** The light of a scene showing one planet: a warm "sun" from the side, soft fill so no side is black. */
export function addLights(scene: THREE.Object3D) {
  const ambient = new THREE.AmbientLight(0xbfc8ff, 0.55)
  const key = new THREE.DirectionalLight(0xfff4e0, 2.6)
  key.position.set(-4, 2.5, 4)
  const rim = new THREE.DirectionalLight(0x9fb4ff, 0.6)
  rim.position.set(4, -1, -3)
  scene.add(ambient, key, rim)
  return [ambient, key, rim]
}
