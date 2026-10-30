import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SHAPES, shadowOf } from './geometry'
import { SideMap } from './views'

/* Phase 34: the map from above agrees with the wall view about left and right. */

describe('SideMap', () => {
  it('a lamp on the left (−x) is drawn on the left of someone facing the wall: up the map', () => {
    const scene = {
      at: { z: 5, x: 0, y: 0, rotate: 0, tilt: 0 },
      light: { x: -3, y: 0 },
    }
    const { container } = render(<SideMap scene={scene} shape={SHAPES.square} label="map" />)
    const lamp = container.querySelector('[data-map-light]')!
    // facing the wall (to the right of the map), your left hand points up the picture
    expect(Number(lamp.getAttribute('cy'))).toBe(-3)
    // and the shadow falls on the other side: right on the wall view (+x), down the map
    const wall = shadowOf(SHAPES.square, scene.at, scene.light)
    expect(Math.min(...wall.map(([x]) => x))).toBeGreaterThan(0)
    const shadowOnMap = [...container.querySelectorAll('line')].find(
      (line) => line.getAttribute('stroke') === '#3B2F5C',
    )!
    expect(Number(shadowOnMap.getAttribute('y1'))).toBeGreaterThan(0)
    expect(Number(shadowOnMap.getAttribute('y2'))).toBeGreaterThan(0)
  })

  it('the detective maps hide the rays and the shadow (the learner works them out)', () => {
    const scene = { at: { z: 5, x: 0, y: 0, rotate: 0, tilt: 0 }, light: { x: 2, y: 0 } }
    const { container } = render(
      <SideMap scene={scene} shape={SHAPES.square} label="map" rays={false} />,
    )
    expect(container.querySelector('polygon')).toBeNull()
    expect(
      [...container.querySelectorAll('line')].some((l) => l.getAttribute('stroke') === '#3B2F5C'),
    ).toBe(false)
  })
})
