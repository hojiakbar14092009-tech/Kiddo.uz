import clsx from 'clsx'
import { useCallback, useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { getAlphabet, type LetterEntry } from '@/content/alphabet'
import { useMascot } from '@/features/mascot/useMascot'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useProgress } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import type { ChoiceGameType } from './games'
import { generateRounds } from './generateRounds'
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

/** Pause after a right answer, so the celebration can play before moving on. */
const ADVANCE_DELAY_MS = 1700
/** After this many wrong taps in a round, the right answer gently glows. */
const HINT_AFTER_MISTAKES = 2

/** “Find the letter” and “Find the picture”: pick the right one out of 3–4 options. */
export function ChoiceGame({ type }: { type: ChoiceGameType }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const progress = useProgress()
  const { react, reset } = useMascot()
  const { sayText, speaking } = useSpeaker()
  const finish = useFinishTask(type)

  // Rounds are drawn once when the game starts; progress updates must not reshuffle them.
  const [session, dispatch] = useReducer(taskSessionReducer, undefined, () =>
    createSession(
      generateRounds(type, getAlphabet(language).letters, {
        learned: progress.learned[language] ?? [],
        struggles: progress.struggles[language] ?? {},
      }),
    ),
  )
  const round = currentRound(session)

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
        finish(
          session.rounds.map((item) => item.target.id),
          session.mistakes,
        )
      } else {
        dispatch({ type: 'next' })
      }
    }, ADVANCE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [finish, session])

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
      title={type === 'find-letter' ? t('task.findLetterTitle') : t('task.findPictureTitle')}
      round={session.index}
      rounds={session.rounds.length}
      speaking={speaking}
      onRepeat={() => void sayText(prompt(round.target, true))}
    >
      <div
        className={clsx(
          'mx-auto grid w-full flex-1 content-center gap-4 sm:gap-6',
          type === 'find-letter'
            ? 'max-w-md grid-cols-2 landscape:max-w-4xl landscape:grid-cols-4'
            : 'max-w-3xl grid-cols-3',
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
