import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

const loads: string[] = []
const disposed: string[] = []

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder() {
      return this
    }
    loadAsync(url: string) {
      loads.push(url)
      if (url.includes('broken')) return Promise.reject(new Error('404'))
      const scene = new THREE.Group()
      const geometry = new THREE.BoxGeometry()
      geometry.addEventListener('dispose', () => disposed.push(url))
      scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()))
      return Promise.resolve({ scene, animations: [] })
    }
  },
}))

const { acquire, cacheStats, release } = await import('./assets')

describe('mascot model cache', () => {
  afterEach(() => {
    vi.useRealTimers()
    loads.length = 0
    disposed.length = 0
  })

  it('loads a model once for every place that shows it, and frees it after the last one', async () => {
    vi.useFakeTimers()
    await Promise.all([acquire('/m/a.glb'), acquire('/m/a.glb')])
    expect(loads).toEqual(['/m/a.glb'])
    release('/m/a.glb')
    release('/m/a.glb')
    // kept a little while for a quick way back …
    await acquire('/m/a.glb')
    expect(loads).toEqual(['/m/a.glb'])
    release('/m/a.glb')
    // … then freed: WebGL memory does not pile up while visiting worlds
    vi.advanceTimersByTime(25_000)
    expect(disposed).toEqual(['/m/a.glb'])
    expect(cacheStats().find((c) => c.url === '/m/a.glb')).toBeUndefined()
  })

  it('home → space → home → dinosaur keeps at most the models on screen', async () => {
    vi.useFakeTimers()
    for (const url of [
      '/m/home.glb',
      '/m/space.glb',
      '/m/home.glb',
      '/m/dino.glb',
      '/m/home.glb',
    ]) {
      await acquire(url)
      release(url)
      vi.advanceTimersByTime(30_000)
    }
    expect(cacheStats()).toEqual([])
  })

  it('a failed load is not cached (the next visit tries again)', async () => {
    await expect(acquire('/m/broken.glb')).rejects.toThrow('404')
    await Promise.resolve()
    expect(cacheStats().find((c) => c.url === '/m/broken.glb')).toBeUndefined()
  })
})
