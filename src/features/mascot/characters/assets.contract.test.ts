/// <reference types="node" />
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FACE_TARGETS } from './emotions'
import { IDLE_VARIATIONS } from './gestures'
import { MASCOT_IDS, MASCOTS } from './registry'

/*
 * The shipped models keep the runtime's contract: real skinned meshes with the
 * shared bones, the semantic clips the registry asks for, the facial morph
 * targets of the emotion library, in-place clips, a poster, a size budget.
 */

const PUBLIC = path.resolve('public') // vitest runs from the repository root
const CORE_BONES = [
  'Root',
  'Hips',
  'Spine',
  'Chest',
  'Neck',
  'Head',
  'UpperArm_L',
  'Forearm_L',
  'Hand_L',
  'UpperArm_R',
  'Forearm_R',
  'Hand_R',
  'UpperLeg_L',
  'LowerLeg_L',
  'Foot_L',
  'UpperLeg_R',
  'LowerLeg_R',
  'Foot_R',
]
const SHARED_CLIPS = [
  'idle',
  'wave',
  'point',
  'nod',
  'shake_head',
  'celebrate',
  'celebrate_calm',
  'think',
  'surprised',
  'encourage',
  'listen',
  'talk',
  'jump',
  'walk',
  'run',
  'turn',
  'sit',
  'sleep',
  ...IDLE_VARIATIONS,
]
const BROWS = new Set(['brows_up', 'brows_worried', 'brow_think'])
const BUDGET_KB = 450

async function read(file: string) {
  await MeshoptDecoder.ready
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
  return io.read(file)
}

describe.each(MASCOT_IDS)('%s model', (id) => {
  const def = MASCOTS[id]
  const file = path.join(PUBLIC, def.model)

  it('is a rigged, animated 3D character within budget', async () => {
    expect(fs.statSync(file).size / 1024).toBeLessThan(BUDGET_KB)
    expect(fs.existsSync(path.join(PUBLIC, def.poster))).toBe(true)
    const root = (await read(file)).getRoot()

    const skins = root.listSkins()
    expect(skins.length).toBeGreaterThan(0)
    const bones = new Set(skins.flatMap((s) => s.listJoints().map((j) => j.getName())))
    for (const bone of CORE_BONES) expect(bones, bone).toContain(bone)

    const clips = new Set(root.listAnimations().map((a) => a.getName()))
    for (const clip of SHARED_CLIPS) expect(clips, clip).toContain(clip)
    for (const names of Object.values(def.style))
      for (const name of names) expect(clips, name).toContain(name)
    for (const name of Object.values(def.idleIn ?? {})) expect(clips, name).toContain(name)
    for (const name of def.airborne) expect(clips, name).toContain(name)
    for (const clip of clips) expect(clip).toMatch(/^[a-z][a-z_]*$/)
    // every clip sets the whole pose: a bone that moves anywhere is keyed in every clip
    for (const animation of root.listAnimations()) {
      const keyed = animation
        .listChannels()
        .map((c) => `${c.getTargetNode()?.getName()}|${c.getTargetPath()}`)
      expect(keyed, animation.getName()).toContain('Head|rotation')
    }
    if (id === 'ziyo') {
      // the ikat belbog' (blue, indigo and white bands with gold)
      const names = root.listMaterials().map((m) => m.getName())
      for (const name of ['ziyo_ikat_blue', 'ziyo_ikat_indigo', 'ziyo_gold'])
        expect(names).toContain(name)
    }

    const morphs = new Set(
      root.listMeshes().flatMap((m) => (m.getExtras()?.targetNames as string[]) ?? []),
    )
    for (const key of FACE_TARGETS) {
      if (def.face === 'screen' && BROWS.has(key)) continue
      expect(morphs, key).toContain(key)
    }

    // 360°: a solid body with real depth, not a front-only card or billboard
    // (quantized positions keep their proportions: one scale per mesh)
    for (const mesh of root.listMeshes()) {
      if (mesh.getExtras()?.targetNames) continue // the face sits on the front by design
      const lo = [Infinity, Infinity, Infinity]
      const hi = [-Infinity, -Infinity, -Infinity]
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION')!
        const min = pos.getMin([])
        const max = pos.getMax([])
        for (let k = 0; k < 3; k += 1) {
          lo[k] = Math.min(lo[k]!, min[k]!)
          hi[k] = Math.max(hi[k]!, max[k]!)
        }
      }
      const width = hi[0]! - lo[0]!
      const depth = hi[2]! - lo[2]!
      expect(depth / width).toBeGreaterThan(0.3)
    }
  })

  it('animates in place (the app moves a mascot, a clip never does)', async () => {
    const root = (await read(file)).getRoot()
    for (const animation of root.listAnimations()) {
      for (const channel of animation.listChannels()) {
        if (channel.getTargetPath() !== 'translation') continue
        const node = channel.getTargetNode()!
        const rest = node.getTranslation()
        const parent = node.getParentNode()
        const m = parent ? parent.getWorldMatrix() : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]
        const out = channel.getSampler()!.getOutput()!
        const el: number[] = []
        for (let i = 0; i < out.getCount(); i += 1) {
          out.getElement(i, el)
          const d = [el[0]! - rest[0], el[1]! - rest[1], el[2]! - rest[2]]
          // the move in world space (column-major rotation of the parent)
          const wx = m[0]! * d[0]! + m[4]! * d[1]! + m[8]! * d[2]!
          const wz = m[2]! * d[0]! + m[6]! * d[1]! + m[10]! * d[2]!
          // only up and down (hops, breathing): never across the ground
          expect(Math.hypot(wx, wz), `${animation.getName()} ${node.getName()}`).toBeLessThan(0.02)
        }
      }
    }
  })
})
