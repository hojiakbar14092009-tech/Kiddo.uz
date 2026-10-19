import * as THREE from 'three'
import type { BodyId } from '../content'
import { addLights, buildPlanet } from './planetModel'

/**
 * One still picture of a planet model (a webp data URL with a clear
 * background). Used by scripts/render-planets.mjs to make public/3d/space/*.webp.
 */
export function renderStill(id: BodyId, size: number): string {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(1)
  // drawn twice as big, then scaled down for smooth edges
  renderer.setSize(size * 2, size * 2)
  renderer.setClearColor(0x000000, 0)
  const scene = new THREE.Scene()
  addLights(scene)
  const model = buildPlanet(id, 'high')
  model.root.rotation.y = -0.5
  scene.add(model.root)
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  camera.position.set(0, 0, model.distance)
  renderer.render(scene, camera)
  const small = document.createElement('canvas')
  small.width = size
  small.height = size
  const context = small.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  context.drawImage(renderer.domElement, 0, 0, size, size)
  const url = small.toDataURL('image/webp', 0.9)
  model.dispose()
  renderer.dispose()
  renderer.forceContextLoss()
  return url
}
