import { describe, expect, it } from 'vitest'
import type { RecentRun } from '@/domain/universe/history'
import type { ActivityHomework, LetterHomework } from '@/store/familyStore'
import { homeworkStatus } from './status'

const activity = (changes: Partial<ActivityHomework> = {}): ActivityHomework => ({
  kind: 'activity',
  id: 'h',
  target: 'mathLab',
  times: 2,
  runs: [],
  assignedAt: '2026-10-01T08:00:00Z',
  completedAt: null,
  dueDay: null,
  note: '',
  mistakes: null,
  ...changes,
})
const letters = (changes: Partial<LetterHomework> = {}): LetterHomework => ({
  kind: 'letters',
  id: 'l',
  language: 'uz',
  game: 'find-letter',
  letterIds: ['a'],
  assignedAt: '2026-10-01T08:00:00Z',
  completedAt: null,
  mistakes: null,
  ...changes,
})
const run = (id: string, independent: number, total: number): RecentRun => ({
  id,
  activity: 'math-lab:count:L1',
  strand: 'number',
  at: '2026-10-01T09:00:00Z',
  stars: 2,
  independent,
  total,
})

describe('homework status', () => {
  it('activity homework: assigned, started after one counted run, then completed', () => {
    expect(homeworkStatus(activity())).toBe('assigned')
    expect(homeworkStatus(activity({ runs: ['r1'] }))).toBe('started')
    const done = activity({ runs: ['r1', 'r2'], completedAt: '2026-10-01T10:00:00Z' })
    expect(homeworkStatus(done, [run('r1', 5, 5), run('r2', 4, 5)])).toBe('completed')
  })

  it('done with much help: "needs more practice", from its own runs only', () => {
    const done = activity({ runs: ['r1', 'r2'], completedAt: '2026-10-01T10:00:00Z' })
    expect(homeworkStatus(done, [run('r1', 1, 5), run('r2', 2, 5), run('other', 5, 5)])).toBe(
      'practice',
    )
    // the runs are no longer in the recent list: plainly completed
    expect(homeworkStatus(done, [])).toBe('completed')
  })

  it('letter homework: completed, or practice with a slip per letter or more', () => {
    expect(homeworkStatus(letters())).toBe('assigned')
    expect(homeworkStatus(letters({ completedAt: 'x', mistakes: 0 }))).toBe('completed')
    expect(homeworkStatus(letters({ completedAt: 'x', mistakes: 1 }))).toBe('practice')
    const five = letters({ letterIds: ['a', 'b', 'd', 'e', 'f'], completedAt: 'x' })
    expect(homeworkStatus({ ...five, mistakes: 3 })).toBe('completed')
    expect(homeworkStatus({ ...five, mistakes: 5 })).toBe('practice')
  })

  it('the kept score decides, so the status never changes on a later day', () => {
    const done = activity({
      runs: ['r1'],
      completedAt: '2026-10-01T10:00:00Z',
      score: { independent: 1, total: 5 },
    })
    expect(homeworkStatus(done, [])).toBe('practice')
    expect(homeworkStatus(done, [run('r1', 5, 5)])).toBe('practice')
  })
})
