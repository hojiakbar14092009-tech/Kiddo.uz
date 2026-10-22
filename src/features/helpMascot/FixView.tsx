import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { Img3D } from '@/features/learn/Img3D'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { COPY } from './copy'
import { explain } from './explain'
import { advance, startFlow, type FlowEvent } from './flow'
import { claimOf, showValue, type FixQuestion, type SpotQuestion } from './generate'
import type { QuestionProps } from './shared'
import { useStable } from './useStable'
import { ClaimView, Counters } from './views'

/**
 * Ages 5 and 6: the mascot's answer has a mistake. At 6 the child first finds
 * the wrong line on the mascot's worksheet. Either way it ends with the wrong
 * answer crossed out, the right one beside it and a short explanation.
 */
export function FixView({
  q,
  title,
  step,
  mode,
  language,
  session,
  onNext,
}: QuestionProps<FixQuestion | SpotQuestion>) {
  const { t } = useTranslation()
  const copy = COPY[language]
  const { say } = useLearnMascot()
  const [flow, setFlow] = useState(() => startFlow(q))
  const [stuck, setStuck] = useState(false)
  const [hint, setHint] = useState(false)
  const claim = claimOf(q)
  const explanation = explain(claim, language)
  const done = flow.stage === 'done'

  const prompt =
    flow.stage === 'spot'
      ? copy.spot
      : q.kind === 'spot'
        ? copy.fixLine
        : claim.type === 'initial'
          ? copy.fixInitial
          : claim.type === 'spelling'
            ? copy.fixSpelling
            : copy.fixSum
  const helpText =
    flow.stage === 'spot'
      ? copy.spotHelp
      : claim.type === 'initial'
        ? copy.fixInitialHelp
        : claim.type === 'spelling'
          ? copy.fixSpellingHelp
          : copy.fixSumHelp

  const instruct = useStable(() => say('instruct', { text: prompt, emoji: '🤔' }))
  useEffect(() => instruct(), [instruct, flow.stage])

  const send = (event: FlowEvent) => {
    const result = advance(q, mode, flow, event)
    if (result.record) {
      session.answer(q, result.record.value, result.record.correct, result.record.errorType)
    }
    setFlow(result.state)
    switch (result.feedback) {
      case 'line-is-right':
        setStuck(true)
        if (mode === 'learn') say('wrong', { text: copy.lineIsRight, emoji: '🔍' })
        break
      case 'try-again':
        setStuck(true)
        say('wrong', { text: copy.tryAgain, emoji: '💪' })
        break
      case 'fixed':
        say('correct', { text: `${copy.correct} ${explanation}`, emoji: '🌟' }, explanation)
        break
      case 'revealed':
        say('instruct', { text: explanation, emoji: '👉' }, explanation)
        break
      default:
        break
    }
  }

  const statuses: Record<string, ChoiceStatus> = {}
  for (const value of flow.triedOptions) statuses[value] = 'wrong'
  if (done) statuses[claim.right] = 'correct'
  else if (hint && mode === 'learn') statuses[claim.right] = 'hint'

  const showOptions = flow.stage !== 'spot'
  const textSize = claim.type === 'spelling' ? 'text-3xl sm:text-4xl' : 'text-6xl sm:text-7xl'

  return (
    <LearnShell
      title={title}
      step={step}
      speak={[done ? explanation : prompt]}
      help={{
        text: helpText,
        glow: stuck && !done,
        visual:
          claim.type === 'sum' && flow.stage !== 'spot' ? (
            <Counters claim={claim} counter={q.counter} />
          ) : flow.stage !== 'spot' && claim.type !== 'sum' ? (
            <Img3D name={claim.word.picture} className="size-28" />
          ) : undefined,
        onOpen: () => {
          session.help(q)
          setStuck(false)
          if (flow.stage !== 'spot') setHint(true)
        },
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 sm:gap-6">
        <p className="text-center font-display text-xl font-bold sm:text-2xl">{prompt}</p>

        {q.kind === 'fix' ? (
          <section
            aria-label={copy.mascotSaid}
            className="flex w-full max-w-xl flex-col items-center gap-3 rounded-[32px] bg-surface p-4 shadow-[0_6px_0_var(--color-line)] sm:p-6"
          >
            <span className="rounded-full bg-lilac-soft px-3 py-1 text-sm font-bold">
              🤖 {copy.mascotSaid}
            </span>
            {claim.type === 'sum' && <Counters claim={claim} counter={q.counter} />}
            <ClaimView claim={claim} language={language} corrected={done} />
          </section>
        ) : (
          <ol className="flex w-full max-w-xl flex-col gap-3" aria-label={copy.mascotSaid}>
            {q.lines.map((line) => {
              const checked = flow.checkedLines.includes(line.id)
              const isWrong = line.id === q.wrongLine
              const found = flow.stage !== 'spot' && isWrong
              return (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => send({ type: 'line', id: line.id })}
                    disabled={flow.stage !== 'spot' || checked}
                    data-testid="help-line"
                    data-wrong={isWrong || undefined}
                    className={clsx(
                      'relative flex min-h-20 w-full items-center justify-center rounded-[28px] px-4 py-3 transition-colors',
                      found
                        ? 'bg-oops-soft ring-4 ring-oops'
                        : checked
                          ? 'bg-primary-soft'
                          : 'bg-white shadow-[0_6px_0_var(--color-line)] active:translate-y-1',
                    )}
                  >
                    <ClaimView
                      claim={line.claim}
                      language={language}
                      corrected={done && isWrong}
                      size="md"
                    />
                    {checked && (
                      <span className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white">
                        <CheckIcon size={20} />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        )}

        {showOptions && !done && (
          <ChoiceGrid
            choices={q.options.map((value) => ({
              id: value,
              label: showValue(claim, value, language),
              content: (
                <span className={clsx('font-display font-extrabold', textSize)} lang={language}>
                  {showValue(claim, value, language)}
                </span>
              ),
            }))}
            statuses={statuses}
            onChoose={(value) => send({ type: 'option', value })}
            className="max-w-[min(40rem,64vh)]"
            cardClassName={claim.type === 'spelling' ? 'aspect-[4/3]' : undefined}
          />
        )}

        {done && (
          <div className="flex flex-col items-center gap-3">
            <p className="max-w-xl text-center text-lg" role="status" data-testid="help-explain">
              {explanation}
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
