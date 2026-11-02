import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BasketTask } from './BasketTask'

/* Ten objects stand in four rows on the smallest phone: smaller tiles there, still 44 px. */

describe('BasketTask on a small phone', () => {
  it('ten objects get the smaller tile (44 px) below sm; nine keep the usual one', () => {
    const { unmount } = render(
      <BasketTask object="strawberry" available={10} locked={false} onDone={() => undefined} />,
    )
    for (const tile of screen.getAllByTestId('lab-object')) {
      expect(tile.className).toContain('max-sm:size-11')
      expect(tile.className).toContain('size-12')
    }
    unmount()
    render(<BasketTask object="strawberry" available={9} locked={false} onDone={() => undefined} />)
    for (const tile of screen.getAllByTestId('lab-object')) {
      expect(tile.className).not.toContain('max-sm:size-11')
    }
  })
})
