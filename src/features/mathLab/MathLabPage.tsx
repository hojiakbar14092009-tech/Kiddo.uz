import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HomeIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { SHORT_SCREEN } from '@/components/layout/shortScreen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { StepDots } from '@/components/ui/Progress'
import { useChallengeLevel, type ChallengeLevel } from '@/domain/learner'
import {
  dueReviews,
  getChildMemory,
  getSkillMemory,
  isActive,
  recordEvidence,
  type HintLevel,
} from '@/domain/learningMemory'
import { aiWorthAsking, buildTutorRequest, nextHint } from '@/domain/tutor'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import { emitUniverse } from '@/domain/universe/store'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { HelpButton } from '@/features/learn/HelpButton'
import { Img3D } from '@/features/learn/Img3D'
import { markHelp, newSheet, recordAnswer, type SessionSheet } from '@/features/learn/session'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { SPEAK_PRIORITY, useSpeakable } from '@/features/learn/speakable'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useLearnVoice } from '@/features/learn/voice'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascotStore } from '@/features/mascot/mascotStore'
import { TutorPanel } from '@/features/tutor/TutorPanel'
import { useTutorReply } from '@/features/tutor/useTutorReply'
import { tDynamic } from '@/lib/tDynamic'
import { newId } from '@/lib/id'
import { useChildKey } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { BasketTask } from './BasketTask'
import { errorOf, isRight, planSession, type LabQuestion, type ReviewPlan } from './generators'
import { HelpPicture, OptionFace, SceneView } from './parts'
import { labActivity, labSummary, type LabSummary } from './result'
import { helpText, optionLabel, promptText } from './text'
import { cardToRemove, isSymbolic, labSkillKey, solutionText, tutorItem } from './tutor'

/** Levels from which the level number is shown; younger screens stay pictorial. */
const SHOW_LEVEL_FROM = 3
/** How long the praise stays before the next question (not a time limit). */
const NEXT_DELAY_MS = 1100

/**
 * `/math-lab`: adaptive maths practice. The challenge level of the 'number'
 * strand (domain/learner) picks the questions; every finished session goes
 * to the universe once (`emitActivity`), which also moves the level for the
 * next session. A level is never lowered out loud and never locked by age.
 */
export function MathLabPage() {
  const level = useChallengeLevel('number')
  const [run, setRun] = useState<{ count: number; level: ChallengeLevel } | null>(null)

  if (!run) return <LabStart level={level} onStart={() => setRun({ count: 1, level })} />
  return (
    <LabSession
      key={run.count}
      level={run.level}
      onAgain={() => setRun({ count: run.count + 1, level })}
    />
  )
}

// ------------------------------------------------------------------ frame

function LevelChip({ level, className }: { level: ChallengeLevel; className?: string }) {
  const { t } = useTranslation()
  if (level < SHOW_LEVEL_FROM) return null
  return (
    <span
      data-testid="lab-level"
      className={clsx(
        className,
        'shrink-0 rounded-full bg-coin-soft px-3 py-1 font-display text-base font-extrabold whitespace-nowrap text-ink sm:text-lg short:text-sm',
      )}
    >
      {t('mathLab.level', { level })}
    </span>
  )
}

function LabFrame({
  level,
  speak,
  step,
  help,
  hideMascotShort = false,
  compact = false,
  children,
}: {
  level: ChallengeLevel
  /** A phone held sideways: no robot (the screen says the same in big letters). */
  hideMascotShort?: boolean
  /** A low phone (e.g. 320×568): the buttons side by side, so the task below fits. */
  compact?: boolean
  speak: readonly string[]
  step?: { current: number; total: number }
  help?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  const voice = useLearnVoice()
  const resetMascot = useMascotStore((state) => state.reset)
  const title = t('mathLab.title')
  useSpeakable(speak, SPEAK_PRIORITY.page)

  // leaving the lab: the bubble clears and any voice stops
  useEffect(
    () => () => {
      resetMascot()
      voice.stop()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <Screen
      header={
        <TitleTopBar
          title={title}
          back="/home"
          extra={<LevelChip level={level} className="max-[479px]:hidden" />}
        />
      }
      className={clsx('gap-3 px-4 py-3 sm:gap-5 sm:px-8 sm:py-5', SHORT_SCREEN.page)}
    >
      <div
        className={clsx('mx-auto flex w-full max-w-4xl items-center gap-3', SHORT_SCREEN.mascotRow)}
      >
        <Mascot
          robotClassName={clsx('w-14 sm:w-24', SHORT_SCREEN.robot)}
          className={clsx('min-w-0 flex-1', hideMascotShort && 'short:hidden')}
          speaking={voice.speaking}
          talkOnlyWhileSpeaking
        />
        {step && step.total > 1 && (
          <StepDots
            current={step.current}
            total={step.total}
            label={t('learn.question', { current: step.current + 1, total: step.total })}
            className="max-sm:hidden short:flex"
          />
        )}
        {/* stacked on a narrow phone, so the mascot's bubble keeps its room (as in LearnShell) */}
        <div
          className={clsx(
            'ml-auto flex shrink-0 flex-col items-center gap-2 sm:flex-row sm:gap-3',
            SHORT_SCREEN.actions,
            compact && '[@media(max-height:700px)]:flex-row',
          )}
        >
          <SpeakButton fallback={[title]} />
          {help}
        </div>
      </div>
      {/* on a phone the bubble needs the row: the steps (and the level, which the top bar
          has no room for) sit on a line of their own */}
      <div className="-mt-1 flex items-center justify-center gap-3 empty:hidden sm:hidden short:hidden">
        {step && step.total > 1 && (
          <StepDots
            current={step.current}
            total={step.total}
            label={t('learn.question', { current: step.current + 1, total: step.total })}
          />
        )}
        <LevelChip level={level} className="min-[480px]:hidden" />
      </div>
      {children}
    </Screen>
  )
}

// ------------------------------------------------------------------ start

function LabStart({ level, onStart }: { level: ChallengeLevel; onStart: () => void }) {
  const { t } = useTranslation()
  const { say } = useLearnMascot()
  const intro = t('mathLab.intro')

  useEffect(() => {
    // the bubble stays short; the card below says the rest
    say('greet', { text: t('mathLab.title'), emoji: '🔢' })
  }, [say, t])

  return (
    <LabFrame level={level} speak={[t('mathLab.title'), intro]}>
      <section
        aria-labelledby="lab-start-title"
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-panel bg-surface p-5 text-center shadow-press-lg sm:p-8 short:max-w-3xl short:flex-row short:gap-5 short:p-4 short:text-left"
      >
        <div className="flex items-end justify-center" aria-hidden="true">
          <Img3D name="apple" className="size-16 sm:size-20 short:size-12" eager />
          <Img3D name="basket" className="size-24 sm:size-28 short:size-16" eager />
          <Img3D name="tangerine" className="size-14 sm:size-16 short:size-10" eager />
        </div>
        <div className="flex w-full min-w-0 flex-col items-center gap-3 short:items-start short:gap-2">
          {/* not a heading: the top bar's h1 already says it (one heading per name) */}
          <p
            id="lab-start-title"
            className="font-display text-2xl font-extrabold break-words min-[380px]:text-3xl sm:text-4xl short:text-2xl"
          >
            {t('mathLab.title')}
          </p>
          <p className="text-lg text-ink-soft short:text-base">{intro}</p>
          <div className="flex flex-wrap justify-center gap-3 short:justify-start">
            <Button onClick={onStart} data-testid="lab-start">
              {t('mathLab.start')}
            </Button>
          </div>
          <LinkButton
            to="/learn/math"
            variant="soft"
            size="md"
            className="max-w-full text-center text-lg whitespace-normal!"
          >
            {t('mathLab.classic')}
          </LinkButton>
        </div>
      </section>
    </LabFrame>
  )
}

// ------------------------------------------------------------------ session

interface Finished {
  summary: LabSummary
  award: Pick<AwardSummary, 'stars' | 'crystals' | 'parts'>
}

/**
 * The due spaced review for this session, if any: a skill the learning memory
 * says needs another look, practised at a level not above today's.
 */
function reviewFor(childKey: string, level: ChallengeLevel): ReviewPlan | null {
  const due = dueReviews(getChildMemory(childKey).skills, new Date().toISOString(), 5)
  for (const memory of due) {
    if (!memory.skill.startsWith('math:') || !memory.level || memory.level > level) continue
    const avoid = Object.values(memory.misconceptions).flatMap((m) => m.items)
    return { skill: memory.skill.slice(5), level: memory.level as ChallengeLevel, avoid }
  }
  return null
}

/** Is this error one the learning memory already knows for this skill (confirmed or improving)? */
function remembered(childKey: string, q: LabQuestion, code: string | null): boolean {
  if (!code) return false
  const m = getSkillMemory(childKey, labSkillKey(q))?.misconceptions[code]
  return Boolean(m && isActive(m))
}

function LabSession({ level, onAgain }: { level: ChallengeLevel; onAgain: () => void }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const childKey = useChildKey()
  const { say, reset } = useLearnMascot()
  const [questions] = useState(() => planSession(level, Math.random, reviewFor(childKey, level)))
  const [runId] = useState(newId)
  const sheet = useRef<SessionSheet>(newSheet('test'))
  const [index, setIndex] = useState(0)
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({})
  const [misses, setMisses] = useState(0)
  const [solved, setSolved] = useState(false)
  const [hint, setHint] = useState<HintLevel>(0)
  const [note, setNote] = useState<string | null>(null)
  const [finished, setFinished] = useState<Finished | null>(null)
  const tutor = useTutorReply()
  // session memory of the current question (layer 1: never stored)
  const errors = useRef<string[]>([])
  const maxHint = useRef<HintLevel>(0)
  const lastAnswer = useRef<{ value: string; code: string | null } | null>(null)
  const emitted = useRef(false)
  const helpPanel = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion() ?? false
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const q = questions[index]
  const prompt = q ? promptText(t, language, q) : ''

  // after a mistake the help comes into view (it may be below the answers on a small phone)
  useEffect(() => {
    if (hint > 0) {
      helpPanel.current?.scrollIntoView?.({
        block: 'nearest',
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
    }
  }, [hint, reduceMotion])

  // a session (and its result) starts at the top, not where the last screen was scrolled to
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [finished])

  // `say` changes on every render (it closes over the voice): read it through a
  // ref, so the effect below runs only when the question changes
  const sayRef = useRef(say)
  sayRef.current = say
  const reviewLine = t('tutor.review')

  // a new question: the bubble from the last answer goes away; a review says so kindly
  useEffect(() => {
    reset()
    if (questions[index]?.review) sayRef.current('instruct', { text: reviewLine, emoji: '🌱' })
    // only on a new question: the line and the questions never change within one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reset])

  /**
   * Counts the finished session in the universe (once, at the level it was
   * played at). Called the moment the last answer is right, so leaving during
   * the praise never loses the run; only the result screen waits.
   */
  const record = useCallback((): Finished | null => {
    if (emitted.current) return null
    emitted.current = true
    const summary = labSummary(sheet.current, questions.length, level)
    let award: Finished['award'] = { stars: 0, crystals: 0, parts: 0 }
    try {
      award = emitActivity(labActivity(runId, childKey, summary))
      // later phases (Mistake Garden) listen for these
      for (const skill of summary.mistakeSkills) {
        emitUniverse({ type: 'mistake.made', childKey, skill, strand: 'number', activityId: runId })
      }
    } catch {
      // the child still sees the praise; the universe keeps its own state
    }
    return { summary, award }
  }, [childKey, level, questions.length, runId])

  /** The finished question goes to the learning memory (layer 2) as evidence. */
  const remember = useCallback(
    (question: LabQuestion, firstTry: boolean) => {
      try {
        recordEvidence(childKey, {
          id: `${runId}|${index}`,
          skill: labSkillKey(question),
          item: question.id,
          level: question.level,
          at: new Date().toISOString(),
          firstTry,
          helpedBefore: Boolean(sheet.current.helpedBefore[question.id]),
          // each code once, at most 8 (a basket can be tried again and again)
          errors: [...new Set(errors.current)].slice(-8),
          maxHint: maxHint.current,
          review: Boolean(question.review),
        })
      } catch {
        // memory is an aid: a failure never stops the game
      }
    },
    [childKey, index, runId],
  )

  const advance = useCallback(() => {
    setIndex(index + 1)
    setStatuses({})
    setMisses(0)
    setSolved(false)
    setHint(0)
    setNote(null)
    tutor.clear()
    errors.current = []
    maxHint.current = 0
    lastAnswer.current = null
  }, [index, tutor])

  /** Kiddo's own words for a hint step (always there, with or without an AI). */
  const localHint = (
    question: LabQuestion,
    step: HintLevel,
    code: string | null,
    removed: boolean,
  ) => {
    const target = question.scene.type === 'basket' ? question.scene.target : 0
    if (step <= 1) {
      const clue = tDynamic(t, `tutor.clue.${code ?? 'default'}`, {
        defaultValue: t('tutor.clue.default'),
      })
      return remembered(childKey, question, code) ? `${t('tutor.remembered')} ${clue}` : clue
    }
    if (step === 2) return helpText(t, question)
    if (step === 3) {
      if (question.kind === 'drag') return t('tutor.partialDrag', { target })
      return removed ? t('tutor.partial') : helpText(t, question)
    }
    if (question.kind === 'drag') return t('tutor.solutionDrag', { target })
    return t('tutor.solution', { solution: solutionText(t, language, question) })
  }

  /** Shows a step of the hint ladder: cards, words, the mascot, and maybe an AI reply. */
  const showHint = (
    question: LabQuestion,
    step: HintLevel,
    current: Record<string, ChoiceStatus>,
  ) => {
    if (step === 0) return
    setHint(step)
    if (step > maxHint.current) maxHint.current = step
    let next = current
    let removed = false
    if (step >= 3 && question.kind !== 'drag') {
      const card = cardToRemove(question, current)
      if (card) {
        next = { ...next, [card]: 'removed' }
        removed = true
      } else {
        removed = Object.values(current).includes('removed')
      }
    }
    if (step >= 4 && question.kind !== 'drag') next = { ...next, [question.answer]: 'hint' }
    setStatuses(next)
    const code = lastAnswer.current?.code ?? null
    const local = localHint(question, step, code, removed)
    say('wrong', { text: step === 1 ? local : t('mathLab.feedback.wrong'), emoji: '💡' })
    tutor.show(
      step,
      local,
      aiWorthAsking(step, isSymbolic(question))
        ? () =>
            buildTutorRequest({
              childId: childKey,
              language,
              level: question.level,
              persona: 'kidobot',
              intent: step === 4 ? 'explain' : 'hint',
              hintLevel: step as 1 | 2 | 3 | 4,
              item: tutorItem(question, lastAnswer.current?.value, code ?? undefined),
              memory: getSkillMemory(childKey, labSkillKey(question)),
            })
        : null,
    )
  }

  const answer = (value: string) => {
    if (!q || solved) return
    const correct = isRight(q, value)
    const code = errorOf(q, value)
    sheet.current = recordAnswer(sheet.current, q, value, correct, code)
    if (correct) {
      setStatuses((s) => ({ ...s, [value]: 'correct' }))
      setSolved(true)
      setNote(null)
      tutor.clear()
      say('correct')
      remember(q, misses === 0)
      if (index + 1 >= questions.length) {
        const done = record()
        timer.current = window.setTimeout(() => done && setFinished(done), NEXT_DELAY_MS)
      } else {
        timer.current = window.setTimeout(advance, NEXT_DELAY_MS)
      }
      return
    }
    const count = misses + 1
    setMisses(count)
    if (code) errors.current = [...errors.current, code]
    lastAnswer.current = { value, code }
    // each mistake climbs one step of the ladder (never down, never straight to the answer)
    const step = nextHint(hint)
    // the basket's "too many / too few" line: the first clue already says it
    if (q.kind === 'drag' && step >= 2) {
      setNote(
        t(
          Number(value) > Number(q.answer) ? 'mathLab.feedback.tooMany' : 'mathLab.feedback.tooFew',
        ),
      )
    }
    showHint(q, step, { ...statuses, [value]: 'wrong' })
  }

  /** The child asks for more help: one step up the ladder. */
  const moreHelp = () => {
    if (!q || solved) return
    showHint(q, nextHint(hint), statuses)
  }

  const help = useMemo(
    () =>
      q && !finished ? (
        <HelpButton
          key={q.id}
          text={helpText(t, q)}
          glow={misses > 0 && !solved}
          onOpen={() => {
            sheet.current = markHelp(sheet.current, q.id)
            // the bulb shows the picture help: step 2 of the ladder
            if (maxHint.current < 2) maxHint.current = 2
          }}
        >
          <HelpPicture visual={q.help.visual} object={q.object} />
        </HelpButton>
      ) : null,
    [finished, misses, q, solved, t],
  )

  if (finished) {
    return <LabResult level={level} finished={finished} onAgain={onAgain} />
  }
  if (!q) return null

  const choices = q.options.map((option) => ({
    id: option.id,
    label: optionLabel(t, language, q, option),
    content: <OptionFace option={option} object={q.object} />,
  }))

  return (
    <LabFrame
      level={level}
      speak={[prompt]}
      step={{ current: index, total: questions.length }}
      help={help}
      compact={q.kind === 'drag'}
    >
      <section
        key={q.id}
        data-testid="lab-question"
        data-kind={q.kind}
        data-level={q.level}
        data-answer={q.answer}
        data-step={index}
        data-review={q.review ? 'true' : undefined}
        className={clsx(
          'mx-auto flex w-full max-w-4xl flex-col items-center gap-4 sm:gap-6',
          // a phone held sideways: the question beside the answers (the basket needs the width)
          q.kind === 'drag'
            ? 'max-sm:gap-2 short:gap-2'
            : 'short:grid short:grid-cols-2 short:items-center short:gap-4',
        )}
      >
        <div className="flex w-full flex-col items-center gap-3 short:gap-2">
          <h2
            aria-live="polite"
            data-testid="lab-prompt"
            className="text-center font-display text-2xl leading-tight font-extrabold sm:text-3xl short:text-lg"
          >
            {prompt}
          </h2>
          {q.kind === 'drag' && (
            <p className="text-center text-base text-ink-soft max-sm:text-sm short:text-sm">
              {t('mathLab.dragHow')}
            </p>
          )}
          <SceneView scene={q.scene} object={q.object} />
        </div>

        {q.kind === 'drag' && q.scene.type === 'basket' ? (
          <BasketTask
            object={q.object}
            available={q.scene.available}
            locked={solved}
            onDone={(count) => answer(String(count))}
          />
        ) : (
          <ChoiceGrid
            choices={choices}
            statuses={statuses}
            onChoose={answer}
            disabled={solved}
            className={clsx('max-w-2xl short:gap-3', choices.length === 4 && 'short:grid-cols-2')}
            cardClassName={clsx(
              'min-h-24 short:aspect-auto short:h-24 short:min-h-0',
              choices.length === 4 && 'max-sm:aspect-[4/3]',
            )}
          />
        )}
      </section>

      {hint > 0 && !solved && tutor.view && (
        <TutorPanel
          panelRef={helpPanel}
          level={tutor.view.level}
          message={tutor.view.message}
          source={tutor.view.source}
          thinking={tutor.thinking}
          note={note}
          onMore={moreHelp}
        >
          {hint >= 2 && <HelpPicture visual={q.help.visual} object={q.object} />}
        </TutorPanel>
      )}
    </LabFrame>
  )
}

// ------------------------------------------------------------------ result

function LabResult({
  level,
  finished,
  onAgain,
}: {
  level: ChallengeLevel
  finished: Finished
  onAgain: () => void
}) {
  const { t } = useTranslation()
  const { say } = useLearnMascot()
  const nextLevel = useChallengeLevel('number')
  const { summary, award } = finished
  const allOwn = summary.independent === summary.total
  const title = t('mathLab.result.title')
  const score = t('learn.result.independent', {
    correct: summary.independent,
    total: summary.total,
  })
  // only a step up is told; a step down happens quietly
  const levelUp = nextLevel > level ? t('mathLab.result.levelUp') : null

  useEffect(() => {
    say('celebrate', { text: title, emoji: allOwn ? '🏆' : '🌟' })
  }, [allOwn, say, title])

  return (
    <LabFrame level={level} speak={[title, score, levelUp ?? '']} hideMascotShort>
      <section
        aria-labelledby="lab-result-title"
        data-testid="lab-result"
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-panel bg-surface p-5 text-center shadow-press-lg sm:p-8 short:grid short:max-w-3xl short:grid-cols-[auto_1fr] short:items-center short:gap-x-4 short:gap-y-2 short:p-3"
      >
        {/* held sideways: words on the left, the reward on the right, buttons under both */}
        <div className="flex flex-col items-center gap-3 short:gap-1">
          <h2
            id="lab-result-title"
            className="flex items-center gap-2 font-display text-3xl font-extrabold short:text-2xl"
          >
            <Img3D
              name={allOwn ? 'trophy' : 'glowing-star'}
              className="size-14 short:size-10"
              eager
            />
            {title}
          </h2>
          <p
            className="font-display text-2xl font-bold text-primary-ink short:text-xl"
            data-testid="lab-score"
          >
            {score}
          </p>
          {award.parts > 0 && (
            <p className="flex items-center gap-2 rounded-full bg-sky-soft px-4 py-1.5 font-display text-xl font-extrabold">
              <ResourceIcon resource="part" size={30} />
              {t('award.parts', { count: award.parts })}
            </p>
          )}
          {levelUp && <p className="text-lg font-bold short:text-base">{levelUp}</p>}
        </div>
        <div className="flex flex-col items-center gap-3 short:gap-1">
          <ActivityReward stars={award.stars} crystals={award.crystals} />
        </div>
        <div className="flex flex-wrap justify-center gap-3 short:col-span-2">
          <Button variant="coin" size="md" onClick={onAgain} data-testid="lab-again">
            {t('learn.again')}
          </Button>
          <LinkButton to="/home" variant="soft" size="md" icon={<HomeIcon size={24} />}>
            {t('mathLab.result.home')}
          </LinkButton>
        </div>
      </section>
    </LabFrame>
  )
}
