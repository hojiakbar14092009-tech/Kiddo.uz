import { describe, expect, it } from 'vitest'
import { useProgressStore } from '@/store/progressStore'
import { FRIEND_DAYS, historyDays, homeLine, mascotMemory } from './life'

/* Phase 43: the robot remembers the days before — from the child's own data only. */

const at = (day: string, hour = 10) =>
  new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString()
const base = { hour: 10, name: 'Aziza', birthday: false, homework: 0, planDone: false }
const today = '2026-11-05'

describe('what the robot remembers', () => {
  it('knows how long the child was away, from the history and its own count', () => {
    expect(
      mascotMemory({ today, resultDays: ['2026-11-01', '2026-11-03'], runs: [] }).awayDays,
    ).toBe(2)
    // the capped history lost the last day; the robot's own count still has it
    expect(
      mascotMemory({
        today,
        bond: { days: 40, last: '2026-11-04' },
        resultDays: ['2026-10-01'],
        runs: [],
      }).awayDays,
    ).toBe(1)
    expect(mascotMemory({ today, resultDays: [], runs: [] }).awayDays).toBe(0)
    expect(mascotMemory({ today, resultDays: ['2026-10-01', today], runs: [] }).awayDays).toBe(0)
  })

  it('knows what was played yesterday, one count per finished run', () => {
    const runs = [
      { at: at('2026-11-04', 9), strand: 'number' as const },
      { at: at('2026-11-04', 18), strand: 'number' as const },
      { at: at('2026-11-04', 19), strand: 'letters' as const },
      { at: at('2026-11-03', 19), strand: 'letters' as const },
      { at: 'not a time', strand: 'letters' as const },
    ]
    // many letter-task results do not outweigh what the runs say
    const memory = mascotMemory({
      today,
      resultDays: ['2026-11-04', '2026-11-04', '2026-11-04'],
      runs,
    })
    expect(memory.yesterday).toBe('numbers')
    expect(mascotMemory({ today, resultDays: [], runs: [] }).yesterday).toBeNull()
    expect(
      mascotMemory({
        today: '2026-12-01',
        resultDays: [],
        runs: [{ at: at('2026-11-30'), strand: 'logic' }],
      }).yesterday,
    ).toBe('play')
  })

  it('a friendship day is said once, only on a day really played', () => {
    for (const days of FRIEND_DAYS) {
      expect(
        mascotMemory({ today, bond: { days, last: today }, resultDays: [], runs: [] }).friendDay,
      ).toBe(days)
      expect(
        mascotMemory({ today, bond: { days, last: today, said: days }, resultDays: [], runs: [] })
          .friendDay,
      ).toBeNull()
    }
    // two days played and today not yet: not "three days"
    expect(
      mascotMemory({ today, bond: { days: 2, last: '2026-11-04' }, resultDays: [], runs: [] })
        .friendDay,
    ).toBeNull()
    // a friendship day passed while "I missed you" came first is still said, later
    expect(
      mascotMemory({ today, bond: { days: 4, last: today }, resultDays: [], runs: [] }).friendDay,
    ).toBe(3)
    expect(
      mascotMemory({ today, bond: { days: 9, last: today, said: 7 }, resultDays: [], runs: [] })
        .friendDay,
    ).toBeNull()
    // long past it (a child counted from its history): not said any more
    expect(
      mascotMemory({ today, bond: { days: 40, last: today }, resultDays: [], runs: [] }).friendDay,
    ).toBeNull()
    expect(
      mascotMemory({ today, bond: { days: 33, last: today, said: 14 }, resultDays: [], runs: [] })
        .friendDay,
    ).toBe(30)
  })

  it('history days are distinct and sorted', () => {
    expect(
      historyDays({
        today,
        resultDays: ['2026-11-03', '2026-11-01', '2026-11-03', 'broken'],
        runs: [{ at: at('2026-11-02'), strand: 'art' }],
      }),
    ).toEqual(['2026-11-01', '2026-11-02', '2026-11-03'])
  })
})

describe('the robot counts its days (never fewer)', () => {
  it('counts each day once, seeds from the history once, and keeps what it said', () => {
    useProgressStore.setState({ byChild: {} })
    const s = useProgressStore.getState()
    const bond = (key: string) => useProgressStore.getState().byChild[key]?.robotBond
    s.recordRobotDay('kid-a', '2026-11-01', 5)
    expect(bond('kid-a')?.days).toBe(6)
    s.recordRobotDay('kid-a', '2026-11-01', 99)
    expect(bond('kid-a')?.days).toBe(6)
    s.markRobotFriendSaid('kid-a', 7)
    s.recordRobotDay('kid-a', '2026-11-02', 99)
    expect(bond('kid-a')).toEqual({ days: 7, last: '2026-11-02', said: 7 })
    s.markRobotFriendSaid('kid-a', 3)
    expect(bond('kid-a')?.said).toBe(7)
    expect(bond('kid-b')).toBeUndefined()
  })
})

describe('the Home line remembers', () => {
  const memory = { friendDay: null, yesterday: null, awayDays: 0 }

  it('says a friendship day', () => {
    expect(homeLine({ ...base, memory: { ...memory, friendDay: 7 } }).key).toBe('friend7Named')
    expect(homeLine({ ...base, name: null, memory: { ...memory, friendDay: 3 } }).key).toBe(
      'friend3',
    )
    expect(homeLine({ ...base, memory }).key).toBe('morningNamed')
  })

  it('missing the child comes first; else a friendship day; else yesterday', () => {
    expect(homeLine({ ...base, memory: { ...memory, awayDays: 3, friendDay: 3 } }).key).toBe(
      'missedNamed',
    )
    expect(homeLine({ ...base, memory: { ...memory, awayDays: 2 } }).key).toBe('morningNamed')
    expect(homeLine({ ...base, memory: { ...memory, awayDays: 1, yesterday: 'numbers' } })).toEqual(
      { key: 'yesterday.numbers', params: {} },
    )
  })

  it('night, a birthday, homework and a finished plan still come first', () => {
    const m = { friendDay: 7, yesterday: 'letters' as const, awayDays: 5 }
    expect(homeLine({ ...base, hour: 23, memory: m }).key).toBe('nightNamed')
    expect(homeLine({ ...base, birthday: true, memory: m }).key).toBe('birthdayNamed')
    expect(homeLine({ ...base, homework: 1, memory: m }).key).toBe('homeworkNamed')
    expect(homeLine({ ...base, planDone: true, memory: m }).key).toBe('planDone')
  })
})
