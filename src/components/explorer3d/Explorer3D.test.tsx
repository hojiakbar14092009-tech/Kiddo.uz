import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { Explorer3D } from './Explorer3D'
import { IDLE_MAX_SECONDS, ORBIT_LIMITS, Orbit } from './orbit'
import { explorerQuality } from './support'
import type { ExplorerModelDef } from './types'

const support = vi.hoisted(() => ({
  value: { webgl: false, auto: false, quality: 'high' as 'high' | 'low' },
}))
const view = vi.hoisted(() => ({ crash: false }))

vi.mock('./support', async (original) => ({
  ...(await original<typeof import('./support')>()),
  explorerSupport: () => support.value,
}))

// the real view needs WebGL; this stand-in renders its hotspot buttons (or crashes)
vi.mock('./ExplorerView', () => ({
  default: ({
    model,
    onHotspot,
  }: {
    model: ExplorerModelDef
    onHotspot?: (id: string) => void
  }) => {
    if (view.crash) throw new Error('no WebGL context')
    return (
      <div data-testid="explorer-3d">
        {(model.hotspots ?? []).map((spot, index) => (
          <button key={spot.id} type="button" onClick={() => onHotspot?.(spot.id)}>
            {`3d-${index + 1}`}
          </button>
        ))}
      </div>
    )
  },
}))

const MODEL: ExplorerModelDef = {
  id: 'test',
  still: '/3d/dinosaur.webp',
  load: () => Promise.reject(new Error('not in tests')),
  hotspots: [
    { id: 'horns', position: [0, 1, 0], labelKey: 'explorer3d.zoomIn' },
    { id: 'tail', position: [1, 0, 0], labelKey: 'explorer3d.zoomOut' },
  ],
}

describe('Explorer3D', () => {
  beforeEach(() => {
    support.value = { webgl: false, auto: false, quality: 'high' }
    view.crash = false
  })

  it('shows the still picture at once, with its alt text', () => {
    render(<Explorer3D model={MODEL} label="Triceratops" />)
    expect(screen.getByRole('img', { name: 'Triceratops' })).toHaveAttribute(
      'src',
      '/3d/dinosaur.webp',
    )
    expect(screen.getByTestId('explorer')).toHaveAttribute('data-mode', 'still')
  })

  it('without WebGL stays on the picture with a note and no 3D button', () => {
    render(<Explorer3D model={MODEL} label="Triceratops" />)
    expect(screen.queryByTestId('explorer-open-3d')).not.toBeInTheDocument()
    expect(screen.getByTestId('explorer-note')).toHaveTextContent('Bu qurilmada rasm')
  })

  it('hotspot buttons under the picture call onHotspot', async () => {
    const onHotspot = vi.fn()
    const user = userEvent.setup()
    render(
      <Explorer3D model={MODEL} label="Triceratops" onHotspot={onHotspot} activeHotspot="tail" />,
    )
    await user.click(screen.getByRole('button', { name: /Yaqinlashtir/ }))
    expect(onHotspot).toHaveBeenCalledWith('horns')
    expect(screen.getByTestId('hotspot-tail')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('hotspot-horns')).toHaveAttribute('aria-pressed', 'false')
  })

  it('the "Turn in 3D" button opens the lazy view, whose hotspots work too', async () => {
    support.value = { webgl: true, auto: false, quality: 'high' }
    const onHotspot = vi.fn()
    const user = userEvent.setup()
    render(<Explorer3D model={MODEL} label="Triceratops" onHotspot={onHotspot} />)
    await user.click(screen.getByRole('button', { name: '3D’da aylantir' }))
    expect(await screen.findByTestId('explorer-3d')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '3d-2' }))
    expect(onHotspot).toHaveBeenCalledWith('tail')
  })

  it('opens 3D by itself on capable devices', async () => {
    support.value = { webgl: true, auto: true, quality: 'high' }
    render(<Explorer3D model={MODEL} label="Triceratops" />)
    expect(await screen.findByTestId('explorer-3d')).toBeInTheDocument()
    expect(screen.queryByTestId('explorer-open-3d')).not.toBeInTheDocument()
  })

  it('falls back to the picture with a friendly note when the 3D view crashes', async () => {
    support.value = { webgl: true, auto: true, quality: 'high' }
    view.crash = true
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<Explorer3D model={MODEL} label="Triceratops" />)
    expect(await screen.findByTestId('explorer-note')).toHaveTextContent('3D bu yerda ochilmadi')
    expect(screen.getByRole('img', { name: 'Triceratops' })).toBeInTheDocument()
    expect(screen.getByTestId('explorer')).toHaveAttribute('data-mode', 'failed')
    // every fact stays reachable without 3D
    expect(screen.getByTestId('hotspot-horns')).toBeInTheDocument()
    error.mockRestore()
  })
})

describe('Orbit', () => {
  it('keeps zoom and tilt within limits', () => {
    const orbit = new Orbit()
    for (let i = 0; i < 20; i += 1) orbit.zoomBy(1.5)
    expect(orbit.zoom).toBe(ORBIT_LIMITS.maxZoom)
    expect(orbit.zoomBy(1.5)).toBe(false)
    for (let i = 0; i < 20; i += 1) orbit.zoomBy(0.5)
    expect(orbit.zoom).toBe(ORBIT_LIMITS.minZoom)
    orbit.turn(0, 10)
    expect(orbit.pitch).toBe(ORBIT_LIMITS.maxPitch)
    orbit.reset()
    expect([orbit.yaw, orbit.pitch, orbit.zoom]).toEqual([0, 0, 1])
  })

  it('turns with one finger (no tilt), tilts with the mouse, zooms with a pinch', () => {
    const orbit = new Orbit()
    orbit.down(1, 100, 100, false)
    orbit.move(1, 150, 180)
    expect(orbit.yaw).toBeGreaterThan(0)
    expect(orbit.pitch).toBe(0)
    orbit.down(2, 200, 100)
    orbit.move(2, 300, 100)
    expect(orbit.zoom).toBeGreaterThan(1)
    orbit.up(1)
    orbit.up(2)
    const mouse = new Orbit()
    mouse.down(1, 0, 0, true)
    mouse.move(1, 0, 20)
    expect(mouse.pitch).toBeGreaterThan(0)
  })

  it('stops after a flick; the idle turn needs frames only when allowed', () => {
    const orbit = new Orbit()
    orbit.down(1, 0, 0)
    orbit.move(1, 30, 0)
    orbit.up(1)
    let frames = 0
    while (orbit.step(0.016, false) && frames < 500) frames += 1
    expect(frames).toBeLessThan(500)
    expect(orbit.step(0.016, false)).toBe(false)
    // the idle turn only before the first touch
    expect(orbit.step(0.016, true)).toBe(false)
    const fresh = new Orbit()
    expect(fresh.step(0.016, true)).toBe(true)
    fresh.zoomBy(1.2)
    expect(fresh.step(0.016, true)).toBe(false)
  })

  it('the idle turn ends by itself, so the canvas stops drawing frames', () => {
    const orbit = new Orbit()
    let frames = 0
    while (orbit.step(0.016, true) && frames < 10_000) frames += 1
    // ~6 s of 60 fps frames, never forever
    expect(frames * 0.016).toBeGreaterThan(IDLE_MAX_SECONDS - 0.1)
    expect(frames * 0.016).toBeLessThanOrEqual(IDLE_MAX_SECONDS + 0.05)
    expect(orbit.idleOver).toBe(true)
    expect(orbit.step(0.016, true)).toBe(false)
    // reduced motion: no idle turn at all
    const still = new Orbit()
    expect(still.step(0.016, false)).toBe(false)
    expect(still.yaw).toBe(0)
  })
})

describe('explorerQuality', () => {
  it('is low on small or weak devices', () => {
    expect(explorerQuality({ deviceMemory: 8, hardwareConcurrency: 8 }, 390)).toBe('high')
    expect(explorerQuality({ deviceMemory: 2, hardwareConcurrency: 8 }, 390)).toBe('low')
    expect(explorerQuality({ hardwareConcurrency: 4 }, 390)).toBe('low')
    expect(explorerQuality({ hardwareConcurrency: 8 }, 320)).toBe('low')
    expect(explorerQuality({ hardwareConcurrency: 2, deviceMemory: 8 }, 1024)).toBe('low')
  })
})
