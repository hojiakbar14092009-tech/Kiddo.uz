import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { describe, expect, it } from 'vitest'
import { MascotController } from './controller'
import { MASCOTS } from './registry'

/** A tiny stand-in for a mascot GLB: a head bone, a face with morph targets, two clips. */
function fakeModel(): GLTF {
  const scene = new THREE.Group()
  const head = new THREE.Bone()
  head.name = 'Head'
  scene.add(head)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  )
  geometry.morphAttributes.position = ['blink', 'eyes_happy', 'mouth_smile', 'mouth_open'].map(
    (name) => {
      const a = new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3)
      a.name = name
      return a
    },
  )
  const glow = new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: 1 })
  glow.name = 'lumi_glow'
  const face = new THREE.Mesh(geometry, glow)
  face.updateMorphTargets()
  scene.add(face)
  const turn = (name: string, seconds: number, angle: number) =>
    new THREE.AnimationClip(name, seconds, [
      new THREE.QuaternionKeyframeTrack(
        'Head.quaternion',
        [0, seconds / 2, seconds],
        [
          ...new THREE.Quaternion().toArray(),
          ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0)).toArray(),
          ...new THREE.Quaternion().toArray(),
        ],
      ),
    ])
  return { scene, animations: [turn('idle', 4, 0.2), turn('illuminate', 2, 1)] } as unknown as GLTF
}

const input = { speaking: false, look: null, reducedMotion: false, calm: false }

describe('MascotController', () => {
  it('plays the mascot’s own clip for a shared gesture and knows its length', () => {
    const c = new MascotController(MASCOTS.lumi, fakeModel())
    // Lumi celebrates by shining (registry style), 2 s at its tempo 0.9
    expect(c.clipOf('celebrate')).toBe('illuminate')
    expect(c.durationMs('celebrate')).toBeCloseTo(2000 / 0.9)
    expect(c.durationMs('idle')).toBe(Infinity)
    c.show({ gesture: 'celebrate', emotion: 'celebrate', priority: 4, serial: 1 }, input)
    c.update(0.5, input)
    expect(c.currentClip).toBe('illuminate')
  })

  it('blends the face towards the emotion and talks only while speech plays', () => {
    const c = new MascotController(MASCOTS.lumi, fakeModel())
    c.show({ gesture: 'idle', emotion: 'celebrate', priority: 0, serial: 1 }, input)
    c.update(0.05, input)
    const early = c.faceWeights().eyes_happy ?? 0
    for (let i = 0; i < 20; i += 1) c.update(0.05, input)
    expect(early).toBeLessThan(0.6)
    expect(c.faceWeights().eyes_happy).toBeGreaterThan(0.9)
    const face = c.root.children.find((n) => (n as THREE.Mesh).isMesh) as THREE.Mesh
    const open = face.morphTargetDictionary!.mouth_open!
    for (let i = 0; i < 10; i += 1) c.update(0.05, { ...input, speaking: true })
    expect(face.morphTargetInfluences![open]).toBeGreaterThan(0)
  })

  it('reduced motion: the idle pose holds still, no glow pulse, no blinking', () => {
    const c = new MascotController(MASCOTS.lumi, fakeModel())
    const calm = { ...input, reducedMotion: true }
    c.show({ gesture: 'idle', emotion: 'neutral', priority: 0, serial: 1 }, calm)
    const head = c.root.getObjectByName('Head')!
    c.update(0.1, calm)
    const before = head.quaternion.clone()
    for (let i = 0; i < 30; i += 1) c.update(0.1, calm)
    expect(head.quaternion.angleTo(before)).toBeLessThan(1e-6)
    const face = c.root.children.find((n) => (n as THREE.Mesh).isMesh) as THREE.Mesh
    expect(face.morphTargetInfluences![face.morphTargetDictionary!.blink!]).toBe(0)
    expect((face.material as THREE.MeshStandardMaterial).emissiveIntensity).toBe(1)
  })

  it('a glance at a touch stays bounded, even in a clip that does not key the head', () => {
    const model = fakeModel()
    // a clip that only moves another node: the head binding is free
    model.animations.push(
      new THREE.AnimationClip('wave', 2, [
        new THREE.VectorKeyframeTrack('.position', [0, 2], [0, 0, 0, 0, 0.1, 0]),
      ]),
    )
    const c = new MascotController(MASCOTS.kidobot, model)
    c.show({ gesture: 'wave', emotion: 'happy', priority: 4, serial: 1 }, input)
    const head = c.root.getObjectByName('Head')!
    for (let i = 0; i < 200; i += 1) c.update(0.05, { ...input, look: { x: 1, y: 1 } })
    const angle = head.quaternion.angleTo(new THREE.Quaternion())
    expect(angle).toBeLessThan(THREE.MathUtils.degToRad(30))
    expect(angle).toBeGreaterThan(THREE.MathUtils.degToRad(10))
  })

  it('owns copies of the materials (shared model untouched) and frees them', () => {
    const model = fakeModel()
    const shared = (model.scene.children[1] as THREE.Mesh).material
    const c = new MascotController(MASCOTS.kidobot, model, {
      palette: { accent: '#ff0000', glow: '#00ff00' },
    })
    const own = (c.root.children[1] as THREE.Mesh).material
    expect(own).not.toBe(shared)
    let freed = false
    ;(own as THREE.Material).addEventListener('dispose', () => (freed = true))
    c.dispose()
    expect(freed).toBe(true)
  })
})
