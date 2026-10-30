import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_SETTINGS } from '@/store/appSettingsStore'
import { FUTURE_PRO_PRICES } from './futurePrices'

const ROOT = join(__dirname, '../..')
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : []
  })

describe('future PRO price (preserved, not active)', () => {
  it('keeps the planned figures', () => {
    expect(FUTURE_PRO_PRICES).toEqual({ monthly: 24_990, yearly: 238_990 })
  })

  it('is not the live price and no app code reads it', () => {
    expect(DEFAULT_APP_SETTINGS.prices.monthly).not.toBe(FUTURE_PRO_PRICES.monthly)
    const readers = files(ROOT)
      .filter((path) => !/futurePrices(\.test)?\.ts$/.test(path))
      .filter((path) => readFileSync(path, 'utf8').includes('FUTURE_PRO_PRICES'))
      .map((path) => relative(ROOT, path))
    expect(readers).toEqual([])
  })
})
