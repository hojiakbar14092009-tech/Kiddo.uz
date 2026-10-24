import { render, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useContent3D, useContent3DActive } from './content3d'

function Content({ showing }: { showing: boolean }) {
  useContent3D(showing)
  return null
}

describe('one 3D view at a time', () => {
  it('is active while a content 3D view is on the page, and not after', () => {
    const { result } = renderHook(() => useContent3DActive())
    expect(result.current).toBe(false)
    const view = render(<Content showing />)
    expect(result.current).toBe(true)
    view.rerender(<Content showing={false} />)
    expect(result.current).toBe(false)
    view.rerender(<Content showing />)
    view.unmount()
    expect(result.current).toBe(false)
  })

  it('counts several views: the robot stays 2D until the last one goes', () => {
    const { result } = renderHook(() => useContent3DActive())
    const first = render(<Content showing />)
    const second = render(<Content showing />)
    first.unmount()
    expect(result.current).toBe(true)
    second.unmount()
    expect(result.current).toBe(false)
  })
})
