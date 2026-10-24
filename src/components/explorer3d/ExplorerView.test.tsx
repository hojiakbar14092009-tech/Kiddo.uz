import { act, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { Explorer3D } from './Explorer3D'
import { disposeObject } from './lights'
import type { ExplorerModelDef } from './types'

/*
 * The real ExplorerView (model loading, disposal, context loss), inside the
 * real Explorer3D. Only R3F's Canvas is replaced: jsdom has no WebGL, so the
 * stand-in renders a plain <canvas> and hands it to `onCreated` as the GL
 * element; the scene itself (useFrame/useThree) is not run.
 */

vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    onCreated,
  }: {
    onCreated?: (state: {
      gl: {
        setClearColor: () => void
        domElement: HTMLCanvasElement
        debug: { checkShaderErrors: boolean }
      }
    }) => void
  }) => {
    const ref = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
      if (ref.current)
        onCreated?.({
          gl: {
            setClearColor: () => undefined,
            domElement: ref.current,
            debug: { checkShaderErrors: true },
          },
        })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return <canvas ref={ref} data-testid="r3f-canvas" />
  },
  useFrame: () => undefined,
  useThree: () => ({}),
}))

vi.mock('./lights', async (original) => ({
  ...(await original<typeof import('./lights')>()),
  disposeObject: vi.fn(),
}))

vi.mock('./support', async (original) => ({
  ...(await original<typeof import('./support')>()),
  explorerSupport: () => ({ webgl: true, auto: true, quality: 'high' }),
}))

function modelWith(load: ExplorerModelDef['load']): ExplorerModelDef {
  return {
    id: 'test',
    still: '/3d/dinosaur.webp',
    load,
    hotspots: [{ id: 'horns', position: [0, 1, 0], labelKey: 'explorer3d.zoomIn' }],
  }
}

describe('ExplorerView (real, with a stand-in Canvas)', () => {
  beforeEach(() => {
    vi.mocked(disposeObject).mockClear()
  })

  it('a model whose builder fails to load falls back to the still picture', async () => {
    const load = vi.fn(() => Promise.reject(new Error('chunk failed')))
    render(<Explorer3D model={modelWith(load)} label="Triceratops" />)
    await waitFor(() =>
      expect(screen.getByTestId('explorer')).toHaveAttribute('data-mode', 'failed'),
    )
    expect(load).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('img', { name: 'Triceratops' })).toHaveAttribute(
      'src',
      '/3d/dinosaur.webp',
    )
    expect(screen.queryByTestId('explorer-3d')).not.toBeInTheDocument()
    expect(screen.getByTestId('explorer-note')).toHaveTextContent('3D bu yerda ochilmadi')
    // every point stays reachable under the picture
    expect(screen.getByTestId('hotspot-horns')).toBeInTheDocument()
  })

  it('builds the model, shows the canvas, and frees its GPU memory on unmount', async () => {
    const object = new THREE.Group()
    const build = vi.fn(() => object)
    const { unmount } = render(
      <Explorer3D model={modelWith(() => Promise.resolve(build))} label="Triceratops" />,
    )
    await waitFor(() =>
      expect(screen.getByTestId('explorer-3d')).toHaveAttribute('data-ready', 'true'),
    )
    expect(build).toHaveBeenCalledWith('high')
    expect(screen.getByTestId('r3f-canvas')).toHaveAttribute('aria-label', 'Triceratops')
    expect(disposeObject).not.toHaveBeenCalled()
    unmount()
    expect(disposeObject).toHaveBeenCalledTimes(1)
    expect(disposeObject).toHaveBeenCalledWith(object)
  })

  it('a lost WebGL context falls back to the still picture (and frees the model)', async () => {
    const object = new THREE.Group()
    render(
      <Explorer3D model={modelWith(() => Promise.resolve(() => object))} label="Triceratops" />,
    )
    const canvas = await screen.findByTestId('r3f-canvas')
    expect(screen.getByTestId('explorer')).toHaveAttribute('data-mode', '3d')
    act(() => {
      canvas.dispatchEvent(new Event('webglcontextlost'))
    })
    expect(screen.getByTestId('explorer')).toHaveAttribute('data-mode', 'failed')
    expect(screen.queryByTestId('r3f-canvas')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Triceratops' })).toBeInTheDocument()
    expect(disposeObject).toHaveBeenCalledWith(object)
  })
})
