/// <reference types="node" />
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { MeshoptDecoder } from 'meshoptimizer'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FACE_TARGETS } from '@/features/mascot/characters/emotions'
import { storyCards } from '@/features/myStory/content'
import { ANIMAL_IDS, ANIMALS, animalModel, MOOD_PERFORMANCE } from './animals'

/*
 * The story animals (Phase 78) keep the controller's contract: skinned, the shared
 * bones, the clips their style and the page feelings ask for, a walk of their own,
 * every face morph target, a solid 360° body and a size budget.
 */

const PUBLIC = path.resolve('public')
const BONES = [
  'Root',
  'Hips',
  'Spine',
  'Chest',
  'Neck',
  'Head',
  'Hand_L',
  'Hand_R',
  'Foot_L',
  'Foot_R',
]
const CLIPS = [
  'idle',
  'walk',
  'run',
  'wave',
  'celebrate',
  'think',
  'surprised',
  'sleep',
  'sit',
  'jump',
]
const BUDGET_KB = 450

async function read(file: string) {
  await MeshoptDecoder.ready
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
    .read(file)
}

describe.each(ANIMAL_IDS)('%s model', (id) => {
  const file = path.join(PUBLIC, animalModel(id))

  it('is a rigged, animated, 360° character within budget', async () => {
    expect(fs.statSync(file).size / 1024).toBeLessThan(BUDGET_KB)
    const root = (await read(file)).getRoot()
    const bones = new Set(root.listSkins().flatMap((s) => s.listJoints().map((j) => j.getName())))
    for (const bone of BONES) expect(bones, bone).toContain(bone)
    const clips = new Set(root.listAnimations().map((a) => a.getName()))
    for (const clip of CLIPS) expect(clips, clip).toContain(clip)
    for (const names of Object.values(ANIMALS[id].style))
      for (const name of names) expect(clips, name).toContain(name)
    for (const { gesture } of Object.values(MOOD_PERFORMANCE))
      expect(clips, gesture).toContain(gesture)
    const morphs = new Set(
      root.listMeshes().flatMap((m) => (m.getExtras()?.targetNames as string[]) ?? []),
    )
    for (const key of FACE_TARGETS) expect(morphs, key).toContain(key)
    // the controller finds its materials by this prefix
    for (const material of root.listMaterials())
      expect(material.getName().startsWith(`${ANIMALS[id].id}_`), material.getName()).toBe(true)
    for (const mesh of root.listMeshes()) {
      if (mesh.getExtras()?.targetNames) continue
      const pos = mesh.listPrimitives()[0]!.getAttribute('POSITION')!
      const min = pos.getMin([])
      const max = pos.getMax([])
      expect((max[2]! - min[2]!) / (max[0]! - min[0]!)).toBeGreaterThan(0.5)
    }
  })
})

describe('story heroes', () => {
  it('plays the six animals with their 3D models and keeps pictures for the rest', () => {
    const base = { place: 'forest', helper: 'kite', ending: 'treasure' } as const
    for (const hero of ANIMAL_IDS) {
      const card = storyCards({ ...base, hero })[1]!
      expect(card.picture.actors.find((a) => a.hop)?.model).toBe(hero)
    }
    const elephant = storyCards({ ...base, hero: 'elephant' })[1]!
    expect(elephant.picture.actors.some((a) => a.model)).toBe(false)
  })
})
