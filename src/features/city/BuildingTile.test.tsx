import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { BuildingTile } from './BuildingTile'

function tile(level: number) {
  render(
    <MemoryRouter>
      <ul>
        <BuildingTile
          name="Matematika"
          icon3d="castle"
          route={`/l${level}`}
          tint="bg-sky-soft"
          level={level}
          maxLevel={3}
        />
      </ul>
    </MemoryRouter>,
  )
  return screen.getByTestId(`building-/l${level}`)
}

const pictures = (el: HTMLElement) => el.querySelectorAll('img').length

describe('building levels look different, not only by stars', () => {
  it('each level adds to the plot, and the top level gets a gold frame', () => {
    const tiles = [0, 1, 2, 3].map(tile)
    // the house itself plus the plot's plants (the drawn scene adds the rest)
    expect(tiles.map(pictures)).toEqual([1, 2, 3, 4])
    const top = tiles[3]!.querySelector('a')!
    expect(top).toHaveAttribute('data-level', '4')
    expect(top.className).toContain('ring-coin')
    expect(tiles[0]!.querySelector('a')!.className).not.toContain('ring-')
  })
})
