import * as THREE from 'three'
import { EXPLORE, type LandmarkId } from './content'
import { BUILDERS } from './models'

/**
 * One still picture of a landmark model (a webp data URL with a clear
 * background), seen a little from above and from the front-right. Used only by
 * scripts/render-uzbekistan.mjs to make public/3d/worlds/uz-*.webp.
 */
export function renderStill(id: LandmarkId, size: number, quality = 0.82): string {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(1)
  renderer.setSize(size * 2, size * 2)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c7a8, 1.6))
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.set(3, 5, 4)
  scene.add(sun)
  const model = BUILDERS[id]('high')
  scene.add(model)
  const distance = EXPLORE[id].distance ?? 4
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  const direction = new THREE.Vector3(0.55, 0.5, 0.95).normalize()
  camera.position.copy(direction.multiplyScalar(distance))
  camera.lookAt(0, 0, 0)
  renderer.render(scene, camera)
  const small = document.createElement('canvas')
  small.width = size
  small.height = size
  const context = small.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  context.drawImage(renderer.domElement, 0, 0, size, size)
  const url = small.toDataURL('image/webp', quality)
  model.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose()
      ;(object.material as THREE.Material).dispose()
    }
  })
  renderer.dispose()
  renderer.forceContextLoss()
  return url
}
