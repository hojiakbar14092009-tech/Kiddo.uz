import { describe, expect, it } from 'vitest'
import { CHARACTER_STYLES, characterStyle } from '@/domain/adaptive'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { OUTFIT_CATEGORIES, OUTFIT_COLORS, OUTFITS, outfitColors, toneColor } from './outfits'
import { wardrobe } from './wardrobe'

/*
 * Phase 31: the wardrobe has categories, every item is open to every child
 * (no gender or age lock), and the learner's stage changes only the order
 * and the colours an item is shown in.
 */

describe('wardrobe catalogue', () => {
  it('every category has items, and every item has a name in uz/ru/en', () => {
    for (const category of OUTFIT_CATEGORIES) {
      expect(OUTFITS.some((outfit) => outfit.category === category)).toBe(true)
      for (const locale of [uz, ru, en]) {
        expect((locale.shop.categories as Record<string, string>)[category]).toBeTruthy()
      }
    }
    for (const outfit of OUTFITS) {
      for (const locale of [uz, ru, en]) {
        expect((locale.shop.items as Record<string, string>)[outfit.id]).toBeTruthy()
      }
      expect(OUTFIT_COLORS[outfit.id]).toBeTruthy()
      // nothing in an item says who may wear it
      expect(Object.keys(outfit).sort()).toEqual(['category', 'id', 'price', 'slot'])
    }
    expect(new Set(OUTFITS.map((outfit) => outfit.id)).size).toBe(OUTFITS.length)
  })

  it('the stage changes the order, never what is there', () => {
    for (const style of Object.values(CHARACTER_STYLES)) {
      const all = wardrobe(style.featured, 'all')
      expect(all.map((o) => o.id).sort()).toEqual(OUTFITS.map((o) => o.id).sort())
      expect(style.featured).toContain(all[0]!.category)
      const mine = wardrobe(style.featured, 'for-you')
      expect(mine.length).toBeGreaterThan(0)
      expect(mine.every((o) => style.featured.includes(o.category))).toBe(true)
    }
    expect(wardrobe([], 'traditional').map((o) => o.id)).toEqual(['doppi'])
  })
})

describe('outfit tones', () => {
  it('bright keeps the colour; rich and muted are calmer; white details stay light', () => {
    expect(toneColor('#5b8def', 'bright')).toBe('#5B8DEF')
    const saturation = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16)
      const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      return Math.max(...c) - Math.min(...c)
    }
    const bright = '#E2574C'
    expect(saturation(toneColor(bright, 'rich'))).toBeLessThan(saturation(bright))
    expect(saturation(toneColor(bright, 'muted'))).toBeLessThan(
      saturation(toneColor(bright, 'rich')),
    )
    expect(toneColor('#FFFFFF', 'muted')).toBe('#FFFFFF')
    expect(toneColor('#E2574C', 'muted')).toMatch(/^#[0-9A-F]{6}$/)
  })

  it('an item keeps the same parts in every tone (the same shape, other colours)', () => {
    for (const outfit of OUTFITS) {
      const keys = Object.keys(OUTFIT_COLORS[outfit.id]).sort()
      for (const tone of ['bright', 'rich', 'muted'] as const) {
        expect(Object.keys(outfitColors(outfit.id, tone)).sort()).toEqual(keys)
      }
    }
  })
})

describe('character maturity (by real age, never by level)', () => {
  it('maps ages to three stages; a guest is young', () => {
    expect(characterStyle(null).stage).toBe('young')
    expect(characterStyle(4).stage).toBe('young')
    expect(characterStyle(6).stage).toBe('young')
    expect(characterStyle(8).stage).toBe('middle')
    expect(characterStyle(11).stage).toBe('older')
    expect(characterStyle(14).stage).toBe('older')
    expect(characterStyle(40).stage).toBe('older')
  })

  it('maturity is more than size: gesture, idle, posture and colours change too', () => {
    const { young, middle, older } = CHARACTER_STYLES
    for (const [a, b] of [
      [young, middle],
      [middle, older],
    ] as const) {
      expect(b.jump).toBeLessThan(a.jump)
      expect(b.breath).toBeLessThan(a.breath)
      expect(b.sway).toBeLessThan(a.sway)
      expect(b.armRest).toBeLessThan(a.armRest)
      expect(b.idleTempo).toBeLessThan(a.idleTempo)
      expect(b.idleCalm).toBeGreaterThan(a.idleCalm)
      expect(b.tone).not.toBe(a.tone)
    }
    // proportions change gently (the head), the robot is never made taller
    for (const style of [young, middle, older]) {
      expect(style.headScale).toBeGreaterThanOrEqual(0.85)
      expect(style.headScale).toBeLessThanOrEqual(1)
      expect(style).not.toHaveProperty('height')
      expect(style).not.toHaveProperty('scale')
    }
  })
})

describe('stage categories', () => {
  it('every featured category of every stage exists in the wardrobe', () => {
    for (const style of Object.values(CHARACTER_STYLES)) {
      for (const category of style.featured) {
        expect(OUTFIT_CATEGORIES as readonly string[]).toContain(category)
      }
    }
  })
})
