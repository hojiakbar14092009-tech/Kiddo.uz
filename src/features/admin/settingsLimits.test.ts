import { describe, expect, it } from 'vitest'
import { clampGift, MAX_PRO_GIFT_COINS } from './settingsLimits'

describe('PRO gift coins', () => {
  it('stay between 0 and what the server ledger accepts', () => {
    expect(clampGift(50)).toBe(50)
    expect(clampGift(5000)).toBe(MAX_PRO_GIFT_COINS)
    expect(clampGift(-3)).toBe(0)
    expect(clampGift(Number.NaN)).toBe(0)
  })
})
