import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { Shown } from './director'
import {
  Blinker,
  blendFace,
  blinkRoom,
  EMOTION_FACES,
  Syllables,
  type FaceTarget,
  type FaceWeights,
} from './emotions'
import { clipFor, LOOPING } from './gestures'
import type { MascotDefinition } from './registry'

/*
 * Drives one 3D mascot: the skeleton through an AnimationMixer (crossfaded
 * clips), the face through morph targets (blended emotions, blinking, a
 * talking mouth, a gentle look), and glowing materials. It owns no timers:
 * the canvas calls update() for each frame it draws, so an off-screen or
 * hidden mascot costs nothing and its blinking pauses with it.
 */

export const CROSSFADE_SECONDS = 0.25
const MAX_YAW = THREE.MathUtils.degToRad(24)
const MAX_PITCH = THREE.MathUtils.degToRad(12)

export interface Palette {
  accent: string
  glow: string
}

export interface FrameInput {
  speaking: boolean
  /** Where to look, in screen terms (x −1 left … 1 right, y −1 up … 1 down), or null. */
  look: { x: number; y: number } | null
  reducedMotion: boolean
  /** Calm pages (a lesson): slower idle, no glow pulse. */
  calm: boolean
}

export interface ModelStats {
  triangles: number
  vertices: number
  meshes: number
  materials: number
  textures: number
  animations: number
  bones: number
  morphTargets: number
}

export class MascotController {
  readonly root: THREE.Object3D
  readonly clips: ReadonlySet<string>
  private readonly mixer: THREE.AnimationMixer
  private readonly actions = new Map<string, THREE.AnimationAction>()
  private readonly faceMeshes: THREE.Mesh[] = []
  private readonly glow: { material: THREE.MeshStandardMaterial; base: number }[] = []
  private readonly owned: THREE.Material[] = []
  private readonly head: THREE.Object3D | undefined
  /** The head's pose from the animation, before the glance is added on top. */
  private readonly headPose = new THREE.Quaternion()
  private glancing = false
  private readonly blinker: Blinker
  private readonly syllables: Syllables
  private face: FaceWeights = {}
  private emotion: Shown['emotion'] = 'neutral'
  private active: THREE.AnimationAction | null = null
  private activeClip = ''
  private serial = -1
  private yaw = 0
  private pitch = 0
  private time = 0

  private readonly def: MascotDefinition

  constructor(
    def: MascotDefinition,
    gltf: GLTF,
    options: { palette?: Palette; seed?: number } = {},
  ) {
    this.def = def
    this.root = cloneSkinned(gltf.scene)
    this.blinker = new Blinker(options.seed ?? 1)
    this.syllables = new Syllables((options.seed ?? 1) * 31)
    // own copies of the materials: colours and glow change per mascot on screen
    const copies = new Map<THREE.Material, THREE.Material>()
    this.root.traverse((node) => {
      const mesh = node as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.frustumCulled = false // skinned bounds lag behind animation; the mascot is always in view
      const swap = (material: THREE.Material) => {
        let copy = copies.get(material)
        if (!copy) {
          copy = material.clone()
          copies.set(material, copy)
          this.owned.push(copy)
        }
        return copy
      }
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
      if (mesh.morphTargetDictionary && 'blink' in mesh.morphTargetDictionary)
        this.faceMeshes.push(mesh)
    })
    for (const material of this.owned) {
      const standard = material as THREE.MeshStandardMaterial
      const suffix = material.name.replace(`${def.id}_`, '')
      if (options.palette && standard.color) {
        if (suffix === 'accent' || suffix === 'antenna') standard.color.set(options.palette.accent)
        if (suffix === 'glow' || suffix === 'light') {
          standard.color.set(options.palette.glow)
          standard.emissive?.set(options.palette.glow)
        }
      }
      if (def.glow.includes(suffix) && standard.emissive) {
        this.glow.push({ material: standard, base: standard.emissiveIntensity })
      }
    }
    this.head = this.root.getObjectByName('Head')
    this.mixer = new THREE.AnimationMixer(this.root)
    for (const clip of gltf.animations) {
      const action = this.mixer.clipAction(clip)
      const loop = LOOPING.has(clip.name)
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
      action.clampWhenFinished = !loop
      this.actions.set(clip.name, action)
    }
    this.clips = new Set(this.actions.keys())
  }

  /** Length of what a gesture plays, in ms (Infinity for a loop). */
  durationMs(gesture: string): number {
    const name = clipFor(this.def, gesture, this.clips)
    const action = this.actions.get(name)
    if (!action || LOOPING.has(name)) return Infinity
    return (action.getClip().duration / this.def.personality.tempo) * 1000
  }

  /** The clip a gesture resolves to on this mascot. */
  clipOf(gesture: string): string {
    return clipFor(this.def, gesture, this.clips)
  }

  get currentClip(): string {
    return this.activeClip
  }

  /** Shows what the director decided (a new serial starts the clip again). */
  show(shown: Shown, input: Pick<FrameInput, 'reducedMotion' | 'calm'>): void {
    this.emotion = shown.emotion
    if (shown.serial === this.serial) return
    this.serial = shown.serial
    const name = this.clipOf(shown.gesture)
    const next = this.actions.get(name)
    if (!next) return
    const idleLike = LOOPING.has(name)
    // reduced motion: the base pose holds still; gestures stay short pose changes
    const speed =
      input.reducedMotion && idleLike
        ? 0
        : this.def.personality.tempo * (input.calm && idleLike ? 0.75 : 1)
    if (next === this.active) {
      next.reset().setEffectiveTimeScale(speed).play()
      return
    }
    next.reset()
    next.setEffectiveTimeScale(speed)
    next.setEffectiveWeight(1)
    next.play()
    if (this.active) next.crossFadeFrom(this.active, CROSSFADE_SECONDS, false)
    this.active = next
    this.activeClip = name
  }

  update(dt: number, input: FrameInput): void {
    const step = Math.min(dt, 0.1) // a long pause (off screen) is not a jump
    this.time += step
    // undo last frame's glance first: a clip that does not key the head must not let it add up
    if (this.head && this.glancing) this.head.quaternion.copy(this.headPose)
    this.mixer.update(step)
    if (this.head) this.headPose.copy(this.head.quaternion)

    // look at the child's touch: head slowly, eyes first (bounded, and only when asked)
    const look = input.reducedMotion ? null : input.look
    const k = 1 - Math.exp(-step * 4)
    this.yaw += ((look ? look.x * MAX_YAW : 0) - this.yaw) * k
    this.pitch += ((look ? look.y * MAX_PITCH : 0) - this.pitch) * k
    this.glancing = Math.abs(this.yaw) > 1e-4 || Math.abs(this.pitch) > 1e-4
    if (this.head && this.glancing) {
      const turn = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'),
      )
      this.head.quaternion.premultiply(turn)
    }

    // the face: emotion + look + blink + talking mouth
    const target: FaceWeights = { ...EMOTION_FACES[this.emotion] }
    if (look) {
      const add = (key: FaceTarget, v: number) =>
        (target[key] = Math.min(1, (target[key] ?? 0) + v))
      add(look.x > 0 ? 'look_left' : 'look_right', Math.min(1, Math.abs(look.x)) * 0.8)
      add(look.y > 0 ? 'look_down' : 'look_up', Math.min(1, Math.abs(look.y)) * 0.6)
    }
    this.face = blendFace(this.face, target, step, this.def.personality.blendMs)
    // reduced motion: the eyes stay open (expressions still change, softly)
    const blink = input.reducedMotion ? 0 : this.blinker.step(step) * blinkRoom(this.face)
    // reduced motion: a still, slightly open mouth while speech plays instead of moving lips
    const mouth = input.reducedMotion
      ? input.speaking
        ? 0.3
        : 0
      : this.syllables.step(step, input.speaking)
    this.applyFace(blink, mouth)

    // glow: a slow breath of light (Lumi, robot lights), brighter in a celebration
    if (this.glow.length) {
      const party = this.emotion === 'celebrate' || this.emotion === 'excited'
      const amount = input.reducedMotion || input.calm ? 0 : party ? 0.45 : 0.08
      const pulse = 1 + amount * Math.sin(this.time * (party ? 6 : 1.6))
      for (const { material, base } of this.glow) material.emissiveIntensity = base * pulse
    }
  }

  private applyFace(blink: number, mouth: number): void {
    for (const mesh of this.faceMeshes) {
      const dict = mesh.morphTargetDictionary!
      const influences = mesh.morphTargetInfluences!
      influences.fill(0)
      for (const [key, value] of Object.entries(this.face) as [FaceTarget, number][]) {
        const index = dict[key]
        if (index !== undefined) influences[index] = value
      }
      if (dict.blink !== undefined)
        influences[dict.blink] = Math.min(1, (influences[dict.blink] ?? 0) + blink)
      if (mouth > 0 && dict.mouth_open !== undefined) {
        influences[dict.mouth_open] = Math.min(1, (influences[dict.mouth_open] ?? 0) + mouth)
        if (dict.mouth_smile !== undefined)
          influences[dict.mouth_smile] = (influences[dict.mouth_smile] ?? 0) * (1 - mouth)
      }
    }
  }

  /** Current morph weights (for tests and the lab). */
  faceWeights(): FaceWeights {
    return { ...this.face }
  }

  /** Attachment points for the shop's outfits (KidoBot) and tools. */
  socket(name: 'Socket_Head' | 'Socket_Face' | 'Socket_Neck'): THREE.Object3D | undefined {
    return this.root.getObjectByName(name)
  }

  stats(): ModelStats {
    let triangles = 0
    let vertices = 0
    let meshes = 0
    let morphTargets = 0
    const bones = new Set<string>()
    const textures = new Set<THREE.Texture>()
    this.root.traverse((node) => {
      const mesh = node as THREE.SkinnedMesh
      if ((node as THREE.Bone).isBone) bones.add(node.name)
      if (!mesh.isMesh) return
      meshes += 1
      const geometry = mesh.geometry
      vertices += geometry.attributes.position?.count ?? 0
      triangles += (geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3
      morphTargets += Object.keys(mesh.morphTargetDictionary ?? {}).length
    })
    for (const material of this.owned) {
      for (const value of Object.values(material)) {
        if (value && typeof value === 'object' && (value as THREE.Texture).isTexture)
          textures.add(value as THREE.Texture)
      }
    }
    return {
      triangles: Math.round(triangles),
      vertices,
      meshes,
      materials: this.owned.length,
      textures: textures.size,
      animations: this.actions.size,
      bones: bones.size,
      morphTargets,
    }
  }

  dispose(): void {
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.root)
    this.root.traverse((node) => (node as THREE.SkinnedMesh).skeleton?.dispose())
    // only the copies: textures and geometry stay with the shared model (assets.ts)
    for (const material of this.owned) material.dispose()
    this.owned.length = 0
  }
}
