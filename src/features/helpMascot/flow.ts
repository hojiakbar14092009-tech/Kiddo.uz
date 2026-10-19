import type { LearnMode } from '@/features/learn/session'
import { claimOf, errorTypeOf, type FixQuestion, type SpotQuestion } from './generate'

/*
 * The steps of fixing the mascot's mistake (ages 5 and 6), kept as a pure
 * function so it can be tested: spot the wrong line (age 6), choose the right
 * answer, and it always ends with the mascot's answer crossed out and the
 * right one in its place – after a right answer, or (in a check) revealed.
 */

export type Stage = 'spot' | 'fix' | 'done'

export interface FlowState {
  stage: Stage
  /** Lines the child said were wrong but are right (learning: try again). */
  checkedLines: string[]
  /** Wrong answers tried (learning: try again). */
  triedOptions: string[]
  /** How it ended: fixed by the child, or shown after a wrong answer in a check. */
  outcome: 'fixed' | 'revealed' | null
}

export type FlowEvent = { type: 'line'; id: string } | { type: 'option'; value: string }

export type Feedback = 'line-is-right' | 'line-found' | 'try-again' | 'fixed' | 'revealed'

export interface FlowStep {
  state: FlowState
  /** An answer to record on the sheet (the first one is kept for good). */
  record: { value: string; correct: boolean; errorType: string | null } | null
  feedback: Feedback | null
}

export function startFlow(q: FixQuestion | SpotQuestion): FlowState {
  return {
    stage: q.kind === 'spot' ? 'spot' : 'fix',
    checkedLines: [],
    triedOptions: [],
    outcome: null,
  }
}

export function advance(
  q: FixQuestion | SpotQuestion,
  mode: LearnMode,
  state: FlowState,
  event: FlowEvent,
): FlowStep {
  const none: FlowStep = { state, record: null, feedback: null }
  if (state.stage === 'done') return none

  if (state.stage === 'spot') {
    if (event.type !== 'line' || q.kind !== 'spot') return none
    if (event.id === q.wrongLine) {
      return { state: { ...state, stage: 'fix' }, record: null, feedback: 'line-found' }
    }
    if (state.checkedLines.includes(event.id)) return none
    const record = { value: `line:${event.id}`, correct: false, errorType: 'missed-mistake' }
    // learning: try another line; a check shows the wrong line and goes on
    return mode === 'learn'
      ? {
          state: { ...state, checkedLines: [...state.checkedLines, event.id] },
          record,
          feedback: 'line-is-right',
        }
      : {
          state: { ...state, stage: 'fix', checkedLines: [event.id] },
          record,
          feedback: 'line-is-right',
        }
  }

  if (event.type !== 'option' || state.triedOptions.includes(event.value)) return none
  const claim = claimOf(q)
  if (event.value === claim.right) {
    return {
      state: { ...state, stage: 'done', outcome: 'fixed' },
      record: { value: event.value, correct: true, errorType: null },
      feedback: 'fixed',
    }
  }
  const record = { value: event.value, correct: false, errorType: errorTypeOf(claim, event.value) }
  return mode === 'learn'
    ? {
        state: { ...state, triedOptions: [...state.triedOptions, event.value] },
        record,
        feedback: 'try-again',
      }
    : {
        state: { ...state, stage: 'done', triedOptions: [event.value], outcome: 'revealed' },
        record,
        feedback: 'revealed',
      }
}
