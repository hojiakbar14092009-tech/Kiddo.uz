import { beforeEach, describe, expect, it } from 'vitest'
import { en } from '@/i18n/locales/en'
import { uz } from '@/i18n/locales/uz'
import { useShortsStore } from '@/store/shortsStore'
import { cuesFor } from './captions'
import { FREE_SHORTS, freeLeft, isLive, mayWatch, SHORTS, videoUrl } from './catalog'

describe('cartoons', () => {
  beforeEach(() => useShortsStore.setState({ opened: {} }))

  it('gives every lesson a question with its pictures and words, and every bare cartoon its subtitles', () => {
    for (const short of SHORTS) {
      if (short.quiz) {
        expect(short.quiz.right).toBeLessThan(short.quiz.pics.length)
        const items = uz.shorts.items as Record<
          string,
          { quiz?: Record<string, string>; text: string }
        >
        const english = en.shorts.items as Record<string, { quiz?: Record<string, string> }>
        short.quiz.pics.forEach((_, i) => {
          expect(items[short.id]?.quiz?.[`a${i}`]).toBeTruthy()
          expect(english[short.id]?.quiz?.[`a${i}`]).toBeTruthy()
        })
        expect(items[short.id]?.quiz?.q).toBeTruthy()
      }
      if (short.bare)
        for (const lang of ['uz', 'ru', 'en'] as const)
          expect(cuesFor(short.id, lang).length).toBeGreaterThan(5)
    }
  })

  it('keeps only the cartoon in view and the next one as videos', () => {
    const live = (active: number) =>
      SHORTS.map((_, i) => i).filter((index) => isLive(index, active))
    expect(live(0)).toEqual([0, 1])
    expect(live(5)).toEqual([5, 6])
    expect(live(SHORTS.length - 1)).toEqual([SHORTS.length - 1])
  })

  it('lets Free open two different cartoons and watch those again', () => {
    expect(FREE_SHORTS).toBe(2)
    expect(mayWatch('water', [], false)).toBe(true)
    expect(mayWatch('magnet', ['water'], false)).toBe(true)
    expect(mayWatch('float', ['water', 'magnet'], false)).toBe(false)
    expect(mayWatch('water', ['water', 'magnet'], false)).toBe(true)
    expect(mayWatch('float', ['water', 'magnet'], true)).toBe(true)
    expect(freeLeft(['water'])).toBe(1)
    expect(freeLeft(['water', 'magnet', 'float'])).toBe(0)
  })

  it('counts each cartoon once per child', () => {
    const { open } = useShortsStore.getState()
    open('k1', 'water')
    open('k1', 'water')
    open('k2', 'seed')
    expect(useShortsStore.getState().opened).toEqual({ k1: ['water'], k2: ['seed'] })
    useShortsStore.getState().forgetChild('k1')
    expect(useShortsStore.getState().opened).toEqual({ k2: ['seed'] })
  })

  it('has one video per language and only learning cartoons', () => {
    expect(videoUrl('ru', 'planets')).toBe('/video/shorts/ru/planets.mp4')
    expect(SHORTS).toHaveLength(20)
    for (const short of SHORTS) expect(short.play === null || short.play.startsWith('/')).toBe(true)
  })
})
