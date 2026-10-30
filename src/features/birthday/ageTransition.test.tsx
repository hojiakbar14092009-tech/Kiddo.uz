import { act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ageBand } from '@/domain/adaptive'
import { levelOf, masteryOf } from '@/domain/learner/profile'
import { recordEvidence, useLearningMemoryStore } from '@/domain/learningMemory'
import { emitActivity, useUniverseStore } from '@/domain/universe/store'
import { useLearnStore } from '@/features/learn/learnStore'
import { childAge, useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

/*
 * Phase 22: a birthday changes the age band (and so the look), never the
 * learning. Age 12 → 13 in Tashkent: mastery, history, rewards, lessons,
 * homework, achievements and the Mistake Garden all stay as they were.
 */

afterEach(() => {
  vi.useRealTimers()
  act(() => useFamilyStore.setState({ children: [], activeChildId: null }))
  delete document.documentElement.dataset.age
  delete document.documentElement.dataset.band
})

function snapshot(childId: string) {
  const universe = useUniverseStore.getState().byChild[childId]!
  const child = useFamilyStore.getState().children.find((item) => item.id === childId)!
  return JSON.parse(
    JSON.stringify({
      strands: universe.strands,
      recent: universe.recent,
      achievements: universe.achievements,
      best: universe.best,
      balances: universe.balances,
      ledger: universe.ledger.entries,
      lessons: useLearnStore.getState().byChild[childId],
      memory: useLearningMemoryStore.getState().byChild[childId],
      homeworks: child.homeworks,
    }),
  ) as Record<string, unknown>
}

describe('a birthday keeps the learning', () => {
  it('12 → 13: a new band and look; mastery, history, rewards, lessons, homework, garden unchanged', async () => {
    useSettingsStore.setState({ language: 'uz', onboarded: true })
    // the day before the 13th birthday, 21:30 in Tashkent
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-09T16:30:00Z'))
    const kid = useFamilyStore
      .getState()
      .addChild({ name: 'Bek', birthDate: '2013-05-10', gender: 'boy' })
    act(() => useFamilyStore.getState().setActiveChild(kid.id))
    expect(childAge(kid)).toBe(12)

    // a learning history: strong maths runs (level and mastery move), a lesson,
    // a mistake in the garden, and homework
    for (let i = 0; i < 6; i += 1) {
      const level = levelOf(useUniverseStore.getState().byChild[kid.id]?.strands, 'number', 12)
      emitActivity({
        id: `lab-${i}`,
        childKey: kid.id,
        activity: 'math-lab',
        strand: 'number',
        correct: 10,
        total: 10,
        independent: 10,
        level,
      })
    }
    useLearnStore.getState().markLesson(kid.id, 'math.add')
    recordEvidence(kid.id, {
      id: 'lab-x|q1',
      skill: 'math:sub:within10',
      item: 'sub:7-3',
      at: '2026-05-09T10:00:00.000Z',
      firstTry: false,
      helpedBefore: false,
      review: false,
      errors: ['add-instead'],
      maxHint: 0,
      level: 3,
    })
    useFamilyStore
      .getState()
      .assignHomework(kid.id, { language: 'uz', game: 'find-letter', letterIds: ['a'] })
    const strandBefore = useUniverseStore.getState().byChild[kid.id]!.strands!.number!
    expect(strandBefore.runs).toBe(6)
    const levelBefore = levelOf({ number: strandBefore }, 'number', 12)
    const masteryBefore = masteryOf({ number: strandBefore }, 'number', 12)
    expect(levelBefore).toBe(5)
    expect(masteryBefore).toBeGreaterThan(0)
    const before = snapshot(kid.id)

    // the birthday itself (Tashkent): 13, a new band and look
    vi.setSystemTime(new Date('2026-05-09T19:30:00Z'))
    const child = useFamilyStore.getState().children[0]!
    expect(childAge(child)).toBe(13)
    expect(ageBand(12)).toBe('10-12')
    expect(ageBand(childAge(child))).toBe('13-15')
    await renderRoute('/home')
    expect(document.documentElement.dataset.band).toBe('13-15')

    // the learning is exactly as it was (the birthday may only add its own gift)
    const after = snapshot(kid.id)
    expect(after.strands).toEqual(before.strands)
    expect(after.recent).toEqual(before.recent)
    expect(after.achievements).toEqual(before.achievements)
    expect(after.best).toEqual(before.best)
    expect(after.lessons).toEqual(before.lessons)
    expect(after.memory).toEqual(before.memory)
    expect(after.homeworks).toEqual(before.homeworks)
    // every earlier reward entry is still there (nothing taken back)
    const ledger = after.ledger as { reason: string; refId: string }[]
    for (const entry of before.ledger as { reason: string; refId: string }[]) {
      expect(ledger).toContainEqual(entry)
    }
    // the same level and mastery at 13: earned, never re-seeded from the new age
    const strands = useUniverseStore.getState().byChild[kid.id]!.strands
    expect(levelOf(strands, 'number', 13)).toBe(levelBefore)
    expect(masteryOf(strands, 'number', 13)).toBe(masteryBefore)
  })
})
