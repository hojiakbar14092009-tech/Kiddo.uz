import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { Language } from '@/content/languages'
import { Img3D } from '@/features/learn/Img3D'
import { LearnResult } from '@/features/learn/LearnResult'
import { LearnShell } from '@/features/learn/LearnShell'
import { getLearnChild, useLearnStore } from '@/features/learn/learnStore'
import { orderOf } from '@/features/learn/review'
import type { LearnMode } from '@/features/learn/session'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useLearnSession, type FinishedSession } from '@/features/learn/useLearnSession'
import { useContentTier } from '@/domain/adaptive'
import { SECTION_STRAND } from '@/domain/universe/wiring'
import { useChildKey } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { COPY } from './copy'
import { FindView } from './FindView'
import { FixView } from './FixView'
import { generateSession, type HelpQuestion, type Level } from './generate'
import { useStable } from './useStable'

/**
 * «Maskotga yordam ber»: the robot asks for help. Age 4 finds what it asks
 * for, age 5 fixes its mixed-up letter, word or sum, age 6 checks its answers,
 * finds the wrong one and puts it right. A mistake always ends crossed out
 * with the right answer next to it.
 */
export function HelpMascotPage() {
  const language = useLanguage()
  const level = useContentTier(SECTION_STRAND.help) as Level
  const [run, setRun] = useState<{ mode: LearnMode; key: number } | null>(null)

  if (!run) return <Menu language={language} onPick={(mode) => setRun({ mode, key: 1 })} />
  return (
    <HelpRun
      key={`${run.key}-${language}-${level}`}
      mode={run.mode}
      language={language}
      level={level}
      onAgain={() => setRun({ mode: run.mode, key: run.key + 1 })}
    />
  )
}

function Menu({ language, onPick }: { language: Language; onPick: (mode: LearnMode) => void }) {
  const { t } = useTranslation()
  const copy = COPY[language]
  const { say } = useLearnMascot()
  const greet = useStable(() => say('greet', { text: copy.greet, emoji: '🤖' }))
  useEffect(() => greet(), [greet, language])

  return (
    <LearnShell title={t('learn.sections.help')} speak={[copy.greet]}>
      <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 rounded-[36px] bg-surface p-6 text-center shadow-[0_8px_0_var(--color-line)]">
        <Img3D name="paintbrush" className="size-24 sm:size-28" eager />
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{copy.choose}</h2>
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-2">
            <Button className="w-full" onClick={() => onPick('learn')} data-testid="help-learn">
              {t('learn.learnMode')}
            </Button>
            <p className="text-ink-soft">{copy.learnHint}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="coin"
              className="w-full"
              onClick={() => onPick('test')}
              data-testid="help-test"
            >
              {t('learn.testMode')}
            </Button>
            <p className="text-ink-soft">{copy.testHint}</p>
          </div>
        </div>
      </section>
    </LearnShell>
  )
}

function HelpRun({
  mode,
  language,
  level,
  onAgain,
}: {
  mode: LearnMode
  language: Language
  level: Level
  onAgain: () => void
}) {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const setLastOrder = useLearnStore((state) => state.setLastOrder)
  const markStage = useLearnStore((state) => state.markStage)
  const orderKey = `help|${language}|${level}|${mode}`
  const [questions] = useState(() => {
    const learn = getLearnChild(childKey)
    return generateSession({ language, level, mode, learn, lastOrder: learn.lastOrder[orderKey] })
  })
  const session = useLearnSession({ section: 'help', language, stage: String(level), mode })
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<FinishedSession | null>(null)

  useEffect(() => {
    setLastOrder(
      childKey,
      orderKey,
      orderOf(questions, (q) => q.id),
    )
  }, [childKey, orderKey, questions, setLastOrder])

  const next = (q: HelpQuestion) => {
    session.close(q)
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      return
    }
    const finished = session.finish(questions.length)
    if (mode === 'learn') markStage(childKey, 'help', language, String(level))
    setResult(finished)
  }

  const title = t('learn.sections.help')
  if (result) {
    return (
      <LearnShell title={title}>
        <LearnResult result={result} onAgain={onAgain} />
      </LearnShell>
    )
  }

  const q = questions[index]!
  const common = {
    title,
    step: { current: index, total: questions.length },
    mode,
    language,
    session,
    onNext: () => next(q),
  }
  return q.kind === 'find' ? (
    <FindView key={q.id} q={q} {...common} />
  ) : (
    <FixView key={q.id} q={q} {...common} />
  )
}
