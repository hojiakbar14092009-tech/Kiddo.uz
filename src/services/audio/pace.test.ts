import { describe, expect, it } from 'vitest'
import { letterPauseMs } from './pace'

describe('the pause between a letter and its word', () => {
  it('is longest at four and longer still when a parent makes the voice slower', () => {
    expect(letterPauseMs(4, false)).toBeGreaterThan(letterPauseMs(5, false))
    expect(letterPauseMs(5, false)).toBeGreaterThan(letterPauseMs(6, false))
    expect(letterPauseMs(6, false)).toBeGreaterThanOrEqual(500)
    expect(letterPauseMs(4, true)).toBe(Math.round(letterPauseMs(4, false) * 1.6))
    expect(letterPauseMs(6, true)).toBeGreaterThan(letterPauseMs(6, false))
  })
})
