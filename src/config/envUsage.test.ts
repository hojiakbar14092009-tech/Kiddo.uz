import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Phase 52: the app reads build variables one by one. `import.meta.env` used
 * as a whole object makes the bundler copy every VITE_ variable of the build
 * into the shipped code (a test-only admin PIN was found there this way).
 */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(name) && !/\.(test|d)\.tsx?$/.test(name) ? [path] : []
  })
}

describe('build variables', () => {
  it('are read by name, never as the whole import.meta.env object', () => {
    const offenders = sources(join(process.cwd(), 'src')).filter((file) =>
      /import\.meta\.env(?![.\w])/.test(readFileSync(file, 'utf8')),
    )
    expect(offenders).toEqual([])
  })
})
