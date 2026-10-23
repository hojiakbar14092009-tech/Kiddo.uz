import * as THREE from 'three'
import { addExplorerLights, disposeObject } from '@/components/explorer3d/lights'
import { START_PITCH, START_YAW } from '@/components/explorer3d/orbit'
import type { DinoId } from './content'
import { DINO_MODELS } from './content'
import { dinoBuilder } from './models'

/**
 * One still picture of a dinosaur model (a webp data URL with a clear
 * background), seen like the 3D view first shows it. Used by
 * scripts/render-dinos.mjs to make public/3d/worlds/dino-*.webp.
 */
export function renderDinoStill(id: DinoId, size: number, quality = 0.82): string {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(1)
  renderer.setSize(size * 2, size * 2)
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  addExplorerLights(scene)
  const model = dinoBuilder(id)('high')
  const pivot = new THREE.Group()
  pivot.rotation.set(START_PITCH, START_YAW, 0)
  pivot.add(model)
  scene.add(pivot)
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(0, 0, DINO_MODELS[id].distance ?? 4)
  camera.lookAt(0, 0, 0)
  renderer.render(scene, camera)
  const small = document.createElement('canvas')
  small.width = size
  small.height = size
  const context = small.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  context.drawImage(renderer.domElement, 0, 0, size, size)
  const url = small.toDataURL('image/webp', quality)
  disposeObject(model)
  renderer.dispose()
  renderer.forceContextLoss()
  return url
}
