import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Phase 22: one adaptation layer. Age policy lives in the age profile
 * (domain/adaptive/ageProfile.ts) and the learner profile; screens ask the
 * resolvers (`useContentTier`, `ageProfile`, `adaptivePlan`) instead of
 * comparing ages themselves. This test keeps it that way.
 */

const ROOT = join(__dirname, '..', '..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

const SOURCES = files(ROOT).map((path) => ({
  path: relative(ROOT, path).replaceAll('\\', '/'),
  text: readFileSync(path, 'utf8'),
}))

/** The only modules that may state an age rule. */
const POLICY = new Set(['domain/adaptive/ageProfile.ts', 'features/age/ageLevel.ts'])

function offenders(pattern: RegExp, allowed: ReadonlySet<string>): string[] {
  return SOURCES.filter(({ path }) => !allowed.has(path))
    .filter(({ text }) =>
      text
        .split('\n')
        // comments may talk about ages
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .some((line) => pattern.test(line)),
    )
    .map(({ path }) => path)
}

describe('age policy has one home', () => {
  it('no module compares an age with a number outside the age profile', () => {
    expect(offenders(/\bage\s*(<=|>=|<|>|===|!==)\s*\d/, POLICY)).toEqual([])
    expect(offenders(/childAge\([^;]*\)\s*(<=|>=|<|>|===|!==)\s*\d/, POLICY)).toEqual([])
  })

  it('no screen picks its own band or level by age', () => {
    expect(offenders(/ageBand\(.*\)\s*===/, POLICY)).toEqual([])
    // the age level (4/5/6) is for age suggestions and the look only
    expect(
      offenders(
        /useAgeLevel\(\)/,
        new Set([
          'store/familyStore.ts',
          'features/home/HomePage.tsx', // today's plan and "N yoshdan tavsiya"
          'features/age/AgeTheme.tsx', // the look (data-age)
        ]),
      ),
    ).toEqual([])
  })

  it('learning screens take their items from the strand resolver', () => {
    const screens = [
      'features/math/MathPage.tsx',
      'features/garden/GardenPage.tsx',
      'features/firstWords/FirstWordsPage.tsx',
      'features/helpMascot/HelpMascotPage.tsx',
      'features/space/SpacePage.tsx',
      'features/tales/TalesPage.tsx',
      'features/tasks/MemoryGame.tsx',
      'features/tasks/ChoiceGame.tsx',
    ]
    for (const screen of screens) {
      const source = SOURCES.find(({ path }) => path === screen)
      expect(source?.text, screen).toContain('useContentTier(')
    }
  })
})
