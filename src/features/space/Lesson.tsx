import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon, CoinIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnStore } from '@/features/learn/learnStore'
import { useLearnSession, type FinishedSession } from '@/features/learn/useLearnSession'
import { useSpeakable } from '@/features/learn/speakable'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useChildKey } from '@/store/progressStore'
import { isPlanet, KIND, type Lesson, type SpaceId } from './content'
import { OrderGame } from './OrderGame'
import { lessonQuestions } from './questions'
import { QuestionBoard } from './QuestionBoard'
import { useSpaceLanguage, useSpaceText } from './useSpaceText'
import { KindChip, OrderStrip, PlanetView } from './views'

type Phase =
  | { name: 'card'; index: number }
  | { name: 'order' }
  | { name: 'quiz'; index: number }
  | { name: 'done' }

/** The object card: a 3D view, the name and one or two facts. */
export function ObjectCard({ id, lines }: { id: SpaceId; lines: readonly string[] }) {
  const text = useSpaceText()
  const name = text.objects[id].name
  // the speaker button reads the card shown now: its name and facts
  useSpeakable([name, ...lines])
  return (
    <article className="space-card">
      {/* never taller than ~40% of the screen, so the card and its "next" button fit a laptop screen */}
      <PlanetView id={id} className="w-full max-w-[min(420px,80vw,40dvh)]" />
      <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <KindChip id={id} />
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">{name}</h2>
        <ul className="flex flex-col gap-2 text-lg sm:text-xl">
          {lines.map((line) => (
            <li key={line} className="space-fact">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

/**
 * One lesson: meet the objects (cards), then (age 6) put planets in order,
 * then a few practice questions. When it is done the stage is saved, so a
 * test may ask about it.
 */
export function SpaceLesson({
  lesson,
  onExit,
  onTest,
}: {
  lesson: Lesson
  onExit: () => void
  onTest: () => void
}) {
  const { t } = useTranslation()
  const language = useSpaceLanguage()
  const text = useSpaceText()
  const { say } = useLearnMascot()
  const childKey = useChildKey()
  const markStage = useLearnStore((state) => state.markStage)
  const session = useLearnSession({
    section: 'space',
    language,
    stage: lesson.stage,
    mode: 'learn',
  })
  const questions = useMemo(() => lessonQuestions(lesson, language), [lesson, language])
  const [phase, setPhase] = useState<Phase>({ name: 'card', index: 0 })
  const [stuck, setStuck] = useState(0)
  const [result, setResult] = useState<FinishedSession | null>(null)

  const hasOrder = lesson.kind === 'order'
  const total = lesson.cards.length + (hasOrder ? 1 : 0) + questions.length
  const current =
    phase.name === 'card'
      ? phase.index
      : phase.name === 'order'
        ? lesson.cards.length
        : phase.name === 'quiz'
          ? lesson.cards.length + (hasOrder ? 1 : 0) + phase.index
          : total - 1

  // every new step starts at the top of the page
  useEffect(() => {
    window.scrollTo?.({ top: 0 })
  }, [phase])

  const finish = () => {
    const done = session.finish(questions.length + (hasOrder ? 1 : 0))
    markStage(childKey, 'space', language, lesson.stage)
    setResult(done)
    setPhase({ name: 'done' })
    say('celebrate', { text: text.say.lessonDone, emoji: '🚀' })
  }

  const afterCards = () =>
    hasOrder ? setPhase({ name: 'order' }) : setPhase({ name: 'quiz', index: 0 })

  const question = phase.name === 'quiz' ? questions[phase.index] : undefined
  const help =
    question !== undefined
      ? {
          text: question.help,
          visual: question.helpOrder ? <OrderStrip /> : undefined,
          glow: stuck >= 1,
          onOpen: () => session.help(question),
        }
      : phase.name === 'order'
        ? { text: text.say.orderHelp, visual: <OrderStrip />, glow: stuck >= 1 }
        : undefined

  const cardLines = (id: SpaceId): readonly string[] => {
    const facts = text.objects[id].facts
    if (lesson.kind !== 'kinds') return lesson.level === 4 ? facts.slice(0, 1) : facts
    // star / planet / satellite, said simply, plus one fact
    const kindLine = text.say.kindsCards[KIND[id] === 'star' ? 0 : KIND[id] === 'planet' ? 1 : 2]
    return [kindLine, isPlanet(id) ? facts[0] : facts[1]]
  }

  return (
    <LearnShell
      title={text.ui.title}
      themeClassName="learn-space"
      step={phase.name === 'done' ? undefined : { current, total }}
      help={help}
      speak={phase.name === 'done' ? [text.ui.lessonDone, text.ui.lessonDoneText] : null}
    >
      {phase.name === 'card' && (
        <div className="flex flex-col items-center gap-5 short:gap-2">
          <p className="space-badge">{text.ui.lessonTitles[lesson.stage]}</p>
          <ObjectCard
            key={lesson.cards[phase.index]}
            id={lesson.cards[phase.index]!}
            lines={cardLines(lesson.cards[phase.index]!)}
          />
          <Button
            size="lg"
            icon={<ChevronRightIcon size={28} />}
            iconPosition="end"
            onClick={() =>
              phase.index + 1 < lesson.cards.length
                ? setPhase({ name: 'card', index: phase.index + 1 })
                : afterCards()
            }
          >
            {t('learn.next')}
          </Button>
        </div>
      )}

      {phase.name === 'order' && (
        <OrderGame
          lesson={lesson}
          session={session}
          onWrong={() => setStuck((count) => count + 1)}
          onDone={() => {
            setStuck(0)
            setPhase({ name: 'quiz', index: 0 })
          }}
        />
      )}

      {question && phase.name === 'quiz' && (
        <QuestionBoard
          key={question.id}
          question={question}
          level={lesson.level}
          mode="learn"
          session={session}
          onWrong={() => setStuck((count) => count + 1)}
          onSolved={() => {
            setStuck(0)
            if (phase.index + 1 < questions.length)
              setPhase({ name: 'quiz', index: phase.index + 1 })
            else finish()
          }}
        />
      )}

      {phase.name === 'done' && (
        <section className="space-panel mx-auto flex w-full max-w-xl flex-col items-center gap-4 p-6 text-center">
          <h2 className="font-display text-3xl font-extrabold">{text.ui.lessonDone}</h2>
          <p className="text-lg">{text.ui.lessonDoneText}</p>
          {result && result.coins > 0 && (
            <p className="inline-flex items-center gap-2 rounded-full bg-coin-soft px-4 py-2 font-display text-xl font-extrabold text-ink">
              <CoinIcon size={26} />
              {t('learn.result.coins', { count: result.coins })}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="coin" size="md" onClick={onTest}>
              {t('learn.startTest')}
            </Button>
            <Button variant="soft" size="md" onClick={onExit}>
              {text.ui.title}
            </Button>
          </div>
        </section>
      )}
    </LearnShell>
  )
}
