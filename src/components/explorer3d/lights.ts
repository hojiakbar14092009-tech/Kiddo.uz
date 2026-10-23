import * as THREE from 'three'

/**
 * The Explorer's light: a warm sky, a sun from the upper right and a cool
 * rim light. Shared by the live view and still renders, so they match.
 */
export function addExplorerLights(scene: THREE.Scene): THREE.Light[] {
  const hemi = new THREE.HemisphereLight(0xfff7e8, 0x7a8f6a, 1.6)
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.set(3, 5, 4)
  const rim = new THREE.DirectionalLight(0xcfe4ff, 0.8)
  rim.position.set(-4, 2, -3)
  const lights = [hemi, sun, rim]
  lights.forEach((light) => scene.add(light))
  return lights
}

/** Frees the GPU memory of everything the builder made. */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined
    const materials = Array.isArray(material) ? material : material ? [material] : []
    for (const item of materials) {
      for (const value of Object.values(item)) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      item.dispose()
    }
  })
}
