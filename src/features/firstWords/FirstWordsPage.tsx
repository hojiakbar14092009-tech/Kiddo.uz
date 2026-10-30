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
import { BuildWord, BuildExample } from './BuildWord'
import { ChoiceQuestion } from './ChoiceQuestion'
import { COPY } from './copy'
import { generateSession, type Level, type WordQuestion } from './generate'
import { useStable } from './useStable'

/**
 * «Birinchi so‘zim»: first letters (4), building a word from letters (5) and
 * reading words and simple sentences (6), in the child's language. Learning
 * lets the child try again; the short check keeps the first answer.
 */
export function FirstWordsPage() {
  const language = useLanguage()
  const level = useContentTier(SECTION_STRAND.words) as Level
  const [run, setRun] = useState<{ mode: LearnMode; key: number } | null>(null)

  if (!run) return <Menu language={language} onPick={(mode) => setRun({ mode, key: 1 })} />
  return (
    <WordsRun
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
  const greet = useStable(() => say('greet', { text: copy.greet, emoji: '🔤' }))
  useEffect(() => greet(), [greet, language])

  return (
    <LearnShell title={t('learn.sections.words')} speak={[copy.greet]}>
      <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 rounded-[36px] bg-surface p-6 text-center shadow-[0_8px_0_var(--color-line)]">
        <Img3D name="book" className="size-24 sm:size-28" eager />
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl">{copy.choose}</h2>
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center gap-2">
            <Button
              className="w-full [overflow-wrap:anywhere]"
              onClick={() => onPick('learn')}
              data-testid="words-learn"
            >
              {t('learn.learnMode')}
            </Button>
            <p className="text-ink-soft">{copy.learnHint}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="coin"
              className="w-full [overflow-wrap:anywhere]"
              onClick={() => onPick('test')}
              data-testid="words-test"
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

function WordsRun({
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
  const orderKey = `words|${language}|${level}|${mode}`
  const [plan] = useState(() => {
    const learn = getLearnChild(childKey)
    return generateSession({ language, level, mode, learn, lastOrder: learn.lastOrder[orderKey] })
  })
  const session = useLearnSession({ section: 'words', language, stage: String(level), mode })
  const [showExample, setShowExample] = useState(plan.example !== null)
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<FinishedSession | null>(null)
  const { questions } = plan

  useEffect(() => {
    setLastOrder(
      childKey,
      orderKey,
      orderOf(questions, (q) => q.id),
    )
  }, [childKey, orderKey, questions, setLastOrder])

  const next = (q: WordQuestion) => {
    session.close(q)
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      return
    }
    const finished = session.finish(questions.length)
    if (mode === 'learn') markStage(childKey, 'words', language, String(level))
    setResult(finished)
  }

  const title = t('learn.sections.words')

  if (result) {
    return (
      <LearnShell title={title}>
        <LearnResult result={result} onAgain={onAgain} />
      </LearnShell>
    )
  }

  if (showExample && plan.example) {
    return (
      <BuildExample
        title={title}
        word={plan.example}
        language={language}
        onDone={() => setShowExample(false)}
      />
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
  return q.kind === 'build' ? (
    <BuildWord key={q.id} q={q} {...common} />
  ) : (
    <ChoiceQuestion key={q.id} q={q} {...common} />
  )
}
