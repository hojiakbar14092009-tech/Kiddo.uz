import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MascotFigure } from './MascotFigure'
import { canRender3D, resetWebGLDetection } from './webgl'

describe('MascotFigure', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetWebGLDetection()
  })

  it('falls back to the SVG robot when WebGL is not available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    render(<MascotFigure model="boy" label="Bipbot" />)
    expect(screen.getByRole('img', { name: 'Bipbot' }).tagName.toLowerCase()).toBe('svg')
  })

  it('uses the 2D robot on very weak devices', () => {
    vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(2)
    expect(canRender3D()).toBe(false)
  })
})
