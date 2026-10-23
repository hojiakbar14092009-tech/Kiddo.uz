import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { BulbIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { useChallengeLevel, type ChallengeLevel } from '@/domain/learner'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { isDinoId, type Diet } from './content'
import { DINO_ROOT } from './explore'
import { ChoiceName, DietPicture, DinoFrame, DinoPicture, StartCard } from './parts'
import { planQuiz, type QuizQuestion } from './quiz'
import { hintOf, promptOf } from './quizText'
import { DinoResult } from './run'
import { NEXT_DELAY_MS, useDinoRecorder, useStepLabel, type DinoFinished } from './session'
import { useDinoText } from './text'

const BACK = DINO_ROOT

/** `/worlds/dino/quiz`: a start card, then one run at the child's 'science' level. */
export function QuizGame() {
  const level = useChallengeLevel('science')
  const [run, setRun] = useState<{ count: number; level: ChallengeLevel } | null>(null)
  const text = useDinoText()
  const { say } = useLearnMascot()

  useEffect(() => {
    if (!run) say('greet', { text: text.modes.quiz.title, emoji: '🦕' })
  }, [run, say, text.modes.quiz.title])

  if (!run) {
    return (
      <DinoFrame
        title={text.modes.quiz.title}
        back={BACK}
        speak={[text.modes.quiz.title, text.modes.quiz.text]}
      >
        <StartCard
          picture={
            <>
              <DinoPicture id="trex" className="size-20 sm:size-28 short:size-16" eager />
              <Img3D name="lamp" className="size-14 sm:size-16 short:size-10" eager />
              <DinoPicture id="brachiosaurus" className="size-20 sm:size-28 short:size-16" eager />
            </>
          }
          title={text.modes.quiz.title}
          text={text.modes.quiz.text}
          action={
            <Button onClick={() => setRun({ count: 1, level })} data-testid="quiz-start">
              {text.quiz.start}
            </Button>
          }
        />
      </DinoFrame>
    )
  }
  return (
    <QuizRun
      key={run.count}
      level={run.level}
      onAgain={() => setRun({ count: run.count + 1, level })}
    />
  )
}

export function QuizRun({
  level,
  onAgain,
  questions: given,
}: {
  level: ChallengeLevel
  onAgain: () => void
  /** Tests pass fixed questions. */
  questions?: QuizQuestion[]
}) {
  const text = useDinoText()
  const stepLabel = useStepLabel()
  const { say, reset } = useLearnMascot()
  const [questions] = useState(() => given ?? planQuiz(level))
  const record = useDinoRecorder('quiz', level)
  const [index, setIndex] = useState(0)
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({})
  const [misses, setMisses] = useState(0)
  const [solved, setSolved] = useState(false)
  const [firstTry, setFirstTry] = useState(0)
  const [finished, setFinished] = useState<DinoFinished | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  useEffect(() => {
    reset()
  }, [index, reset])

  const q = questions[index]
  const prompt = q ? promptOf(text, q) : ''

  if (finished) {
    return (
      <DinoResult
        title={text.modes.quiz.title}
        back={BACK}
        level={level}
        finished={finished}
        onAgain={onAgain}
      />
    )
  }
  if (!q) return null

  const answer = (value: string) => {
    if (solved) return
    if (value === q.answer) {
      const right = firstTry + (misses === 0 ? 1 : 0)
      setFirstTry(right)
      setStatuses((s) => ({ ...s, [value]: 'correct' }))
      setSolved(true)
      say('correct')
      if (index + 1 >= questions.length) {
        const done = record({ total: questions.length, firstTry: right })
        timer.current = window.setTimeout(() => done && setFinished(done), NEXT_DELAY_MS)
      } else {
        timer.current = window.setTimeout(() => {
          setIndex(index + 1)
          setStatuses({})
          setMisses(0)
          setSolved(false)
        }, NEXT_DELAY_MS)
      }
      return
    }
    const count = misses + 1
    setMisses(count)
    setStatuses((s) => ({
      ...s,
      [value]: 'wrong',
      // after two misses the right card glows (never a punishment, just a way on)
      ...(count >= 2 ? { [q.answer]: 'hint' as const } : {}),
    }))
    say('wrong', { text: hintOf(text, q), emoji: '💡' })
  }

  const choices = q.options.map((option) => {
    if (q.optionType === 'diet') {
      const diet = option as Diet
      return {
        id: option,
        label: text.diet[diet],
        content: (
          <>
            <DietPicture diet={diet} className="size-16 sm:size-24 short:size-12" />
            <span className="font-display text-xl font-extrabold short:text-base">
              {text.diet[diet]}
            </span>
          </>
        ),
      }
    }
    const name = isDinoId(option) ? text.dinos[option].name : option
    return {
      id: option,
      label: name,
      content: (
        <>
          {isDinoId(option) && (
            <DinoPicture id={option} eager className="min-h-0 w-full flex-1 scale-125" />
          )}
          <ChoiceName name={name} />
        </>
      ),
    }
  })

  return (
    <DinoFrame
      title={text.modes.quiz.title}
      back={BACK}
      speak={[prompt]}
      hideMascotShort
      step={{ current: index, total: questions.length, label: stepLabel(index, questions.length) }}
    >
      <section
        key={q.id}
        data-testid="quiz-question"
        data-kind={q.kind}
        data-answer={q.answer}
        data-level={level}
        data-step={index}
        className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 sm:gap-6 short:grid short:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] short:items-center short:gap-4"
      >
        <div className="flex flex-col items-center gap-3 short:gap-2">
          <h2
            aria-live="polite"
            data-testid="quiz-prompt"
            className="text-center font-display text-2xl leading-tight font-extrabold sm:text-3xl short:text-xl"
          >
            {prompt}
          </h2>
          {q.kind === 'eat' && q.subject && (
            <DinoPicture
              id={q.subject}
              alt={text.dinos[q.subject].name}
              eager
              className="size-32 sm:size-44 short:size-24"
            />
          )}
          {misses > 0 && !solved && (
            <p
              data-testid="quiz-hint"
              className="flex items-center gap-2 rounded-card bg-coin-soft px-4 py-2 text-lg font-bold short:text-base"
            >
              <BulbIcon size={24} className="shrink-0 text-coin-shadow" />
              {hintOf(text, q)}
            </p>
          )}
        </div>
        <ChoiceGrid
          choices={choices}
          statuses={statuses}
          onChoose={answer}
          disabled={solved}
          className={clsx('max-w-2xl short:gap-3', choices.length === 4 && 'short:grid-cols-4')}
          cardClassName="min-h-24 gap-1 p-1.5 max-sm:aspect-[3/4] sm:p-3 short:aspect-auto short:h-28 short:min-h-0 short:p-2"
        />
      </section>
    </DinoFrame>
  )
}
