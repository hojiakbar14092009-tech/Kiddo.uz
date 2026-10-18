import { beforeEach, describe, expect, it } from 'vitest'
import { unseenExits, useActivityStore } from './activityStore'

describe('activityStore', () => {
  beforeEach(() => useActivityStore.setState({ events: [], seenAt: null }))

  it('records leaving and coming back, ignoring repeats', () => {
    const { record } = useActivityStore.getState()
    record('ali', 'returned', new Date(2026, 9, 18, 20, 0))
    record('ali', 'left', new Date(2026, 9, 18, 20, 53))
    record('ali', 'left', new Date(2026, 9, 18, 20, 54))
    record('ali', 'returned', new Date(2026, 9, 18, 21, 5))
    const events = useActivityStore.getState().events
    expect(events.map((event) => event.kind)).toEqual(['left', 'returned'])
    expect(new Date(events[0]!.at).getMinutes()).toBe(53)
  })

  it('counts exits the parent has not seen yet', () => {
    const { record, markSeen } = useActivityStore.getState()
    record('ali', 'left', new Date(2026, 9, 18, 9, 0))
    markSeen(new Date(2026, 9, 18, 10, 0))
    record('ali', 'returned', new Date(2026, 9, 18, 11, 0))
    record('ali', 'left', new Date(2026, 9, 18, 12, 0))
    const { events, seenAt } = useActivityStore.getState()
    expect(unseenExits(events, seenAt)).toHaveLength(1)
  })
})
