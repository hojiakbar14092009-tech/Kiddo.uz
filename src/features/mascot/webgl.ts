let cached: boolean | null = null
let cachedContext: boolean | null = null

export interface DeviceHints {
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

/**
 * Whether a WebGL context can be created at all, with no device-strength
 * check. The 3D Explorer uses this: a weak device still gets the "Turn in 3D"
 * button (at low quality, never opened by itself), while the mascot keeps
 * the stricter canRender3D().
 */
export function canCreateWebGL(): boolean {
  if (cachedContext !== null) return cachedContext
  cachedContext = createContext()
  return cachedContext
}

/** Very weak devices (≤ 2 cores or < 2 GB RAM) by their hints. */
export function isLowEndDevice(hints: DeviceHints): boolean {
  if ((hints.hardwareConcurrency ?? 4) <= 2) return true
  return hints.deviceMemory !== undefined && hints.deviceMemory < 2
}

function detect(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  if (isLowEndDevice(navigator as Navigator & DeviceHints)) return false
  return canCreateWebGL()
}

function createContext(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
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
  cachedContext = null
}

/**
 * Mascot render quality for a device that gets 3D at all: 'low' on modest
 * phones (≤ 4 cores or ≤ 4 GB): pixel ratio 1, no reflections, a still
 * contact shadow. The mascot stays; only its cost goes down.
 */
export function mascotQuality(hints: DeviceHints = navigatorHints()): 'high' | 'low' {
  if ((hints.hardwareConcurrency ?? 8) <= 4) return 'low'
  return hints.deviceMemory !== undefined && hints.deviceMemory <= 4 ? 'low' : 'high'
}

function navigatorHints(): DeviceHints {
  return typeof navigator === 'undefined' ? {} : (navigator as Navigator & DeviceHints)
}
