import { describe, expect, it } from 'vitest'
import {
  createGallery,
  GALLERY_LIMITS,
  memoryBackend,
  planEviction,
  type GalleryBackend,
} from './gallery'

const meta = (id: string, createdAt: number, bytes = 100) => ({
  id,
  childKey: 'kid',
  createdAt,
  bytes,
})

describe('planEviction', () => {
  it('keeps everything while there is room', () => {
    expect(planEviction([meta('a', 1), meta('b', 2)], { bytes: 100 })).toEqual([])
  })

  it('removes the oldest work when the 31st is saved', () => {
    const works = Array.from({ length: GALLERY_LIMITS.maxWorks }, (_, i) => meta(`w${i}`, 100 - i))
    expect(planEviction(works, { bytes: 100 })).toEqual(['w29'])
  })

  it('removes as many old works as the size limit needs', () => {
    const limits = { maxWorks: 30, maxBytes: 1000 }
    const works = [meta('new', 3, 400), meta('old', 1, 400), meta('mid', 2, 400)]
    expect(planEviction(works, { bytes: 500 }, limits)).toEqual(['old', 'mid'])
  })
})

describe('gallery', () => {
  const image = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/png' })

  it('keeps each child’s works apart, newest first', async () => {
    let time = 0
    const gallery = createGallery(memoryBackend(), () => (time += 1))
    await gallery.save('kid', 'a', image(10))
    await gallery.save('kid', 'b', image(10))
    await gallery.save('other', 'c', image(10))
    expect((await gallery.list('kid')).map((work) => work.id)).toEqual(['b', 'a'])
    expect((await gallery.list('other')).map((work) => work.id)).toEqual(['c'])

    await gallery.remove('b')
    expect((await gallery.list('kid')).map((work) => work.id)).toEqual(['a'])
    await gallery.removeChild('kid')
    expect(await gallery.list('kid')).toEqual([])
  })

  it('stays at 30 works and says how many old ones were removed', async () => {
    let time = 0
    const gallery = createGallery(memoryBackend(), () => (time += 1))
    for (let i = 0; i < GALLERY_LIMITS.maxWorks; i += 1) {
      expect((await gallery.save('kid', `w${i}`, image(5))).removed).toBe(0)
    }
    const result = await gallery.save('kid', 'last', image(5))
    expect(result.removed).toBe(1)
    const ids = (await gallery.list('kid')).map((work) => work.id)
    expect(ids).toHaveLength(GALLERY_LIMITS.maxWorks)
    expect(ids).not.toContain('w0')
    expect(ids[0]).toBe('last')
  })

  it('stores the new work before removing the oldest', async () => {
    const memory = memoryBackend()
    const calls: string[] = []
    const logged: GalleryBackend = {
      list: memory.list,
      put: async (work) => {
        calls.push(`put ${work.id}`)
        await memory.put(work)
      },
      remove: async (id) => {
        calls.push(`remove ${id}`)
        await memory.remove(id)
      },
    }
    let time = 0
    const gallery = createGallery(logged, () => (time += 1))
    for (let i = 0; i < GALLERY_LIMITS.maxWorks; i += 1)
      await gallery.save('kid', `w${i}`, image(5))
    calls.length = 0
    await gallery.save('kid', 'new', image(5))
    expect(calls).toEqual(['put new', 'remove w0'])
  })

  it('reports a failed write and removes nothing', async () => {
    const memory = memoryBackend()
    let time = 0
    const gallery = createGallery(
      { ...memory, put: () => Promise.reject(new Error('quota')) },
      () => (time += 1),
    )
    await memory.put({ id: 'old', childKey: 'kid', createdAt: 0, bytes: 5, image: image(5) })
    await expect(gallery.save('kid', 'new', image(5))).rejects.toThrow('quota')
    expect((await gallery.list('kid')).map((work) => work.id)).toEqual(['old'])
  })

  it('reports a failed read instead of an empty gallery', async () => {
    const gallery = createGallery({
      ...memoryBackend(),
      list: () => Promise.reject(new Error('blocked')),
    })
    await expect(gallery.list('kid')).rejects.toThrow('blocked')
  })
})
