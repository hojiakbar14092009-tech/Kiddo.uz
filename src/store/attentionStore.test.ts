import { beforeEach, describe, expect, it } from 'vitest'
import { LOG_DAYS, useAttentionStore } from './attentionStore'

describe('the attention log (Phase 71)', () => {
  beforeEach(() => useAttentionStore.setState({ log: {} }))

  it('counts per child and per day, each child apart', () => {
    const { note } = useAttentionStore.getState()
    note('a', '2026-11-01', 'reminders')
    note('a', '2026-11-01', 'reminders')
    note('a', '2026-11-01', 'games')
    note('b', '2026-11-01', 'away')
    const { log } = useAttentionStore.getState()
    expect(log.a!['2026-11-01']).toEqual({ reminders: 2, away: 0, offers: 0, games: 1 })
    expect(log.b!['2026-11-01']).toEqual({ reminders: 0, away: 1, offers: 0, games: 0 })
  })

  it('keeps only the latest days', () => {
    const { note } = useAttentionStore.getState()
    for (let day = 1; day <= LOG_DAYS + 5; day += 1) {
      note('a', `2026-10-${String(day).padStart(2, '0')}`, 'offers')
    }
    const days = Object.keys(useAttentionStore.getState().log.a!)
    expect(days).toHaveLength(LOG_DAYS)
    expect(days).not.toContain('2026-10-01')
  })

  it('forgets a removed child', () => {
    const { note, forgetChild } = useAttentionStore.getState()
    note('a', '2026-11-01', 'reminders')
    note('b', '2026-11-01', 'reminders')
    forgetChild('a')
    expect(useAttentionStore.getState().log.a).toBeUndefined()
    expect(useAttentionStore.getState().log.b).toBeDefined()
  })
})
