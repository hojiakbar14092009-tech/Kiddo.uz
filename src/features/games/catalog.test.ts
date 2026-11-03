import { describe, expect, it } from 'vitest'
import { routes } from '@/app/routes'
import { BUILDINGS } from '@/domain/universe/world'
import { en } from '@/i18n/locales/en'
import { entryKey, GAMES, SUBJECTS } from './catalog'

function paths(list: typeof routes, out: string[] = []): string[] {
  for (const route of list) {
    if (route.path) out.push(route.path)
    if (route.children) paths(route.children, out)
  }
  return out
}

function has(tree: unknown, key: string): boolean {
  return (
    typeof key
      .split('.')
      .reduce<unknown>(
        (node, part) =>
          node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
        tree,
      ) === 'string'
  )
}

describe('games catalog', () => {
  it('has every subject, and each game once', () => {
    expect(SUBJECTS.every((subject) => GAMES[subject].length > 0)).toBe(true)
    const keys = SUBJECTS.flatMap((subject) => GAMES[subject].map(entryKey))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('points only at real places, pages and words', () => {
    const known = paths(routes)
    for (const subject of SUBJECTS)
      for (const entry of GAMES[subject]) {
        if (entry.kind === 'building') expect(BUILDINGS.some((b) => b.id === entry.id)).toBe(true)
        if (entry.kind === 'page') {
          const path = entry.to.split('?')[0]!
          expect(
            known.some(
              (route) =>
                route === path || (route.includes(':') && path.startsWith(route.split(':')[0]!)),
            ),
          ).toBe(true)
          expect(has(en, entry.labelKey)).toBe(true)
        }
      }
  })
})
