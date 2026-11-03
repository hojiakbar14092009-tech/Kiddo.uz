import { beforeEach, describe, expect, it } from 'vitest'
import { useShortsStore } from '@/store/shortsStore'
import { FREE_SHORTS, freeLeft, mayWatch, SHORTS, videoUrl } from './catalog'

describe('cartoons', () => {
  beforeEach(() => useShortsStore.setState({ opened: {} }))

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
    expect(SHORTS).toHaveLength(13)
    for (const short of SHORTS) expect(short.play === null || short.play.startsWith('/')).toBe(true)
  })
})
