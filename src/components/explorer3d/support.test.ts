import { afterEach, describe, expect, it, vi } from 'vitest'
import { explorerSupport } from './support'

const webgl = vi.hoisted(() => ({ context: true, mascot: false }))

vi.mock('@/features/mascot/webgl', async (original) => ({
  ...(await original<typeof import('@/features/mascot/webgl')>()),
  canCreateWebGL: () => webgl.context,
  canRender3D: () => webgl.mascot,
}))

function device(hints: { hardwareConcurrency?: number; deviceMemory?: number }) {
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(hints.hardwareConcurrency ?? 8)
  Object.defineProperty(navigator, 'deviceMemory', {
    configurable: true,
    get: () => hints.deviceMemory,
  })
  vi.spyOn(window.screen, 'width', 'get').mockReturnValue(1024)
  vi.spyOn(window.screen, 'height', 'get').mockReturnValue(768)
}

describe('explorerSupport', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Reflect.deleteProperty(navigator, 'deviceMemory')
    webgl.context = true
  })

  it('a very weak device with WebGL still gets the 3D button: low quality, picture first', () => {
    // the mascot refuses 3D here; the Explorer does not
    device({ hardwareConcurrency: 2, deviceMemory: 1 })
    expect(explorerSupport()).toEqual({ webgl: true, auto: false, quality: 'low' })
  })

  it('opens by itself on a capable device', () => {
    device({ hardwareConcurrency: 8, deviceMemory: 8 })
    expect(explorerSupport()).toEqual({ webgl: true, auto: true, quality: 'high' })
  })

  it('no WebGL context: no 3D at all', () => {
    webgl.context = false
    device({ hardwareConcurrency: 8, deviceMemory: 8 })
    expect(explorerSupport()).toMatchObject({ webgl: false, auto: false })
  })
})
