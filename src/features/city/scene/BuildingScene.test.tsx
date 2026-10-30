import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BuildingScene } from './BuildingScene'
import { NAMED_STAGES, STYLES, styleOf } from './looks'

function scene(buildingId: string, level: number) {
  const { container } = render(<BuildingScene buildingId={buildingId} level={level} />)
  return container.querySelector('svg')!
}

describe('a City building evolves in architecture, light and ground', () => {
  it('each level draws more architecture, a richer ground and new light', () => {
    const counts = [0, 1, 2, 3].map(
      (level) => scene('math-land', level).querySelectorAll('*').length,
    )
    // strictly growing scenes: level 1 is a bare plot, the top level a lit evening city
    expect(counts).toEqual([...counts].sort((a, b) => a - b))
    expect(new Set(counts).size).toBe(4)
    expect(scene('math-land', 0).querySelector('linearGradient')).toBeNull() // the card's own tint
    expect(scene('math-land', 3).querySelectorAll('circle').length).toBeGreaterThan(10) // stars, lit windows, lamps
  })

  it('every building has a style with three richer stages, and the eight named places', () => {
    for (const look of Object.values(STYLES)) {
      const [a, b, c] = look.stages
      expect(a.length).toBeLessThan(c.length)
      expect(b.length).toBeGreaterThanOrEqual(a.length)
    }
    expect(styleOf('math-land')).toBe('academy')
    expect(styleOf('spaceport')).toBe('spaceport')
    expect(styleOf('unknown')).toBe('town')
    expect(NAMED_STAGES.size).toBe(8)
    expect(scene('spaceport', 3).dataset.style).toBe('spaceport')
  })
})
