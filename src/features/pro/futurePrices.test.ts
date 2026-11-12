import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FUTURE_PRO_PRICES } from './futurePrices'

const ROOT = join(__dirname, '../..')
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : []
  })

describe('the PRO price (MVP)', () => {
  it('keeps the planned figures', () => {
    expect(FUTURE_PRO_PRICES).toEqual({ monthly: 24_990, yearly: 238_990 })
  })

  it('is the MVP price: only the plans read it, and the server charges the same', async () => {
    const readers = files(ROOT)
      .filter((path) => !/futurePrices(\.test)?\.ts$/.test(path))
      .filter((path) => readFileSync(path, 'utf8').includes('FUTURE_PRO_PRICES'))
      .map((path) => relative(ROOT, path).split('\\').join('/'))
    expect(readers).toEqual(['features/pro/plans.ts'])
    const { PLANS } = await import('../../../server/pay')
    expect([PLANS.month.amount, PLANS.year.amount]).toEqual([
      FUTURE_PRO_PRICES.monthly,
      FUTURE_PRO_PRICES.yearly,
    ])
  })
})
