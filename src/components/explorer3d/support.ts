import { canCreateWebGL, isLowEndDevice } from '@/features/mascot/webgl'
import type { ExplorerQuality } from './types'

/*
 * What this device can do with the 3D Explorer. Unlike the robot, the
 * Explorer only needs a WebGL context: on a very weak device it still offers
 * the "Turn in 3D" button, at low quality, after the still picture. The 3D
 * view opens by itself only on capable devices that do not ask to save data;
 * everyone else gets the still picture and the button (none without WebGL).
 */

interface DeviceHints {
  hardwareConcurrency?: number
  deviceMemory?: number
  connection?: { saveData?: boolean }
}

export interface ExplorerSupport {
  webgl: boolean
  /** Open the 3D view without a tap. */
  auto: boolean
  quality: ExplorerQuality
}

export function explorerQuality(hints: DeviceHints, screenSide: number): ExplorerQuality {
  if (isLowEndDevice(hints)) return 'low'
  if (hints.deviceMemory !== undefined && hints.deviceMemory < 4) return 'low'
  if ((hints.hardwareConcurrency ?? 8) <= 4) return 'low'
  if (screenSide > 0 && screenSide < 360) return 'low'
  return 'high'
}

export function explorerSupport(): ExplorerSupport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { webgl: false, auto: false, quality: 'low' }
  }
  const hints = navigator as Navigator & DeviceHints
  const side = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0)
  const quality = explorerQuality(hints, side)
  const webgl = canCreateWebGL()
  const saveData = hints.connection?.saveData === true
  const auto = webgl && !saveData && !isLowEndDevice(hints) && quality === 'high'
  return { webgl, auto, quality }
}
