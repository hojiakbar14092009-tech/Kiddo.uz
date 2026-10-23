import { describe, expect, it } from 'vitest'
import { EMPTY_UNIVERSE_CHILD } from '@/domain/universe/store'
import { EMPTY_LEARN_CHILD } from '@/features/learn/learnStore'
import type { ChildProfile } from '@/store/familyStore'
import { EMPTY_PROGRESS } from '@/store/progressStore'
import { buildChildExport, EXPORT_FORMAT, EXPORT_VERSION, exportFileName } from './exportData'

const child: ChildProfile = {
  id: 'kid-1',
  name: 'Lola',
  birthDate: '2021-05-01',
  celebratedLevel: 5,
  gender: 'girl',
  mascot: 'girl',
  dailyLimitMinutes: 30,
  createdAt: '2026-10-01T08:00:00.000Z',
}

describe('buildChildExport', () => {
  it('has the documented shape and only this child’s picture metadata, never the image', () => {
    const image = new Blob(['png'])
    const data = buildChildExport({
      child,
      progress: { ...EMPTY_PROGRESS, coins: 7 },
      learn: EMPTY_LEARN_CHILD,
      universe: EMPTY_UNIVERSE_CHILD,
      gallery: [
        {
          id: 'w1',
          childKey: 'kid-1',
          createdAt: Date.UTC(2026, 9, 2),
          bytes: 1234,
          image,
        } as never,
        { id: 'w2', childKey: 'someone-else', createdAt: 0, bytes: 1 },
      ],
      storage: 'device',
      now: new Date('2026-10-23T10:00:00.000Z'),
    })
    expect(Object.keys(data).sort()).toEqual(
      [
        'exportedAt',
        'format',
        'gallery',
        'learn',
        'profile',
        'progress',
        'storage',
        'universe',
        'version',
      ].sort(),
    )
    expect(data).toMatchObject({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: '2026-10-23T10:00:00.000Z',
      storage: 'device',
      profile: {
        id: 'kid-1',
        name: 'Lola',
        birthDate: '2021-05-01',
        gender: 'girl',
        dailyLimitMinutes: 30,
        homeworks: [],
      },
      progress: { coins: 7 },
    })
    expect(data.gallery).toEqual([{ id: 'w1', createdAt: '2026-10-02T00:00:00.000Z', bytes: 1234 }])
    // survives JSON and carries no blob
    const parsed = JSON.parse(JSON.stringify(data)) as typeof data
    expect(parsed.gallery[0]).not.toHaveProperty('image')
    expect(parsed.universe).toMatchObject({ balances: { star: 0 } })
  })

  it('writes null for stores the child has nothing in yet', () => {
    const data = buildChildExport({
      child,
      progress: undefined,
      learn: undefined,
      universe: undefined,
      gallery: [],
      storage: 'cloud',
    })
    expect(data).toMatchObject({ progress: null, learn: null, universe: null, storage: 'cloud' })
  })
})

describe('exportFileName', () => {
  it('keeps letters and digits of the name', () => {
    expect(exportFileName('Lola', '2026-10-23')).toBe('kiddo-lola-2026-10-23.json')
    expect(exportFileName('  Ali Vali / 2 ', '2026-10-23')).toBe('kiddo-ali-vali-2-2026-10-23.json')
    expect(exportFileName('Саша', '2026-10-23')).toBe('kiddo-саша-2026-10-23.json')
    expect(exportFileName('../..', '2026-10-23')).toBe('kiddo-child-2026-10-23.json')
  })
})
