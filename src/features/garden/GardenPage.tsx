import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BulbIcon, CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import type { Language } from '@/content/languages'
import { Img3D } from '@/features/learn/Img3D'
import { LearnResult } from '@/features/learn/LearnResult'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnChild, useLearnStore } from '@/features/learn/learnStore'
import { orderOf } from '@/features/learn/review'
import type { LearnMode } from '@/features/learn/session'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useLearnSession, type FinishedSession } from '@/features/learn/useLearnSession'
import { useContentTier } from '@/domain/adaptive'
import { SECTION_STRAND } from '@/domain/universe/wiring'
import { useChildKey } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { itemName, taskPrompt } from './content'
import {
  buildBoard,
  START,
  tap,
  pickTasks,
  sessionOrderKey,
  type AgeLevel,
  type BoardState,
  type GardenObject,
} from './game'
import {
  acceptHint,
  afterMistake,
  afterWait,
  HINT_AFTER_MS,
  NO_HELP,
  pressHelp,
  reveals,
  showsOffer,
  wiggleKey,
  type HelpLevel,
  type HelpState,
} from './help'
import { GARDEN_UI } from './ui'

const GRID: Record<number, string> = {
  4: 'grid-cols-2 sm:grid-cols-4',
  6: 'grid-cols-3 landscape:grid-cols-6',
  8: 'grid-cols-3 sm:grid-cols-4',
}

function Board({
  board,
  found,
  wrongKey,
  wiggle,
  language,
  label,
  onTap,
}: {
  board: readonly GardenObject[]
  found: readonly string[]
  wrongKey: string | null
  wiggle: string | null
  language: Language
  label: string
  onTap: (key: string) => void
}) {
  const reduceMotion = useReducedMotion() ?? false
  return (
    <div
      className="relative overflow-hidden rounded-[36px] p-4 pt-14 shadow-[0_8px_0_var(--color-line)] sm:p-6 sm:pt-16 short:pt-4!"
      style={{ background: 'linear-gradient(#BEE6FF 0%, #E4F6FF 22%, #A9DD90 22%, #8ED07A 100%)' }}
    >
      <Img3D name="sun" className="absolute top-2 right-4 size-12 sm:size-14" />
      <Img3D name="cloud" className="absolute top-3 left-6 w-16 opacity-90 sm:w-20" />
      <ul
        aria-label={label}
        className={clsx(
          'mx-auto grid max-w-3xl gap-3 sm:gap-5',
          GRID[board.length] ?? 'grid-cols-3',
        )}
      >
        {board.map((object, index) => {
          const isFound = found.includes(object.key)
          const isWrong = wrongKey === object.key
          const isWiggle = wiggle === object.key
          return (
            <li
              key={object.key}
              className={clsx(index % 2 === 1 && 'translate-y-3', 'flex justify-center')}
            >
              <motion.button
                type="button"
                data-testid="garden-object"
                data-asset={object.asset}
                aria-label={itemName(object.asset, language)}
                aria-pressed={isFound}
                onClick={() => onTap(object.key)}
                animate={
                  reduceMotion
                    ? undefined
                    : isWrong
                      ? { x: [0, -10, 9, -6, 4, 0], rotate: 0 }
                      : isWiggle
                        ? {
                            rotate: [0, -7, 7, -5, 5, 0],
                            x: 0,
                            transition: { duration: 1.2, repeat: Infinity },
                          }
                        : { x: 0, rotate: 0 }
                }
                className={clsx(
                  'relative flex aspect-square w-full max-w-36 min-w-20 items-center justify-center rounded-[28px] transition-colors',
                  // a short landscape phone: the whole row fits under the task
                  'short:max-w-[calc(100dvh-17rem)]',
                  'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  isFound
                    ? 'bg-primary-soft/90 ring-4 ring-primary'
                    : isWiggle
                      ? 'bg-coin-soft/90 shadow-[0_0_0_6px_rgba(255,201,60,0.45)] ring-4 ring-coin'
                      : isWrong
                        ? 'bg-oops-soft/80'
                        : 'bg-white/35',
                )}
              >
                <span
                  aria-hidden="true"
                  className="absolute bottom-[10%] h-[14%] w-[62%] rounded-[50%] bg-[#6B4F2C]/25"
                />
                <Img3D name={object.asset} className="relative size-[78%]" />
                {isFound && (
                  <span className="absolute -top-2 -right-2 flex size-9 items-center justify-center rounded-full border-4 border-cream bg-primary text-white">
                    <CheckIcon size={18} />
                  </span>
                )}
              </motion.button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function GardenGame({
  mode,
  level,
  language,
  onAgain,
  onTest,
}: {
  mode: LearnMode
  level: AgeLevel
  language: Language
  onAgain: () => void
  onTest: () => void
}) {
  const { t } = useTranslation()
  const ui = GARDEN_UI[language]
  const learn = useLearnChild()
  const childKey = useChildKey()
  const setLastOrder = useLearnStore((state) => state.setLastOrder)
  const [tasks] = useState(() => pickTasks(level, language, learn))
  const session = useLearnSession({ section: 'garden', language, stage: String(level), mode })
  const { say } = useLearnMascot()
  const [index, setIndex] = useState(0)
  const [board, setBoard] = useState(() => buildBoard(tasks[0]!, level))
  const [state, setState] = useState<BoardState>(START)
  const [help, setHelp] = useState<HelpState>(NO_HELP)
  const [wrongKey, setWrongKey] = useState<string | null>(null)
  const [result, setResult] = useState<FinishedSession | null>(null)
  const [learnDone, setLearnDone] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const task = tasks[index]!
  const prompt = taskPrompt(task, language)
  const done = state.found.length >= task.count

  useEffect(() => {
    setLastOrder(
      childKey,
      sessionOrderKey(language, level),
      orderOf(tasks, (item) => item.id),
    )
  }, [childKey, language, level, setLastOrder, tasks])

  useEffect(() => {
    const current = timers.current
    return () => current.forEach(clearTimeout)
  }, [])

  // each task: the task itself is the big heading (and what the speaker reads);
  // the mascot only adds the short "how" (tap it / tap each), so nothing shows twice
  const tapHow = task.count > 1 ? ui.tapEach : ui.tapOne
  useEffect(() => {
    if (result || learnDone) return
    say('instruct', { text: tapHow, emoji: '🔍' })
  }, [index, learnDone, tapHow, result, say])

  // stuck for a while (no new find): a soft hint is offered
  useEffect(() => {
    if (done || result || learnDone) return
    const timer = setTimeout(() => setHelp(afterWait), HINT_AFTER_MS)
    return () => clearTimeout(timer)
  }, [done, index, learnDone, result, state.found.length])

  const helpText = useCallback(
    (level: HelpLevel) =>
      level <= 1
        ? `${prompt} ${task.count > 1 ? ui.tapEach : ui.tapOne}`
        : level === 2
          ? task.kind === 'category'
            ? ui.example
            : ui.looksLike
          : ui.wiggling,
    [prompt, task, ui],
  )

  const applyHelp = (next: HelpState, announce: boolean) => {
    setHelp(next)
    if (reveals(next.level)) session.help(task)
    if (announce) say('instruct', { text: helpText(next.level), emoji: '💡' })
  }

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }

  const next = () => {
    if (index + 1 < tasks.length) {
      const following = tasks[index + 1]!
      setIndex(index + 1)
      setBoard(buildBoard(following, level))
      setState(START)
      setHelp(NO_HELP)
      return
    }
    if (mode === 'test') setResult(session.finish(tasks.length))
    else setLearnDone(true)
  }

  const onTap = (key: string) => {
    if (done) return
    const outcome = tap(board, state, key, task.count)
    setState(outcome.state)
    const object = board.find((candidate) => candidate.key === key)
    if (outcome.result === 'wrong' && object) {
      session.answer(
        task,
        object.asset,
        false,
        task.kind === 'category' ? 'not-in-group' : 'other-thing',
      )
      setWrongKey(key)
      later(() => setWrongKey(null), 700)
      setHelp((current) => afterMistake(current, outcome.state.mistakes))
      say('wrong', { text: ui.notThis, emoji: '🔍' })
    } else if (outcome.result === 'done') {
      session.answer(task, 'found', true)
      session.close(task)
      say('correct')
      later(next, 1300)
    }
  }

  if (result) {
    return (
      <LearnShell title={t('learn.sections.garden')}>
        <LearnResult result={result} onAgain={onAgain} />
      </LearnShell>
    )
  }
  if (learnDone) {
    return (
      <LearnShell title={t('learn.sections.garden')} speak={[ui.learnDone]}>
        <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[36px] bg-surface p-6 text-center shadow-[0_8px_0_var(--color-line)]">
          <Img3D name="glowing-star" className="size-28" eager />
          <p className="font-display text-2xl font-bold" data-testid="garden-learn-done">
            {ui.learnDone}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="primary" size="md" onClick={onTest}>
              {t('learn.startTest')}
            </Button>
            <Button variant="soft" size="md" onClick={onAgain}>
              {t('learn.again')}
            </Button>
          </div>
        </section>
      </LearnShell>
    )
  }

  const nextLevel = pressHelp(help).level
  const wiggle = wiggleKey(help.level, board, state.found)
  const example =
    task.kind === 'category' ? (board.find((o) => o.target)?.asset ?? task.target) : task.target

  return (
    <LearnShell
      title={t('learn.sections.garden')}
      speak={[prompt]}
      step={{ current: index, total: tasks.length }}
      help={{
        text: helpText(nextLevel),
        visual: nextLevel === 2 ? <Img3D name={example} className="size-32" /> : undefined,
        glow: help.offered && help.level < 2,
        onOpen: () => applyHelp(pressHelp(help), false),
      }}
    >
      <div className="flex flex-col items-center gap-2 short:flex-row short:flex-wrap short:justify-center short:gap-x-3">
        <p
          className="text-center font-display text-3xl font-extrabold short:text-2xl"
          aria-live="polite"
          data-testid="garden-prompt"
        >
          {prompt}
        </p>
        <span className="rounded-full bg-surface px-3 py-0.5 text-sm font-bold text-ink-soft">
          {t(mode === 'test' ? 'learn.testMode' : 'learn.learnMode')}
        </span>
        {task.count > 1 && (
          <div
            className="flex items-center gap-2"
            aria-label={ui.found(state.found.length, task.count)}
            role="status"
          >
            {Array.from({ length: task.count }, (_, slot) => {
              const key = state.found[slot]
              const asset = key ? board.find((o) => o.key === key)?.asset : undefined
              return (
                <span
                  key={slot}
                  className={clsx(
                    'flex size-12 items-center justify-center rounded-full border-4',
                    asset
                      ? 'border-primary bg-primary-soft'
                      : 'border-dashed border-line-strong bg-surface',
                  )}
                >
                  {asset && <Img3D name={asset} className="size-8" />}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {showsOffer(help, mode) && (
        <div
          className="mx-auto flex flex-wrap items-center justify-center gap-3 rounded-card bg-coin-soft px-4 py-3"
          role="status"
        >
          <span className="inline-flex items-center gap-2 font-display text-xl font-bold">
            <BulbIcon size={26} />
            {ui.offer}
          </span>
          <Button
            variant="coin"
            size="md"
            onClick={() => applyHelp(acceptHint(help), true)}
            data-testid="garden-offer"
          >
            {ui.offerYes}
          </Button>
        </div>
      )}
      {help.level >= 2 && !done && (
        <div
          className="mx-auto flex flex-wrap items-center justify-center gap-3 rounded-[28px] bg-surface px-4 py-3 shadow-[0_5px_0_var(--color-line)]"
          role="status"
        >
          <Img3D name={example} className="size-16" />
          <span className="max-w-xs text-lg font-semibold">{helpText(help.level)}</span>
          {help.level === 2 && (
            <Button
              variant="soft"
              size="md"
              onClick={() => applyHelp(pressHelp(help), true)}
              data-testid="garden-more"
            >
              {ui.showMore}
            </Button>
          )}
        </div>
      )}

      <Board
        board={board}
        found={state.found}
        wrongKey={wrongKey}
        wiggle={wiggle}
        language={language}
        label={ui.board}
        onTap={onTap}
      />
    </LearnShell>
  )
}

function ModePicker({ onPick }: { onPick: (mode: LearnMode) => void }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const ui = GARDEN_UI[language]
  const { say } = useLearnMascot()
  useEffect(() => {
    say('greet', { text: ui.howToPlay, emoji: '🌷' })
  }, [say, ui.howToPlay])
  return (
    <LearnShell title={t('learn.sections.garden')} speak={[ui.howToPlay]}>
      <h2 className="text-center font-display text-2xl font-bold">{ui.howToPlay}</h2>
      <div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        {(
          [
            ['learn', 'butterfly', 'learn.learnMode'],
            ['test', 'trophy', 'learn.testMode'],
          ] as const
        ).map(([mode, icon, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => onPick(mode)}
            data-testid={`garden-mode-${mode}`}
            className="flex items-center gap-4 rounded-[32px] bg-surface p-5 text-left shadow-[0_7px_0_var(--color-line)] transition-transform active:translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-col sm:text-center"
          >
            <Img3D name={icon} className="size-[min(5rem,20vw)] shrink-0 sm:size-28" eager />
            <span className="min-w-0 font-display text-2xl font-bold [overflow-wrap:anywhere]">
              {t(label)}
            </span>
          </button>
        ))}
      </div>
    </LearnShell>
  )
}

/** «Bog‘da top»: find things in a garden, with help that comes in small steps. */
export function GardenPage() {
  const language = useLanguage()
  const level = useContentTier(SECTION_STRAND.garden)
  const [mode, setMode] = useState<LearnMode | null>(null)
  const [round, setRound] = useState(0)
  if (!mode) return <ModePicker onPick={setMode} />
  return (
    <GardenGame
      key={`${mode}-${round}-${language}-${level}`}
      mode={mode}
      level={level}
      language={language}
      onAgain={() => setRound((r) => r + 1)}
      onTest={() => {
        setMode('test')
        setRound((r) => r + 1)
      }}
    />
  )
}
