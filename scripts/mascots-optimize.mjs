/**
 * Optimise and validate the mascot GLBs built by tools/mascots/build.py (Blender).
 *
 *   python3 tools/mascots/build.py && npm run mascots:optimize
 *
 * tools/mascots/out/<id>.glb  ->  public/mascots/<id>.glb
 *
 * - drops animation channels that never leave the rest pose (most bones in most clips),
 * - merges redundant keyframes (resample), deduplicates and prunes unused data,
 * - stores morph targets sparsely (a face shape moves only part of the face),
 * - compresses with meshopt (EXT_meshopt_compression; three.js ships the small decoder),
 * - validates the result with the Khronos glTF validator (errors and
 *   warnings too) and checks the Kiddo contract: core bones, required clips, morph target names.
 */
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, resample, sparse, weld } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import validator from 'gltf-validator'
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'tools/mascots/out'
const OUT = 'public/mascots'
const REQUIRED_CLIPS = [
  'idle',
  'wave',
  'celebrate',
  'think',
  'talk',
  'surprised',
  'encourage',
  'nod',
]
const REQUIRED_BONES = [
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
const REQUIRED_MORPHS = ['blink', 'eyes_happy', 'eyes_wide', 'mouth_smile', 'mouth_open']

await MeshoptEncoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-4)

/**
 * Remove channels of bones that never leave the rest pose in ANY clip. A bone that moves in some
 * clip keeps its channel in every clip (even a still one), so each clip sets the whole pose and
 * nothing stays stuck from the clip before.
 */
function dropStaticChannels(doc) {
  const moving = new Set()
  const channels = []
  for (const animation of doc.getRoot().listAnimations()) {
    for (const channel of animation.listChannels()) {
      const node = channel.getTargetNode()
      const output = channel.getSampler()?.getOutput()
      if (!node || !output) continue
      const target = channel.getTargetPath()
      const rest =
        target === 'rotation'
          ? node.getRotation()
          : target === 'translation'
            ? node.getTranslation()
            : node.getScale()
      const el = []
      let still = true
      for (let i = 0; i < output.getCount() && still; i += 1) {
        output.getElement(i, el)
        if (el.length === rest.length && !near(el, rest)) still = false
      }
      const key = `${node.getName()}|${target}`
      if (!still) moving.add(key)
      channels.push({ channel, key })
    }
  }
  let removed = 0
  for (const { channel, key } of channels) {
    if (moving.has(key)) continue
    const sampler = channel.getSampler()
    channel.dispose()
    sampler?.dispose()
    removed += 1
  }
  return removed
}

function contract(doc, id) {
  const root = doc.getRoot()
  const problems = []
  const clips = root.listAnimations().map((a) => a.getName())
  for (const clip of REQUIRED_CLIPS)
    if (!clips.includes(clip)) problems.push(`missing clip ${clip}`)
  const bones = new Set(root.listSkins().flatMap((s) => s.listJoints().map((j) => j.getName())))
  for (const bone of REQUIRED_BONES) if (!bones.has(bone)) problems.push(`missing bone ${bone}`)
  const morphs = new Set(root.listMeshes().flatMap((m) => m.getExtras()?.targetNames ?? []))
  for (const morph of REQUIRED_MORPHS)
    if (!morphs.has(morph)) problems.push(`missing morph ${morph}`)
  if (problems.length) throw new Error(`${id}: ${problems.join(', ')}`)
  return { clips: clips.length, bones: bones.size, morphs: morphs.size }
}

fs.mkdirSync(OUT, { recursive: true })
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(SRC)
      .filter((f) => f.endsWith('.glb'))
      .map((f) => f.replace('.glb', ''))
const report = []
for (const id of ids) {
  const doc = await io.read(path.join(SRC, `${id}.glb`))
  const removed = dropStaticChannels(doc)
  await doc.transform(
    resample({ tolerance: 1e-4 }),
    weld(),
    dedup(),
    prune(),
    sparse({ ratio: 0.3 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  )
  const info = contract(doc, id)
  const bytes = await io.writeBinary(doc)
  const result = await validator.validateBytes(bytes)
  const { numErrors, numWarnings, messages } = result.issues
  if (numErrors > 0 || numWarnings > 0) {
    console.error(messages.filter((m) => m.severity <= 1).slice(0, 10))
    throw new Error(`${id}: ${numErrors} glTF validation errors, ${numWarnings} warnings`)
  }
  fs.writeFileSync(path.join(OUT, `${id}.glb`), bytes)
  const tris = doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0)
  report.push({
    id,
    kB: Math.round(bytes.byteLength / 1024),
    tris,
    ...info,
    staticChannelsDropped: removed,
    warnings: numWarnings,
  })
}
console.table(report)
