import { useEffect, useRef, useState } from 'react'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import type { LearnMode } from '@/features/learn/session'
import type { useLearnSession } from '@/features/learn/useLearnSession'
import { useSpeakable } from '@/features/learn/speakable'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import type { AgeLevel } from './content'
import type { SpaceQuestion } from './questions'
import { useSpaceText } from './useSpaceText'
import { SpacePicture } from './views'

type Session = ReturnType<typeof useLearnSession>

/** How long the right answer stays on screen before the next question. */
export const NEXT_DELAY = 1300

/**
 * One question: the prompt (and a picture for "which planet is this?"), the
 * answer cards, and what happens on a right or wrong answer. In learning mode
 * the right card starts to glow after two misses; in a test only the help bulb
 * helps (and that is recorded).
 */
export function QuestionBoard({
  question,
  level,
  mode,
  session,
  onWrong,
  onSolved,
}: {
  question: SpaceQuestion
  level: AgeLevel
  mode: LearnMode
  session: Session
  onWrong: () => void
  onSolved: () => void
}) {
  const text = useSpaceText()
  const { say } = useLearnMascot()
  const [statuses, setStatuses] = useState<Partial<Record<string, ChoiceStatus>>>({})
  const [solved, setSolved] = useState(false)
  const misses = useRef(0)
  const timer = useRef<number | null>(null)

  // the question is written big on screen; the speaker button reads exactly this one
  useSpeakable([question.prompt])

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const choose = (id: string) => {
    if (solved) return
    if (id === question.correct) {
      session.answer(question, id, true)
      setStatuses((current) => ({ ...current, [id]: 'correct' }))
      setSolved(true)
      const praise = text.say.correct[Math.floor(Math.random() * text.say.correct.length)]!
      say('correct', { text: praise, emoji: '🌟' })
      timer.current = window.setTimeout(() => {
        session.close(question)
        onSolved()
      }, NEXT_DELAY)
      return
    }
    session.answer(question, id, false, `picked:${id}`)
    misses.current += 1
    onWrong()
    say('wrong', { text: text.say.wrong, emoji: '💪' })
    setStatuses((current) => ({
      ...current,
      [id]: 'wrong',
      ...(mode === 'learn' && misses.current >= 2 ? { [question.correct]: 'hint' as const } : {}),
    }))
  }

  const big = level === 4

  return (
    <section
      aria-labelledby={`q-${question.id}`}
      className="flex flex-col items-center gap-4 sm:gap-6"
    >
      <h2 id={`q-${question.id}`} className="space-prompt">
        {question.prompt}
      </h2>
      {question.show && (
        <div className="space-porthole size-40 sm:size-52">
          <SpacePicture id={question.show} eager className="size-[86%]" />
        </div>
      )}
      <ChoiceGrid
        className={big ? 'max-w-xl' : undefined}
        choices={question.options.map((id) => ({
          id,
          label: text.objects[id].name,
          content: question.asNames ? (
            <span className="font-display text-xl font-extrabold break-words sm:text-3xl">
              {text.objects[id].name}
            </span>
          ) : (
            <span className="space-porthole size-[88%]">
              <SpacePicture id={id} eager className="size-[84%]" />
            </span>
          ),
        }))}
        statuses={statuses}
        onChoose={choose}
        disabled={solved}
        cardClassName="space-choice"
      />
    </section>
  )
}
