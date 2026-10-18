import type { MistakeDetail } from '@/store/progressStore'
import type { TaskRound } from './generateRounds'

export interface TaskSessionState {
  rounds: TaskRound[]
  index: number
  /** Wrong options already tapped in the current round (they become disabled). */
  wrongIds: string[]
  /** The current round was answered correctly and is about to move on. */
  solved: boolean
  mistakes: MistakeDetail[]
}

export type TaskSessionAction = { type: 'choose'; optionId: string } | { type: 'next' }

export type ChoiceResult = 'correct' | 'wrong' | 'ignored'

export function createSession(rounds: TaskRound[]): TaskSessionState {
  return { rounds, index: 0, wrongIds: [], solved: false, mistakes: [] }
}

export function currentRound(state: TaskSessionState): TaskRound | undefined {
  return state.rounds[state.index]
}

export function isLastRound(state: TaskSessionState): boolean {
  return state.index >= state.rounds.length - 1
}

/** What tapping an option means, without changing anything. */
export function judgeChoice(state: TaskSessionState, optionId: string): ChoiceResult {
  const round = currentRound(state)
  if (!round || state.solved || state.wrongIds.includes(optionId)) return 'ignored'
  return optionId === round.target.id ? 'correct' : 'wrong'
}

export function taskSessionReducer(
  state: TaskSessionState,
  action: TaskSessionAction,
): TaskSessionState {
  switch (action.type) {
    case 'choose': {
      const verdict = judgeChoice(state, action.optionId)
      const round = currentRound(state)
      if (verdict === 'ignored' || !round) return state
      if (verdict === 'correct') return { ...state, solved: true }
      return {
        ...state,
        wrongIds: [...state.wrongIds, action.optionId],
        mistakes: [...state.mistakes, { targetId: round.target.id, chosenId: action.optionId }],
      }
    }
    case 'next':
      if (!state.solved || isLastRound(state)) return state
      return { ...state, index: state.index + 1, wrongIds: [], solved: false }
    default:
      return state
  }
}
