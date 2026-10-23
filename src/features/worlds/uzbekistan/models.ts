import * as THREE from 'three'
import type { ExplorerQuality } from '@/components/explorer3d/types'
import type { LandmarkId } from './content'

/*
 * Low-poly models of "My Uzbekistan", built from three.js primitives (no
 * downloads). Loaded only when a 3D view opens (explorerModels.ts imports this
 * module lazily). Every builder returns a fresh Object3D centred on the origin;
 * hotspot positions in content.ts use the same space.
 */

type Builder = (quality: ExplorerQuality) => THREE.Object3D

const COLORS = {
  brick: 0xd8b07a,
  brickLight: 0xe6c592,
  brickDark: 0xb98a55,
  sand: 0xefdcb2,
  paving: 0xdcc390,
  turquoise: 0x2bb3ae,
  blue: 0x2f64b0,
  deepBlue: 0x1f4c8f,
  cream: 0xf6efdf,
  wood: 0x8a5a2b,
  felt: 0xf3ead8,
  red: 0xc8443a,
  gold: 0xf2b84b,
  clay: 0xd9a873,
  soot: 0x3b2418,
  grass: 0x9ccf6b,
  black: 0x23202a,
  white: 0xfaf7f0,
  bread: 0xd38b3a,
  breadLight: 0xf0c27a,
} as const

function segments(quality: ExplorerQuality, high: number, low: number) {
  return quality === 'high' ? high : low
}

/** One material per colour and model, so a model can be disposed as a whole. */
function palette() {
  const cache = new Map<number, THREE.MeshStandardMaterial>()
  return (color: number, side: THREE.Side = THREE.FrontSide) => {
    const key = color * 4 + side
    let material = cache.get(key)
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        metalness: 0,
        flatShading: true,
        side,
      })
      cache.set(key, material)
    }
    return material
  }
}

function add(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: readonly [number, number, number],
  rotation?: readonly [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  if (rotation) mesh.rotation.set(...rotation)
  parent.add(mesh)
  return mesh
}

/** Upper half of a sphere: a dome. */
function domeGeometry(radius: number, seg: number) {
  return new THREE.SphereGeometry(radius, seg, Math.max(4, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2)
}

// ------------------------------------------------------------------ Registon

function madrasa(quality: ExplorerQuality, m: ReturnType<typeof palette>, domes: 1 | 2) {
  const seg = segments(quality, 20, 10)
  const group = new THREE.Group()
  // the body with a band of blue tiles under the roof line
  add(group, new THREE.BoxGeometry(2, 0.7, 0.7), m(COLORS.brick), [0, 0.35, 0])
  add(group, new THREE.BoxGeometry(2.02, 0.07, 0.72), m(COLORS.blue), [0, 0.66, 0])
  // the tall entrance (peshtoq) with a deep-blue arch
  add(group, new THREE.BoxGeometry(0.82, 1.15, 0.22), m(COLORS.brickLight), [0, 0.575, 0.4])
  add(group, new THREE.BoxGeometry(0.86, 0.09, 0.24), m(COLORS.turquoise), [0, 1.14, 0.4])
  add(group, new THREE.BoxGeometry(0.46, 0.72, 0.04), m(COLORS.deepBlue), [0, 0.4, 0.52])
  add(group, new THREE.CircleGeometry(0.23, seg, 0, Math.PI), m(COLORS.deepBlue), [0, 0.76, 0.521])
  // two slim minarets at the front corners
  for (const x of [-0.95, 0.95]) {
    add(group, new THREE.CylinderGeometry(0.08, 0.11, 1.45, seg), m(COLORS.brickLight), [
      x,
      0.725,
      0.3,
    ])
    add(group, new THREE.CylinderGeometry(0.105, 0.105, 0.08, seg), m(COLORS.turquoise), [
      x,
      1.0,
      0.3,
    ])
    add(group, new THREE.CylinderGeometry(0.13, 0.12, 0.06, seg), m(COLORS.brickDark), [
      x,
      1.47,
      0.3,
    ])
    add(group, domeGeometry(0.09, seg), m(COLORS.turquoise), [x, 1.5, 0.3])
  }
  // turquoise domes on drums behind the entrance
  const xs = domes === 1 ? [0] : [-0.55, 0.55]
  for (const x of xs) {
    add(group, new THREE.CylinderGeometry(0.3, 0.3, 0.18, seg), m(COLORS.blue), [x, 0.79, -0.1])
    add(group, domeGeometry(0.3, seg), m(COLORS.turquoise), [x, 0.88, -0.1])
  }
  return group
}

export const buildRegistan: Builder = (quality) => {
  const m = palette()
  const root = new THREE.Group()
  const scene = new THREE.Group()
  scene.position.y = -0.7
  root.add(scene)
  add(scene, new THREE.BoxGeometry(3.9, 0.08, 3.5), m(COLORS.sand), [0, -0.04, 0])
  add(scene, new THREE.BoxGeometry(1.7, 0.01, 1.7), m(COLORS.paving), [0, 0.005, 0.15])
  const back = madrasa(quality, m, 1)
  back.position.set(0, 0, -1.35)
  const left = madrasa(quality, m, 2)
  left.position.set(-1.45, 0, 0.15)
  left.rotation.y = Math.PI / 2
  const right = madrasa(quality, m, 2)
  right.position.set(1.45, 0, 0.15)
  right.rotation.y = -Math.PI / 2
  scene.add(back, left, right)
  return root
}

// --------------------------------------------------------------- Kalta Minor

export const buildKaltaMinor: Builder = (quality) => {
  const m = palette()
  const seg = segments(quality, 28, 12)
  const root = new THREE.Group()
  const scene = new THREE.Group()
  scene.position.y = -1.6
  root.add(scene)
  add(scene, new THREE.CylinderGeometry(1.8, 1.8, 0.06, seg), m(COLORS.sand), [0, -0.03, 0])
  add(scene, new THREE.CylinderGeometry(1.12, 1.18, 0.25, seg), m(COLORS.brickDark), [0, 0.125, 0])
  // the body: wide at the bottom, a little narrower at the top, in tiled bands
  const bands = [
    COLORS.turquoise,
    COLORS.blue,
    COLORS.cream,
    COLORS.turquoise,
    COLORS.blue,
    COLORS.turquoise,
    COLORS.cream,
    COLORS.turquoise,
  ]
  const bottom = 0.25
  const height = 3.0
  const radiusAt = (y: number) => 1.05 - 0.23 * ((y - bottom) / height)
  const step = height / bands.length
  bands.forEach((color, index) => {
    const y0 = bottom + index * step
    const y1 = y0 + step
    add(scene, new THREE.CylinderGeometry(radiusAt(y1), radiusAt(y0), step, seg), m(color), [
      0,
      (y0 + y1) / 2,
      0,
    ])
  })
  // thin white lines between the bands: the tile pattern
  for (let index = 1; index < bands.length; index += 2) {
    const y = bottom + index * step
    add(
      scene,
      new THREE.TorusGeometry(radiusAt(y) + 0.01, 0.025, 4, seg),
      m(COLORS.white),
      [0, y, 0],
      [Math.PI / 2, 0, 0],
    )
  }
  // the unfinished, flat top
  const top = bottom + height
  add(
    scene,
    new THREE.TorusGeometry(radiusAt(top) - 0.04, 0.06, 6, seg),
    m(COLORS.brick),
    [0, top, 0],
    [Math.PI / 2, 0, 0],
  )
  add(
    scene,
    new THREE.CylinderGeometry(radiusAt(top) - 0.06, radiusAt(top) - 0.06, 0.04, seg),
    m(COLORS.brickDark),
    [0, top, 0],
  )
  // a small door
  add(scene, new THREE.BoxGeometry(0.32, 0.5, 0.1), m(COLORS.wood), [0, 0.5, radiusAt(0.5) - 0.02])
  return root
}

// ----------------------------------------------------------------------- Ark

export const buildArk: Builder = (quality) => {
  const m = palette()
  const seg = segments(quality, 18, 9)
  const root = new THREE.Group()
  const scene = new THREE.Group()
  scene.position.y = -0.55
  root.add(scene)
  add(scene, new THREE.BoxGeometry(3.9, 0.06, 3.4), m(COLORS.sand), [0, -0.03, 0.3])
  // the sloping walls: a four-sided frustum, wider than deep
  const wallShape = new THREE.CylinderGeometry(1.5, 1.75, 1.0, 4).rotateY(Math.PI / 4)
  const walls = add(scene, wallShape, m(COLORS.brick), [0, 0.5, 0])
  walls.scale.set(1.4, 1, 1)
  // battlements along the front and the sides
  const merlon = new THREE.BoxGeometry(0.14, 0.14, 0.14)
  for (let x = -1.35; x <= 1.36; x += 0.3) {
    if (Math.abs(x) < 0.7) continue
    add(scene, merlon, m(COLORS.brickDark), [x, 1.07, 1.02])
  }
  for (let z = -0.9; z <= 0.91; z += 0.3) {
    add(scene, merlon, m(COLORS.brickDark), [-1.42, 1.07, z])
    add(scene, merlon, m(COLORS.brickDark), [1.42, 1.07, z])
  }
  // the gate between two round towers, with a wooden gallery above it
  for (const x of [-0.45, 0.45]) {
    add(scene, new THREE.CylinderGeometry(0.27, 0.34, 1.35, seg), m(COLORS.brickLight), [
      x,
      0.675,
      1.28,
    ])
    add(scene, new THREE.CylinderGeometry(0.31, 0.29, 0.1, seg), m(COLORS.brickDark), [
      x,
      1.38,
      1.28,
    ])
  }
  add(scene, new THREE.BoxGeometry(0.62, 1.15, 0.4), m(COLORS.brick), [0, 0.575, 1.28])
  add(scene, new THREE.BoxGeometry(0.64, 0.16, 0.44), m(COLORS.wood), [0, 1.0, 1.3])
  add(scene, new THREE.BoxGeometry(0.64, 0.05, 0.46), m(COLORS.turquoise), [0, 1.1, 1.3])
  add(scene, new THREE.BoxGeometry(0.3, 0.48, 0.05), m(COLORS.soot), [0, 0.3, 1.49])
  // the ramp up to the gate
  add(
    scene,
    new THREE.BoxGeometry(0.42, 0.06, 0.7),
    m(COLORS.brickDark),
    [0, 0.12, 1.78],
    [0.3, 0, 0],
  )
  return root
}

// ---------------------------------------------------------------------- yurt

export const buildYurt: Builder = (quality) => {
  const m = palette()
  const seg = segments(quality, 28, 12)
  const root = new THREE.Group()
  const scene = new THREE.Group()
  scene.position.y = -0.8
  root.add(scene)
  add(scene, new THREE.CylinderGeometry(1.75, 1.75, 0.06, seg), m(COLORS.grass), [0, -0.03, 0])
  // felt walls with a red and a gold band
  add(scene, new THREE.CylinderGeometry(1.2, 1.2, 0.9, seg), m(COLORS.felt), [0, 0.45, 0])
  add(scene, new THREE.CylinderGeometry(1.215, 1.215, 0.12, seg), m(COLORS.red), [0, 0.74, 0])
  add(scene, new THREE.CylinderGeometry(1.218, 1.218, 0.04, seg), m(COLORS.gold), [0, 0.66, 0])
  // the roof and the ropes over it
  add(scene, new THREE.CylinderGeometry(0.27, 1.3, 0.75, seg), m(COLORS.felt), [0, 1.275, 0])
  const ropes = 8
  for (let index = 0; index < ropes; index += 1) {
    const angle = (index / ropes) * Math.PI * 2
    const rope = new THREE.Group()
    rope.rotation.y = angle
    // along the roof slope (0.75 up over 1.03 in), just outside its surface
    add(rope, new THREE.BoxGeometry(0.04, 0.03, 1.27), m(COLORS.wood), [0, 1.3, 0.8], [0.63, 0, 0])
    scene.add(rope)
  }
  // the round opening at the top
  add(
    scene,
    new THREE.TorusGeometry(0.25, 0.05, 6, seg),
    m(COLORS.wood),
    [0, 1.66, 0],
    [Math.PI / 2, 0, 0],
  )
  add(
    scene,
    new THREE.CircleGeometry(0.22, seg),
    m(COLORS.soot, THREE.DoubleSide),
    [0, 1.645, 0],
    [-Math.PI / 2, 0, 0],
  )
  // the door
  add(scene, new THREE.BoxGeometry(0.52, 0.72, 0.06), m(COLORS.wood), [0, 0.36, 1.19])
  add(scene, new THREE.BoxGeometry(0.42, 0.62, 0.07), m(COLORS.red), [0, 0.34, 1.2])
  add(
    scene,
    new THREE.BoxGeometry(0.1, 0.1, 0.08),
    m(COLORS.gold),
    [0, 0.42, 1.21],
    [0, 0, Math.PI / 4],
  )
  return root
}

// --------------------------------------------------------------------- doppi

function pepper(m: ReturnType<typeof palette>, quality: ExplorerQuality) {
  const seg = segments(quality, 12, 6)
  const group = new THREE.Group()
  // a white "qalampir": a curved drop with a little curl at the tip
  const body = add(group, new THREE.SphereGeometry(0.1, seg, seg), m(COLORS.white), [0, 0, 0])
  body.scale.set(0.8, 2, 0.25)
  const tip = add(group, new THREE.SphereGeometry(0.05, seg, seg), m(COLORS.white), [0.06, 0.25, 0])
  tip.scale.set(1, 1.6, 0.4)
  tip.rotation.z = -0.7
  const curl = add(
    group,
    new THREE.TorusGeometry(0.05, 0.016, 4, seg, Math.PI * 1.3),
    m(COLORS.white),
    [0.1, 0.32, 0],
  )
  curl.rotation.z = 0.4
  return group
}

export const buildDoppi: Builder = (quality) => {
  const m = palette()
  const root = new THREE.Group()
  const scene = new THREE.Group()
  scene.position.y = -0.5
  root.add(scene)
  // four flat sides: a four-segment cylinder turned so the sides face front, back, left and right
  const body = add(
    scene,
    new THREE.CylinderGeometry(1.0, 1.06, 0.75, 4),
    m(COLORS.black),
    [0, 0.375, 0],
  )
  body.rotation.y = Math.PI / 4
  const crown = add(
    scene,
    new THREE.CylinderGeometry(0.62, 1.0, 0.22, 4),
    m(COLORS.black),
    [0, 0.86, 0],
  )
  crown.rotation.y = Math.PI / 4
  // the edge band with a thin white line
  const edge = add(
    scene,
    new THREE.CylinderGeometry(1.08, 1.08, 0.12, 4),
    m(0x3d3546),
    [0, 0.06, 0],
  )
  edge.rotation.y = Math.PI / 4
  const line = add(
    scene,
    new THREE.CylinderGeometry(1.085, 1.085, 0.02, 4),
    m(COLORS.white),
    [0, 0.13, 0],
  )
  line.rotation.y = Math.PI / 4
  // one pepper pattern on each side, and white seams along the corners
  for (let side = 0; side < 4; side += 1) {
    const holder = new THREE.Group()
    holder.rotation.y = (side * Math.PI) / 2
    const motif = pepper(m, quality)
    motif.position.set(0, 0.42, 0.745)
    motif.rotation.z = 0.35
    holder.add(motif)
    const seam = add(
      holder,
      new THREE.BoxGeometry(0.025, 0.62, 0.025),
      m(COLORS.white),
      [0.735, 0.44, 0.735],
    )
    seam.rotation.y = Math.PI / 4
    scene.add(holder)
  }
  return root
}

// -------------------------------------------------------------------- tandir

function nonBread(m: ReturnType<typeof palette>, quality: ExplorerQuality) {
  const seg = segments(quality, 24, 10)
  const group = new THREE.Group()
  add(group, new THREE.CylinderGeometry(0.33, 0.35, 0.07, seg), m(COLORS.bread), [0, 0, 0])
  add(
    group,
    new THREE.TorusGeometry(0.27, 0.05, 6, seg),
    m(COLORS.bread),
    [0, 0.04, 0],
    [Math.PI / 2, 0, 0],
  )
  add(group, new THREE.CylinderGeometry(0.2, 0.2, 0.072, seg), m(COLORS.breadLight), [0, 0.005, 0])
  // the chekich stamp: a ring of dots in the middle
  const dot = new THREE.SphereGeometry(0.018, 6, 4)
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2
    add(group, dot, m(COLORS.wood), [Math.cos(angle) * 0.11, 0.045, Math.sin(angle) * 0.11])
  }
  add(group, dot, m(COLORS.wood), [0, 0.045, 0])
  return group
}

export const buildTandir: Builder = (quality) => {
  const m = palette()
  const seg = segments(quality, 28, 12)
  const root = new THREE.Group()
  const scene = new THREE.Group()
  scene.position.y = -0.75
  root.add(scene)
  // a raised brick platform
  add(scene, new THREE.BoxGeometry(2.2, 0.5, 1.8), m(COLORS.brickDark), [0, 0.25, 0])
  add(scene, new THREE.BoxGeometry(2.24, 0.05, 1.84), m(COLORS.brick), [0, 0.5, 0])
  // the clay dome, open at the top
  const open = 0.45
  const dome = add(
    scene,
    new THREE.SphereGeometry(
      0.85,
      seg,
      Math.max(6, seg / 2),
      0,
      Math.PI * 2,
      open,
      Math.PI / 2 - open + 0.35,
    ),
    m(COLORS.clay, THREE.DoubleSide),
    [0, 0.72, -0.1],
  )
  dome.scale.set(1, 0.9, 1)
  const rimY = 0.72 + 0.85 * Math.cos(open) * 0.9
  const rimR = 0.85 * Math.sin(open)
  add(
    scene,
    new THREE.TorusGeometry(rimR, 0.07, 6, seg),
    m(COLORS.clay),
    [0, rimY, -0.1],
    [Math.PI / 2, 0, 0],
  )
  add(
    scene,
    new THREE.CircleGeometry(rimR, seg),
    m(COLORS.soot, THREE.DoubleSide),
    [0, rimY - 0.05, -0.1],
    [-Math.PI / 2, 0, 0],
  )
  // two fresh non breads in front
  const left = nonBread(m, quality)
  left.position.set(-0.6, 0.56, 0.55)
  const right = nonBread(m, quality)
  right.position.set(0.55, 0.56, 0.5)
  right.rotation.y = 0.6
  scene.add(left, right)
  return root
}

export const BUILDERS: Readonly<Record<LandmarkId, Builder>> = {
  registan: buildRegistan,
  'kalta-minor': buildKaltaMinor,
  ark: buildArk,
  yurt: buildYurt,
  doppi: buildDoppi,
  tandir: buildTandir,
}
