import { describe, expect, it } from 'vitest'
import { applyEvidence, EVIDENCE_KINDS, EVIDENCE_POLICY } from './evidence'
import type { ChallengeLevel, StrandState } from './profile'

/*
 * Phase 22, the progression evidence table: every kind × level × strong/weak.
 * A 30-year-old is used so the age prior never decides (a stored strand with
 * runs ≥ 2 holds its own level).
 */

const AGE = 30
const strong = { independent: 10, total: 10 }
const weak = { independent: 1, total: 10 }
const LEVELS: ChallengeLevel[] = [1, 2, 3, 4, 5]

function state(level: ChallengeLevel, over: Partial<StrandState> = {}): StrandState {
  return {
    level,
    mastery: level === 5 ? 4 : 0,
    streak: 0,
    runs: 6,
    independent: 40,
    total: 60,
    ...over,
  }
}

/** Two runs of one kind in a row, as the store would apply them. */
function twice(kind: (typeof EVIDENCE_KINDS)[number], level: ChallengeLevel, run: typeof strong) {
  const first = applyEvidence(state(level), run, AGE, kind, level)
  if (!first) return null
  return applyEvidence(first, run, AGE, kind, first.level)
}

describe('EVIDENCE_POLICY', () => {
  it('learn, tracing, exam and placement runs never change a strand', () => {
    for (const kind of ['learn', 'tracing', 'exam', 'placement'] as const) {
      expect(EVIDENCE_POLICY[kind].moves).toBe(false)
      for (const level of LEVELS) {
        expect(applyEvidence(state(level), strong, AGE, kind, level)).toBeNull()
        expect(applyEvidence(state(level), weak, AGE, kind, level)).toBeNull()
      }
    }
  })

  it('assessment moves both ways and grows mastery at the top', () => {
    expect(twice('assessment', 3, strong)?.level).toBe(4)
    expect(twice('assessment', 3, weak)?.level).toBe(2)
    expect(twice('assessment', 5, strong)).toMatchObject({ level: 5, mastery: 5 })
    expect(twice('assessment', 5, weak)).toMatchObject({ level: 5, mastery: 3 })
  })

  it('practice: up within 1–3, never past 3, never at 4–5, never mastery', () => {
    expect(twice('practice', 1, strong)?.level).toBe(2)
    expect(twice('practice', 2, strong)?.level).toBe(3)
    const held = twice('practice', 3, strong)!
    expect(held).toMatchObject({
      level: 3,
      streak: 0,
      mastery: 0,
      runs: 8,
      independent: 60,
      total: 80,
    })
    expect(twice('practice', 3, weak)?.level).toBe(2)
    for (const level of [4, 5] as const) {
      expect(applyEvidence(state(level), strong, AGE, 'practice', level)).toBeNull()
      expect(applyEvidence(state(level), weak, AGE, 'practice', level)).toBeNull()
    }
  })

  it('a corrupt mastery below the top level is never written back by a hold', () => {
    const corrupt = state(3, { mastery: 99 })
    expect(applyEvidence(corrupt, strong, AGE, 'practice', 3)?.mastery).toBe(0)
  })
})
