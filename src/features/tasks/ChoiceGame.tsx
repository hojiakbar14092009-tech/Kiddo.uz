import clsx from 'clsx'
import { useCallback, useEffect, useReducer, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LetterEntry } from '@/content/alphabet'
import { useMascot } from '@/features/mascot/useMascot'
import { useSpeaker } from '@/services/audio/useSpeaker'
import type { MistakeDetail } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { useAgeLevel } from '@/store/familyStore'
import { OPTION_COUNT } from '@/features/age/ageLevel'
import { ROUNDS_PER_TASK } from './rules'
import type { ChoiceGameType } from './games'
import { generateRounds, type TaskRound } from './generateRounds'
import { OptionCard, type OptionStatus } from './OptionCard'
import {
  createSession,
  currentRound,
  isLastRound,
  judgeChoice,
  taskSessionReducer,
} from './taskSession'
import { TaskShell } from './TaskShell'
import { useFinishTask } from './useFinishTask'
import { GLOW_AFTER_MISTAKES, roundOutcome } from './taskEvidence'
import { recordLearning } from '@/domain/learning'
import { newId } from '@/lib/id'
import { useChildKey } from '@/store/progressStore'
import { playableLetters } from './playableLetters'
import { useLearner } from './useHomework'

/** Pause after a right answer, so the celebration can play before moving on. */
const ADVANCE_DELAY_MS = 1700
/** After this many wrong taps in a round, the right answer gently glows. */
const HINT_AFTER_MISTAKES = GLOW_AFTER_MISTAKES

/** “Find the letter” and “Find the picture”: pick the right one out of 3–4 options. */
export function ChoiceGame({ type }: { type: ChoiceGameType }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const learner = useLearner(type)
  const finish = useFinishTask(type)
  const optionCount = OPTION_COUNT[useAgeLevel()][type]
  // Rounds are drawn once when the game starts; progress updates must not reshuffle them.
  const [rounds] = useState(() =>
    generateRounds(
      type,
      playableLetters(language, type),
      learner,
      Math.random,
      ROUNDS_PER_TASK,
      optionCount,
    ),
  )

  return (
    <ChoiceRounds
      type={type}
      rounds={rounds}
      title={type === 'find-letter' ? t('task.findLetterTitle') : t('task.findPictureTitle')}
      onFinish={finish}
    />
  )
}

interface ChoiceRoundsProps {
  type: ChoiceGameType
  rounds: TaskRound[]
  title: string
  onFinish: (letterIds: string[], mistakes: MistakeDetail[]) => void
}

/** Plays a fixed list of choice rounds; shared by the games and the big test. */
export function ChoiceRounds({ type, rounds, title, onFinish }: ChoiceRoundsProps) {
  const { t } = useTranslation()
  const { react, reset } = useMascot()
  const { sayText, speaking } = useSpeaker()
  const [session, dispatch] = useReducer(taskSessionReducer, rounds, createSession)
  const round = currentRound(session)
  const childKey = useChildKey()
  const [sessionId] = useState(newId)

  // a solved round is one piece of learning evidence (counted once per run and round)
  useEffect(() => {
    if (!session.solved || !round) return
    try {
      recordLearning(
        childKey,
        roundOutcome(
          type,
          {
            sessionId,
            index: session.index,
            targetId: round.target.id,
            wrongIds: session.wrongIds,
          },
          new Date().toISOString(),
        ),
      )
    } catch {
      // the memory is best effort: the game never breaks
    }
  }, [childKey, round, session.index, session.solved, session.wrongIds, sessionId, type])

  const prompt = useCallback(
    (letter: LetterEntry, spoken: boolean) => {
      const name = spoken ? letter.spoken : letter.upper
      return type === 'find-letter'
        ? t('task.findLetterPrompt', { letter: name })
        : t('task.findPicturePrompt', { letter: name })
    },
    [t, type],
  )

  const instruct = useCallback(() => {
    if (!round) return
    react(
      'instruct',
      { text: prompt(round.target, false), emoji: type === 'find-letter' ? '🔍' : '🖼️' },
      { speak: false },
    )
    void sayText(prompt(round.target, true))
  }, [prompt, react, round, sayText, type])

  // Every new round: the mascot gives the instruction.
  useEffect(instruct, [instruct])
  useEffect(() => reset, [reset])

  // After a right answer: next round, or finish the task.
  useEffect(() => {
    if (!session.solved) return undefined
    const timer = setTimeout(() => {
      if (isLastRound(session)) {
        onFinish(
          session.rounds.map((item) => item.target.id),
          session.mistakes,
        )
      } else {
        dispatch({ type: 'next' })
      }
    }, ADVANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [onFinish, session])

  if (!round) return null

  const choose = (option: LetterEntry) => {
    const verdict = judgeChoice(session, option.id)
    if (verdict === 'ignored') return
    dispatch({ type: 'choose', optionId: option.id })
    react(verdict === 'correct' ? 'correct' : 'wrong')
  }

  const statusOf = (option: LetterEntry): OptionStatus => {
    if (session.wrongIds.includes(option.id)) return 'wrong'
    if (option.id !== round.target.id) return 'idle'
    if (session.solved) return 'correct'
    return session.wrongIds.length >= HINT_AFTER_MISTAKES ? 'hint' : 'idle'
  }

  return (
    <TaskShell
      title={title}
      round={session.index}
      rounds={session.rounds.length}
      speaking={speaking}
      onRepeat={() => void sayText(prompt(round.target, true))}
      hint={{ kind: type, letter: round.target }}
      struggling={session.wrongIds.length > 0}
    >
      <div
        data-testid="task-options"
        data-answer={round.target.id}
        className={clsx(
          'mx-auto grid w-full flex-1 content-center gap-4 sm:gap-6',
          round.options.length === 2
            ? 'max-w-2xl grid-cols-2 short:max-w-[calc((100dvh-10rem)*2+1.5rem)]'
            : round.options.length === 3
              ? 'max-w-3xl grid-cols-3 short:max-w-[calc((100dvh-10rem)*3+3rem)]'
              : 'max-w-md grid-cols-2 landscape:max-w-4xl landscape:grid-cols-4 short:max-w-[calc((100dvh-10rem)*4+4.5rem)]',
        )}
      >
        {round.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            target={round.target}
            taskType={type}
            status={statusOf(option)}
            onChoose={choose}
          />
        ))}
      </div>
    </TaskShell>
  )
}
