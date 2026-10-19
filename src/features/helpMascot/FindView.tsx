import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { Img3D } from '@/features/learn/Img3D'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { COPY } from './copy'
import type { FindQuestion } from './generate'
import type { QuestionProps } from './shared'
import { useStable } from './useStable'

/** Age 4: “Find me the apple!” – the request is shown as a picture, so it works without sound. */
export function FindView({
  q,
  title,
  step,
  mode,
  language,
  session,
  onNext,
}: QuestionProps<FindQuestion>) {
  const { t } = useTranslation()
  const copy = COPY[language]
  const { say } = useLearnMascot()
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>({})
  const [solved, setSolved] = useState(false)
  const [stuck, setStuck] = useState(false)
  const thanks = copy.thanks(q.item.name)

  const ask = useStable(() => say('instruct', { text: q.item.ask, emoji: '🔎' }))
  useEffect(() => ask(), [ask])

  const choose = (id: string) => {
    if (solved) return
    const correct = id === q.item.id
    session.answer(q, id, correct, correct ? null : 'wrong-picture')
    if (correct || mode === 'test') {
      setStatuses((old) => ({
        ...old,
        [id]: correct ? 'correct' : 'wrong',
        [q.item.id]: 'correct',
      }))
      setSolved(true)
      say(correct ? 'correct' : 'instruct', { text: thanks, emoji: correct ? '🌟' : '👉' })
    } else {
      setStatuses((old) => ({ ...old, [id]: 'wrong' }))
      setStuck(true)
      say('wrong', { text: copy.notThis, emoji: '🔎' })
    }
  }

  return (
    <LearnShell
      title={title}
      step={step}
      onVoiceOn={ask}
      help={{
        text: copy.findHelp,
        glow: stuck,
        visual: <Img3D name={q.item.picture} className="size-28" />,
        onOpen: () => {
          session.help(q)
          setStuck(false)
          if (mode === 'learn' && !solved) {
            setStatuses((old) => ({ ...old, [q.item.id]: old[q.item.id] ?? 'hint' }))
          }
        },
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 sm:gap-6">
        <div
          className="relative flex items-center gap-4 rounded-[36px] bg-sky-soft px-6 py-4 shadow-[0_6px_0_var(--color-line)]"
          data-testid="help-request"
        >
          <span
            aria-hidden="true"
            className="absolute -top-3 left-10 size-6 rotate-45 rounded-sm bg-sky-soft"
          />
          <Img3D name={q.item.picture} alt={q.item.name} className="size-20 sm:size-24" eager />
          <p className="max-w-[16rem] font-display text-xl font-bold sm:text-2xl" lang={language}>
            {q.item.ask}
          </p>
        </div>
        <ChoiceGrid
          choices={q.options.map((item) => ({
            id: item.id,
            label: item.name,
            content: <Img3D name={item.picture} className="size-4/5" eager />,
          }))}
          statuses={statuses}
          onChoose={choose}
          disabled={solved}
          className="max-w-[min(30rem,58vh)]"
        />
        {solved && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-center text-lg" role="status">
              {thanks}
            </p>
            <Button onClick={onNext} data-testid="help-next" autoFocus>
              {t('learn.next')}
            </Button>
          </div>
        )}
      </div>
    </LearnShell>
  )
}
