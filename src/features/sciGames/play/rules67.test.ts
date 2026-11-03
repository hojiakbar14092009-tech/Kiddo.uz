import { describe, expect, it } from 'vitest'
import { SHAPE_KINDS, SHAPE_PICTURES, shapePath } from './shapeRules'
import { belongs, HABITATS, PLATE } from './sortRules'

describe('sorting games', () => {
  it('sends every animal and every food to a place that exists', () => {
    for (const set of [HABITATS, PLATE]) {
      const bins = set.bins.map((bin) => bin.id)
      for (const item of set.items) expect(bins).toContain(item.bin)
      // every place gets at least one thing
      for (const bin of bins) expect(set.items.some((item) => belongs(item, bin))).toBe(true)
      expect(new Set(set.items.map((item) => item.id)).size).toBe(set.items.length)
    }
  })

  it('calls food "every day" or "sometimes", never good or bad', () => {
    expect(PLATE.bins.map((bin) => bin.id)).toEqual(['everyday', 'sometimes'])
  })
})

describe('the shape builder', () => {
  it('builds pictures from the four shapes, all inside the box', () => {
    for (const picture of SHAPE_PICTURES) {
      expect(picture.slots.length).toBeGreaterThanOrEqual(3)
      for (const slot of picture.slots) {
        expect(SHAPE_KINDS).toContain(slot.kind)
        expect(slot.x - slot.size / 2).toBeGreaterThanOrEqual(0)
        expect(slot.y + slot.size / 2).toBeLessThanOrEqual(105)
        expect(shapePath(slot)).toMatch(/^M .* Z$/)
      }
    }
  })
})
