import type { Material, Object3D, Texture } from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

/*
 * Mascot models, loaded only when a mascot is shown and shared between the
 * places that show the same one. Each model is counted: when nobody shows it
 * any more it is kept for a short while (going back and forth between two
 * pages does not download or parse it again) and then disposed, so visiting
 * many worlds never piles up WebGL geometry and textures.
 */

const KEEP_MS = 20_000

interface Entry {
  promise: Promise<GLTF>
  gltf: GLTF | null
  users: number
  timer: ReturnType<typeof setTimeout> | null
}

const cache = new Map<string, Entry>()
let loader: GLTFLoader | null = null

function getLoader(): GLTFLoader {
  loader ??= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  return loader
}

function load(url: string): Entry {
  let entry = cache.get(url)
  if (!entry) {
    const created: Entry = {
      promise: getLoader().loadAsync(url),
      gltf: null,
      users: 0,
      timer: null,
    }
    created.promise.then(
      (gltf) => {
        created.gltf = gltf
      },
      () => cache.delete(url), // a failed load is not cached: the next visit tries again
    )
    cache.set(url, created)
    entry = created
  }
  return entry
}

/** Starts using a model (resolves with the parsed glTF). Pair with release(). */
export function acquire(url: string): Promise<GLTF> {
  const entry = load(url)
  entry.users += 1
  if (entry.timer) clearTimeout(entry.timer)
  entry.timer = null
  return entry.promise
}

export function release(url: string): void {
  const entry = cache.get(url)
  if (!entry) return
  entry.users = Math.max(0, entry.users - 1)
  if (entry.users > 0 || entry.timer) return
  entry.timer = setTimeout(() => {
    entry.timer = null
    if (entry.users > 0) return
    cache.delete(url)
    if (entry.gltf) disposeObject(entry.gltf.scene)
  }, KEEP_MS)
}

/** Frees geometry, materials and textures of a model (shared or cloned). */
export function disposeObject(root: Object3D): void {
  const materials = new Set<Material>()
  root.traverse((node) => {
    const mesh = node as Object3D & {
      geometry?: { dispose(): void }
      material?: Material | Material[]
    }
    mesh.geometry?.dispose()
    const list = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
    for (const material of list) materials.add(material)
  })
  for (const material of materials) disposeMaterial(material)
}

export function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value && typeof value === 'object' && (value as Texture).isTexture)
      (value as Texture).dispose()
  }
  material.dispose()
}

/** For the Mascot Lab and tests: which models are loaded and by how many. */
export function cacheStats(): { url: string; users: number; loaded: boolean }[] {
  return [...cache.entries()].map(([url, entry]) => ({
    url,
    users: entry.users,
    loaded: entry.gltf !== null,
  }))
}
