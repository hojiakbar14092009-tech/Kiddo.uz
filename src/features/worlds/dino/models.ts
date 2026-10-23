import * as THREE from 'three'
import type { ExplorerQuality } from '@/components/explorer3d'
import type { DinoId } from './content'

/*
 * Low-poly dinosaurs built from three.js primitives (flat-shaded spheres,
 * cylinders and cones). Loaded only with the 3D view and by the still
 * renderer. Coordinates: the head points to +x, up is +y; every model is
 * centred and scaled to the same size at the end, and the hotspot positions
 * in content.ts use the same raw coordinates (they move with the model).
 */

type V3 = readonly [number, number, number]

const SIZE = 3.4

class Kit {
  readonly root = new THREE.Group()
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>()
  private readonly quality: ExplorerQuality

  constructor(quality: ExplorerQuality) {
    this.quality = quality
  }

  get seg(): number {
    return this.quality === 'high' ? 14 : 8
  }

  mat(color: number, side: THREE.Side = THREE.FrontSide): THREE.MeshStandardMaterial {
    const key = `${color}-${side}`
    let material = this.materials.get(key)
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        flatShading: true,
        roughness: 0.85,
        metalness: 0,
        side,
      })
      this.materials.set(key, material)
    }
    return material
  }

  add(mesh: THREE.Object3D): THREE.Object3D {
    this.root.add(mesh)
    return mesh
  }

  /** A squashed sphere. */
  blob(at: V3, radii: V3, color: number, rotZ = 0): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(1, this.seg, Math.max(6, Math.round(this.seg * 0.7)))
    const mesh = new THREE.Mesh(geometry, this.mat(color))
    mesh.position.set(...at)
    mesh.scale.set(...radii)
    mesh.rotation.z = rotZ
    this.add(mesh)
    return mesh
  }

  /** A tapered cylinder (or a cone when `r2` is 0) from `a` to `b`. */
  limb(a: V3, b: V3, r1: number, r2: number, color: number, sides = this.seg): THREE.Mesh {
    const from = new THREE.Vector3(...a)
    const to = new THREE.Vector3(...b)
    const direction = to.clone().sub(from)
    const length = direction.length()
    const geometry =
      r2 <= 0
        ? new THREE.ConeGeometry(r1, length, sides)
        : new THREE.CylinderGeometry(r2, r1, length, sides)
    const mesh = new THREE.Mesh(geometry, this.mat(color))
    mesh.position.copy(from).add(to).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    this.add(mesh)
    return mesh
  }

  /** A pair of eyes on both sides of a head. */
  eyes(at: V3, spread: number, size = 0.07): void {
    for (const side of [-1, 1]) {
      this.blob([at[0], at[1], at[2] + side * spread], [size, size, size], 0xffffff)
      this.blob(
        [at[0] + size * 0.35, at[1], at[2] + side * (spread + size * 0.55)],
        [size * 0.55, size * 0.55, size * 0.55],
        0x1d1d2b,
      )
    }
  }

  /** A flat diamond plate standing up on a back (thin across the body). */
  plate(at: V3, height: number, color: number, tilt = 0): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(height * 0.45, height, 4)
    const mesh = new THREE.Mesh(geometry, this.mat(color))
    mesh.position.set(at[0], at[1] + height * 0.42, at[2])
    mesh.scale.set(1, 1, 0.22)
    mesh.rotation.z = tilt
    this.add(mesh)
    return mesh
  }

  /**
   * Centres the model and scales it so its longest side is SIZE. The parts
   * keep their raw coordinates inside the root, so hotspots move with them.
   */
  finish(): THREE.Group {
    const box = new THREE.Box3().setFromObject(this.root)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    const scale = SIZE / Math.max(size.x, size.y, size.z)
    this.root.scale.setScalar(scale)
    this.root.position.copy(centre).multiplyScalar(-scale)
    this.root.name = 'dino'
    return this.root
  }
}

const IVORY = 0xf3ead2
const DARK = 0x3b3a36

function trex(kit: Kit) {
  const skin = 0x6aa84f
  const belly = 0xb9d98a
  kit.blob([0, 0.42, 0], [0.88, 0.56, 0.5], skin, 0.28)
  kit.blob([0.15, 0.22, 0], [0.6, 0.36, 0.42], belly, 0.28)
  // neck and head
  kit.limb([0.62, 0.7, 0], [0.95, 0.95, 0], 0.3, 0.26, skin)
  kit.blob([1.18, 0.98, 0], [0.5, 0.3, 0.3], skin)
  kit.blob([1.24, 0.74, 0], [0.42, 0.12, 0.24], belly)
  for (let i = 0; i < 5; i += 1) {
    const x = 1.0 + i * 0.12
    for (const z of [-0.2, 0.2]) kit.limb([x, 0.85, z], [x + 0.02, 0.74, z], 0.035, 0, IVORY, 4)
  }
  kit.eyes([1.3, 1.1, 0], 0.24)
  // tiny arms
  for (const z of [-0.36, 0.36]) {
    kit.limb([0.68, 0.38, z], [0.92, 0.18, z * 1.12], 0.07, 0.05, skin, 6)
    kit.limb([0.92, 0.18, z * 1.12], [1.0, 0.24, z * 1.12], 0.04, 0, IVORY, 4)
  }
  // strong legs
  for (const z of [-0.38, 0.38]) {
    kit.blob([-0.08, 0.12, z], [0.36, 0.5, 0.2], skin)
    kit.limb([-0.05, -0.22, z * 1.04], [0.05, -1.0, z * 1.04], 0.13, 0.1, skin)
    kit.blob([0.22, -1.04, z * 1.04], [0.28, 0.08, 0.13], skin)
  }
  // tail
  kit.limb([-0.75, 0.5, 0], [-2.15, 0.18, 0], 0.42, 0.03, skin)
}

function triceratops(kit: Kit) {
  const skin = 0xd9822b
  kit.blob([0, 0.22, 0], [1.0, 0.56, 0.56], skin)
  kit.blob([1.22, 0.36, 0], [0.46, 0.34, 0.34], skin)
  // frill: a disc behind the head, tilted back, with a bumpy edge
  const frillCentre: V3 = [0.9, 0.74, 0]
  const facing = new THREE.Vector3(0.94, 0.34, 0)
  kit.limb(
    frillCentre,
    [frillCentre[0] + facing.x * 0.08, frillCentre[1] + facing.y * 0.08, 0],
    0.62,
    0.62,
    0xc0651c,
  )
  const up = new THREE.Vector3(-0.34, 0.94, 0)
  for (let i = 0; i <= 8; i += 1) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI
    const p = up.clone().multiplyScalar(Math.cos(a) * 0.62)
    kit.blob(
      [frillCentre[0] + p.x, frillCentre[1] + p.y, Math.sin(a) * 0.62],
      [0.08, 0.08, 0.08],
      IVORY,
    )
  }
  // horns
  for (const z of [-0.17, 0.17]) kit.limb([1.36, 0.62, z], [1.92, 1.0, z * 1.4], 0.08, 0, IVORY, 6)
  kit.limb([1.6, 0.42, 0], [1.76, 0.68, 0], 0.07, 0, IVORY, 6)
  // beak
  kit.limb([1.58, 0.2, 0], [1.88, 0.08, 0], 0.13, 0, DARK, 6)
  kit.eyes([1.44, 0.5, 0], 0.26)
  for (const [x, z, r] of [
    [0.62, 0.36, 0.14],
    [-0.62, 0.4, 0.17],
  ] as const) {
    for (const side of [-1, 1]) {
      kit.limb([x, -0.08, side * z], [x + 0.04, -0.92, side * (z + 0.03)], r, r * 0.85, skin)
    }
  }
  kit.limb([-0.95, 0.26, 0], [-2.0, -0.02, 0], 0.3, 0.03, skin)
}

function stegosaurus(kit: Kit) {
  const skin = 0x4f9a94
  const plates = 0xe0683a
  kit.blob([0, 0.36, 0], [1.0, 0.6, 0.5], skin)
  kit.limb([0.88, 0.28, 0], [1.38, 0.06, 0], 0.22, 0.15, skin)
  kit.blob([1.52, 0.04, 0], [0.3, 0.17, 0.17], skin)
  kit.eyes([1.6, 0.1, 0], 0.15, 0.05)
  // two rows of plates along the back, biggest in the middle
  for (let i = 0; i < 8; i += 1) {
    const x = -0.9 + i * 0.25
    const top = 0.36 + 0.6 * Math.sqrt(Math.max(0, 1 - (x / 1.02) ** 2))
    const height = 0.32 + 0.3 * Math.sin(((i + 0.5) / 8) * Math.PI)
    kit.plate([x, top - 0.08, i % 2 === 0 ? 0.09 : -0.09], height, plates)
  }
  // tail with four spikes
  kit.limb([-0.95, 0.4, 0], [-2.1, 0.25, 0], 0.3, 0.05, skin)
  for (const [x, z] of [
    [-1.75, 0.08],
    [-1.95, 0.06],
  ] as const) {
    for (const side of [-1, 1]) {
      kit.limb([x, 0.3, side * z], [x - 0.2, 0.68, side * 0.42], 0.05, 0, IVORY, 5)
    }
  }
  // short front legs, long back legs
  for (const side of [-1, 1]) {
    kit.limb([0.62, 0.0, side * 0.3], [0.64, -0.82, side * 0.32], 0.13, 0.11, skin)
    kit.limb([-0.5, 0.1, side * 0.32], [-0.5, -0.82, side * 0.34], 0.19, 0.14, skin)
  }
}

function brachiosaurus(kit: Kit) {
  const skin = 0x6c8ebf
  const belly = 0xb6c9e6
  kit.blob([0, 0, 0], [1.0, 0.6, 0.56], skin, 0.15)
  kit.blob([0.1, -0.2, 0], [0.75, 0.36, 0.46], belly, 0.15)
  kit.limb([0.7, 0.3, 0], [1.38, 2.2, 0], 0.3, 0.15, skin)
  kit.blob([1.55, 2.28, 0], [0.32, 0.17, 0.17], skin)
  kit.blob([1.46, 2.42, 0], [0.13, 0.1, 0.12], skin)
  kit.eyes([1.62, 2.34, 0], 0.14, 0.05)
  // long front legs, shorter back legs
  for (const side of [-1, 1]) {
    kit.limb([0.62, -0.05, side * 0.34], [0.66, -1.42, side * 0.36], 0.18, 0.15, skin)
    kit.limb([-0.62, -0.32, side * 0.36], [-0.64, -1.42, side * 0.38], 0.2, 0.16, skin)
  }
  kit.limb([-0.9, -0.05, 0], [-2.2, -0.42, 0], 0.32, 0.04, skin)
}

function pteranodon(kit: Kit) {
  const skin = 0x9b6fb3
  const wing = 0xd8b4e8
  kit.blob([0, 0, 0], [0.45, 0.2, 0.2], skin)
  kit.blob([0.56, 0.16, 0], [0.19, 0.15, 0.13], skin)
  kit.eyes([0.62, 0.2, 0], 0.11, 0.045)
  // a long beak without teeth, and a long crest pointing back
  kit.limb([0.66, 0.12, 0], [1.38, 0.04, 0], 0.09, 0, 0xf2c14e, 6)
  kit.limb([0.5, 0.22, 0], [-0.3, 0.58, 0], 0.08, 0, skin, 5)
  // wings: thin skin between the body, the "elbow" and the wing tip
  const material = kit.mat(wing, THREE.DoubleSide)
  for (const side of [-1, 1]) {
    const points = [
      [0.3, 0.05, side * 0.15],
      [0.38, 0.42, side * 0.95],
      [-0.35, 0.0, side * 0.15],
      [-0.35, 0.0, side * 0.15],
      [0.38, 0.42, side * 0.95],
      [0.02, 0.95, side * 1.85],
    ].flat()
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    geometry.computeVertexNormals()
    kit.add(new THREE.Mesh(geometry, material))
    kit.limb([0.32, 0.08, side * 0.15], [0.38, 0.42, side * 0.95], 0.04, 0.03, skin, 5)
    kit.limb([0.38, 0.42, side * 0.95], [0.02, 0.95, side * 1.85], 0.03, 0.015, skin, 5)
    kit.limb([-0.3, -0.05, side * 0.1], [-0.55, -0.32, side * 0.14], 0.04, 0.025, skin, 5)
  }
}

function ankylosaurus(kit: Kit) {
  const skin = 0xa4844a
  const armour = 0x7a5f33
  kit.blob([0, 0.1, 0], [1.0, 0.45, 0.72], skin)
  // armour: rows of bony bumps on the back, spikes along the sides
  for (let i = 0; i < 6; i += 1) {
    const x = -0.75 + i * 0.3
    for (const z of [-0.36, 0, 0.36]) {
      const y = 0.1 + 0.45 * Math.sqrt(Math.max(0, 1 - (x / 1.0) ** 2 - (z / 0.72) ** 2))
      kit.limb([x, y - 0.02, z], [x, y + 0.14, z], 0.08, 0, armour, 5)
    }
    for (const side of [-1, 1]) {
      kit.limb([x, 0.05, side * 0.62], [x, 0.05, side * 0.86], 0.06, 0, IVORY, 5)
    }
  }
  kit.blob([1.18, 0.02, 0], [0.36, 0.25, 0.32], skin)
  for (const side of [-1, 1])
    kit.limb([0.98, 0.16, side * 0.24], [0.86, 0.3, side * 0.4], 0.06, 0, IVORY, 5)
  kit.eyes([1.32, 0.1, 0], 0.26, 0.05)
  for (const x of [0.55, -0.55]) {
    for (const side of [-1, 1]) {
      kit.limb([x, -0.15, side * 0.48], [x, -0.72, side * 0.5], 0.15, 0.13, skin)
    }
  }
  kit.limb([-0.9, 0.1, 0], [-1.95, 0.02, 0], 0.22, 0.1, skin)
  kit.blob([-2.12, 0.02, 0], [0.26, 0.18, 0.3], IVORY)
}

const BUILDERS: Record<DinoId, (kit: Kit) => void> = {
  trex,
  triceratops,
  stegosaurus,
  brachiosaurus,
  pteranodon,
  ankylosaurus,
}

/** The builder of one animal for the 3D Explorer. */
export function dinoBuilder(id: DinoId): (quality: ExplorerQuality) => THREE.Object3D {
  return (quality) => {
    const kit = new Kit(quality)
    BUILDERS[id](kit)
    return kit.finish()
  }
}
