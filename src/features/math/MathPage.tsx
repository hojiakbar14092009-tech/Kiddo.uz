import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import type { AgeLevel } from '@/features/age/ageLevel'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { Img3D } from '@/features/learn/Img3D'
import { LearnResult } from '@/features/learn/LearnResult'
import { LearnShell } from '@/features/learn/LearnShell'
import { stagesTaught, useLearnChild, useLearnStore } from '@/features/learn/learnStore'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useLearnSession, type FinishedSession } from '@/features/learn/useLearnSession'
import { useContentTier } from '@/domain/adaptive'
import { SECTION_STRAND } from '@/domain/universe/wiring'
import { useChildKey } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { COPY, groupLabel, helpText, numberQuestion, pictureQuestion } from './content'
import {
  DEMO,
  errorTypeFor,
  GUIDED_COUNT,
  OBJECTS,
  STAGES,
  type MathQuestion,
  type StageId,
} from './generators'
import { CountScene, Equation, HelpVisual, ObjectGroup } from './parts'
import { learnOrderKey, orderOf, planLearn, planTest, TEST_ORDER_KEY } from './plan'

type View =
  { kind: 'menu' } | { kind: 'learn'; stage: StageId; run: number } | { kind: 'test'; run: number }

/**
 * Matematika: addition for ages 4–6. The child learns stage by stage
 * (explanation, two examples together, then on their own) and can take a
 * short check made only of what was taught.
 */
export function MathPage() {
  const level = useContentTier(SECTION_STRAND.math)
  const [view, setView] = useState<View>({ kind: 'menu' })
  const [run, setRun] = useState(0)
  const next = () => {
    setRun((r) => r + 1)
    return run + 1
  }

  if (view.kind === 'learn') {
    return (
      <Run
        key={`learn-${view.run}`}
        level={level}
        mode="learn"
        stage={view.stage}
        onMenu={() => setView({ kind: 'menu' })}
        onTest={() => setView({ kind: 'test', run: next() })}
        onStage={(stage) => setView({ kind: 'learn', stage, run: next() })}
      />
    )
  }
  if (view.kind === 'test') {
    return (
      <Run
        key={`test-${view.run}`}
        level={level}
        mode="test"
        onMenu={() => setView({ kind: 'menu' })}
        onTest={() => setView({ kind: 'test', run: next() })}
        onStage={(stage) => setView({ kind: 'learn', stage, run: next() })}
      />
    )
  }
  return (
    <Menu
      level={level}
      onLearn={(stage) => setView({ kind: 'learn', stage, run: next() })}
      onTest={() => setView({ kind: 'test', run: next() })}
    />
  )
}

function Menu({
  level,
  onLearn,
  onTest,
}: {
  level: AgeLevel
  onLearn: (stage: StageId) => void
  onTest: () => void
}) {
  const { t } = useTranslation()
  const language = useLanguage()
  const copy = COPY[language]
  const learn = useLearnChild()
  const taught = stagesTaught(learn, 'math', 'any')
  const { say } = useLearnMascot()
  const stages = STAGES[level]

  useEffect(() => {
    say('greet', { text: copy.chooseStage, emoji: '🔢' })
  }, [copy.chooseStage, say])

  const anyTaught = stages.some((stage) => taught.includes(stage.id))

  return (
    <LearnShell title={t('learn.sections.math')} speak={[copy.chooseStage]}>
      <ol className="mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage, index) => {
          const done = taught.includes(stage.id)
          const open = index === 0 || taught.includes(stages[index - 1]!.id)
          const demo = DEMO[stage.id]
          return (
            <li key={stage.id}>
              <button
                type="button"
                disabled={!open}
                onClick={() => onLearn(stage.id)}
                data-testid={`stage-${stage.id}`}
                className={clsx(
                  'flex w-full items-center gap-4 rounded-[28px] p-4 text-left transition-transform active:scale-[0.98]',
                  open
                    ? 'bg-surface shadow-[0_6px_0_var(--color-line)]'
                    : 'bg-surface/60 opacity-60 shadow-[0_4px_0_var(--color-line)]',
                )}
              >
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-sky-soft">
                  {level === 4 ? (
                    <Img3D name={OBJECTS[index % OBJECTS.length]!} className="size-12" eager />
                  ) : (
                    <span className="font-display text-xl font-extrabold tabular-nums">
                      {demo.a}+{demo.b}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-xl font-bold">
                    {index + 1}. {copy.stageTitle[stage.id]}
                  </span>
                  <span className="text-base text-ink-soft">
                    {done ? `✓ ${copy.taught}` : open ? copy.learn : `🔒 ${copy.locked}`}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-2">
        <Button
          variant="coin"
          size="md"
          disabled={!anyTaught}
          onClick={onTest}
          data-testid="math-test"
        >
          {copy.test}
        </Button>
        {!anyTaught && <p className="text-center text-base text-ink-soft">{copy.testHint}</p>}
      </div>
    </LearnShell>
  )
}

function Run({
  level,
  mode,
  stage,
  onMenu,
  onTest,
  onStage,
}: {
  level: AgeLevel
  mode: 'learn' | 'test'
  stage?: StageId
  onMenu: () => void
  onTest: () => void
  onStage: (stage: StageId) => void
}) {
  const { t } = useTranslation()
  const language = useLanguage()
  const copy = COPY[language]
  const childKey = useChildKey()
  const learn = useLearnChild()
  const markStage = useLearnStore((state) => state.markStage)
  const setLastOrder = useLearnStore((state) => state.setLastOrder)
  const { say } = useLearnMascot()

  // the questions are fixed for this run
  const [questions] = useState<MathQuestion[]>(() =>
    mode === 'learn' && stage
      ? planLearn(stage, level, learn)
      : planTest(level, stagesTaught(learn, 'math', 'any'), learn),
  )
  useEffect(() => {
    const key = mode === 'learn' && stage ? learnOrderKey(stage) : TEST_ORDER_KEY
    setLastOrder(
      childKey,
      key,
      orderOf(questions, (q) => q.id),
    )
  }, [childKey, mode, questions, setLastOrder, stage])

  const session = useLearnSession({
    section: 'math',
    language: 'any',
    stage: mode === 'learn' && stage ? stage : `test-${level}`,
    mode,
  })

  const [index, setIndex] = useState(mode === 'learn' ? -1 : 0)
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({})
  const [wrong, setWrong] = useState(0)
  const [solved, setSolved] = useState(false)
  const [result, setResult] = useState<FinishedSession | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const q = index >= 0 ? questions[index] : undefined
  const guided = mode === 'learn' && index < GUIDED_COUNT
  const questionText = q
    ? level === 4
      ? pictureQuestion(language, q.object, q)
      : numberQuestion(language, q)
    : stage
      ? copy.explain[stage]
      : ''

  useEffect(() => {
    if (result || !questionText) return
    // the bubble stays short (the full sentence is on the page); the voice reads the sentence
    say('instruct', { text: q ? copy.ask : copy.look, emoji: q ? '🤔' : '💡' }, questionText)
  }, [copy.ask, copy.look, q, questionText, result, say])

  const advance = useCallback(() => {
    if (!q) return
    session.close(q)
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setStatuses({})
      setWrong(0)
      setSolved(false)
      return
    }
    if (mode === 'learn' && stage) markStage(childKey, 'math', 'any', stage)
    setResult(session.finish(questions.length))
  }, [childKey, index, markStage, mode, q, questions.length, session, stage])

  const choose = (id: string) => {
    if (!q || solved) return
    const value = Number(id)
    const correct = value === q.sum
    session.answer(q, id, correct, correct ? null : errorTypeFor(q, value))
    if (correct) {
      setStatuses((s) => ({ ...s, [id]: 'correct' }))
      setSolved(true)
      say('correct', { text: copy.correct, emoji: '🌟' })
      timer.current = window.setTimeout(advance, 1100)
      return
    }
    const misses = wrong + 1
    setWrong(misses)
    setStatuses((s) => ({
      ...s,
      [id]: 'wrong',
      // while learning, the right card is pointed out after a miss (together) or two (alone)
      ...(mode === 'learn' && (guided || misses >= 2) ? { [String(q.sum)]: 'hint' as const } : {}),
    }))
    say('wrong', { text: copy.retry, emoji: '💪' })
  }

  const help = useMemo(
    () =>
      q
        ? {
            text: helpText(language, q.stage, q),
            visual: <HelpVisual fact={q} stage={q.stage} object={q.object} />,
            glow: wrong > 0 && !solved,
            onOpen: () => session.help(q),
          }
        : undefined,
    [language, q, session, solved, wrong],
  )

  const title =
    mode === 'learn' && stage
      ? `${t('learn.sections.math')} · ${copy.stageTitle[stage]}`
      : `${t('learn.sections.math')} · ${copy.test}`

  if (result && mode === 'test') {
    return (
      <LearnShell title={title}>
        <LearnResult result={result} onAgain={onTest} />
      </LearnShell>
    )
  }
  if (result && stage) {
    const stages = STAGES[level]
    const nextStage = stages[stages.findIndex((s) => s.id === stage) + 1]
    return (
      <LearnShell title={title} speak={[copy.stageDone, copy.stageDoneText]}>
        <StageDone
          result={result}
          title={copy.stageDone}
          text={copy.stageDoneText}
          actions={
            <>
              <Button variant="coin" size="md" onClick={onTest}>
                {copy.test}
              </Button>
              {nextStage && (
                <Button size="md" onClick={() => onStage(nextStage.id)}>
                  {copy.nextStage}
                </Button>
              )}
              <Button variant="soft" size="md" onClick={onMenu}>
                {copy.stages}
              </Button>
            </>
          }
          coinsLabel={(count) => t('learn.result.coins', { count })}
        />
      </LearnShell>
    )
  }

  if (!q && stage) {
    const demo = DEMO[stage]
    return (
      <LearnShell
        title={title}
        speak={[questionText]}
        step={{ current: 0, total: questions.length + 1 }}
      >
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 rounded-[36px] bg-surface p-5 text-center shadow-[0_8px_0_var(--color-line)] sm:p-8">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            {copy.explain[stage]}
          </h2>
          {level === 4 ? (
            <>
              <CountScene
                fact={demo}
                object="apple"
                label={copy.counted}
                recountLabel={copy.recount}
              />
              <p className="text-xl">{pictureQuestion(language, 'apple', demo)}</p>
              <Equation fact={demo} solved small />
            </>
          ) : (
            <>
              <Equation fact={demo} solved />
              <HelpVisual fact={demo} stage={stage} object="apple" />
            </>
          )}
          <p className="font-display text-xl font-bold text-primary-ink">
            {helpText(language, stage, demo)}
          </p>
          <Button onClick={() => setIndex(0)} data-testid="math-start">
            {copy.start}
          </Button>
        </section>
      </LearnShell>
    )
  }
  if (!q) {
    // nothing taught yet (a check opened too early): back to the stages
    return (
      <LearnShell title={title} speak={[copy.testHint]}>
        <p className="text-center text-xl">{copy.testHint}</p>
        <div className="flex justify-center">
          <Button variant="soft" size="md" onClick={onMenu}>
            {copy.stages}
          </Button>
        </div>
      </LearnShell>
    )
  }

  const choices = q.options.map((n) => ({
    id: String(n),
    label: level === 4 ? groupLabel(language, q.object, n) : String(n),
    content:
      level === 4 ? (
        <ObjectGroup
          object={q.object}
          count={n}
          className="h-full w-full"
          itemClassName={Math.max(...q.options) <= 4 ? 'w-[40%]' : 'w-[30%]'}
        />
      ) : (
        <span className="font-display text-6xl font-extrabold tabular-nums sm:text-7xl">{n}</span>
      ),
  }))

  return (
    <LearnShell
      title={title}
      step={{
        current: mode === 'learn' ? index + 1 : index,
        total: mode === 'learn' ? questions.length + 1 : questions.length,
      }}
      help={help}
      speak={[questionText]}
    >
      <section
        key={q.id}
        className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4"
        data-testid="math-question"
        data-sum={q.sum}
      >
        {mode === 'learn' && (
          <span
            className={clsx(
              'rounded-full px-4 py-1 font-display text-base font-bold',
              guided ? 'bg-sky-soft' : 'bg-lilac-soft',
            )}
          >
            {guided ? copy.guided : copy.alone}
          </span>
        )}
        {level === 4 ? (
          <>
            <CountScene
              key={q.id}
              fact={q}
              object={q.object}
              label={copy.counted}
              recountLabel={copy.recount}
            />
            <p className="max-w-2xl text-center text-xl font-semibold sm:text-2xl">
              {questionText}
            </p>
            <Equation fact={q} solved={solved} small />
          </>
        ) : (
          <>
            <Equation fact={q} solved={solved} />
            <p className="text-center text-lg text-ink-soft sm:text-xl">{questionText}</p>
            {guided && (
              <div className="w-full max-w-lg rounded-[28px] bg-surface p-3 shadow-[0_4px_0_var(--color-line)]">
                <HelpVisual fact={q} stage={q.stage} object={q.object} />
              </div>
            )}
          </>
        )}
        <ChoiceGrid
          choices={choices}
          statuses={statuses}
          onChoose={choose}
          disabled={solved}
          className={level === 4 ? 'max-w-sm' : 'max-w-xl'}
        />
      </section>
    </LearnShell>
  )
}

function StageDone({
  result,
  title,
  text,
  actions,
  coinsLabel,
}: {
  result: FinishedSession
  title: string
  text: string
  actions: ReactNode
  coinsLabel: (count: number) => string
}) {
  const { say } = useLearnMascot()
  useEffect(() => {
    say('celebrate', { text, emoji: '🎉' })
  }, [say, text])
  return (
    <section
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[36px] bg-surface p-6 text-center shadow-[0_8px_0_var(--color-line)]"
      data-testid="stage-done"
    >
      <Img3D name="glowing-star" className="size-24" eager />
      <h2 className="font-display text-3xl font-extrabold">{title}</h2>
      <p className="text-lg">{text}</p>
      {result.coins > 0 && (
        <p className="inline-flex items-center gap-2 rounded-full bg-coin-soft px-4 py-2 font-display text-xl font-extrabold">
          <CoinIcon size={26} />
          {coinsLabel(result.coins)}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">{actions}</div>
    </section>
  )
}
