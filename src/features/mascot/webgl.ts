let cached: boolean | null = null

interface DeviceHints {
  hardwareConcurrency?: number
  deviceMemory?: number
}

/**
 * Whether this device should get the 3D robot. Falls back to the SVG robot
 * when WebGL is missing or the device is very weak (≤ 2 cores or < 2 GB RAM),
 * so the mascot stays smooth everywhere.
 */
export function canRender3D(): boolean {
  if (cached !== null) return cached
  cached = detect()
  return cached
}

function detect(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const hints = navigator as Navigator & DeviceHints
  if ((hints.hardwareConcurrency ?? 4) <= 2) return false
  if (hints.deviceMemory !== undefined && hints.deviceMemory < 2) return false
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    return context !== null
  } catch {
    return false
  }
}

/** Test helper: forget the cached answer. */
export function resetWebGLDetection(): void {
  cached = null
}
