import { useEffect, useRef, useState } from 'react'
import type { Language } from '@/content/languages'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { Img3D } from '@/features/learn/Img3D'
import { LearnResult } from '@/features/learn/LearnResult'
import { useLearnChild, useLearnStore } from '@/features/learn/learnStore'
import { orderOf } from '@/features/learn/review'
import { useSpeakable } from '@/features/learn/speakable'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useLearnSession, type FinishedSession } from '@/features/learn/useLearnSession'
import { useMascot } from '@/features/mascot/useMascot'
import { useChildKey } from '@/store/progressStore'
import type { TaleSpec } from './content'
import { checkOrderKey, pickChecks } from './logic'
import type { TalesUi } from './ui'

/** The short check after a tale (test mode): first answers count, a later try only finishes the question. */
export function TaleCheck({
  tale,
  language,
  ui,
  onStep,
  onAgain,
}: {
  tale: TaleSpec
  language: Language
  ui: TalesUi
  onStep: (current: number, total: number) => void
  onAgain: () => void
}) {
  const learn = useLearnChild()
  const childKey = useChildKey()
  const setLastOrder = useLearnStore((state) => state.setLastOrder)
  const [questions] = useState(() => pickChecks(tale, language, learn))
  const session = useLearnSession({ section: 'tales', language, stage: tale.id, mode: 'test' })
  const { say } = useLearnMascot()
  const { react } = useMascot()
  const [index, setIndex] = useState(0)
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({})
  const [result, setResult] = useState<FinishedSession | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const question = questions[index]
  // the shared speaker button reads exactly the question on screen
  useSpeakable(result ? null : [question?.prompt])

  useEffect(() => {
    setLastOrder(
      childKey,
      checkOrderKey(tale, language),
      orderOf(questions, (q) => q.id),
    )
  }, [childKey, language, questions, setLastOrder, tale])

  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    if (!question || result) return
    onStep(index, questions.length)
    // the question shows in the bubble; it is read only when the child asks
    react('instruct', { text: question.prompt, emoji: '🤔' }, { speak: false })
  }, [index, onStep, question, questions.length, react, result])

  if (result) return <LearnResult result={result} onAgain={onAgain} />
  if (!question) return null

  const choose = (asset: string) => {
    const option = question.options.find((o) => o.asset === asset)
    if (!option || Object.values(statuses).includes('correct')) return
    session.answer(question, asset, option.correct, option.correct ? null : `chose-${asset}`)
    if (!option.correct) {
      setStatuses((current) => ({ ...current, [asset]: 'wrong' }))
      say('wrong')
      return
    }
    setStatuses((current) => ({ ...current, [asset]: 'correct' }))
    say('correct')
    session.close(question)
    timer.current = setTimeout(() => {
      setStatuses({})
      if (index + 1 < questions.length) setIndex(index + 1)
      else setResult(session.finish(questions.length))
    }, 1100)
  }

  return (
    <section aria-labelledby="tale-check-title" className="flex flex-col gap-4">
      <h2 id="tale-check-title" className="sr-only">
        {ui.questionsTitle}
      </h2>
      <div className="flex items-center justify-center gap-3">
        <p className="text-center font-display text-2xl font-bold sm:text-3xl" aria-live="polite">
          {question.prompt}
        </p>
      </div>
      <ChoiceGrid
        key={question.id}
        choices={question.options.map((option) => ({
          id: option.asset,
          label: option.label,
          content: (
            <>
              <Img3D name={option.asset} className="size-[62%]" />
              <span className="text-center text-sm leading-tight font-bold sm:text-lg">
                {option.label}
              </span>
            </>
          ),
        }))}
        statuses={statuses}
        onChoose={choose}
      />
    </section>
  )
}
