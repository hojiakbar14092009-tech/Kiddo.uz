import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Img3D } from './Img3D'

describe('Img3D', () => {
  it('shows a soft star instead of an empty square when the picture fails to load', () => {
    const { container, rerender } = render(<Img3D name="rocket" className="size-10" />)
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[data-fallback="img3d"]')).toHaveClass('size-10')
    // another picture in the same place tries again
    rerender(<Img3D name="house" className="size-10" />)
    expect(container.querySelector('img')).toHaveAttribute('src', '/3d/house.webp')
  })
})
