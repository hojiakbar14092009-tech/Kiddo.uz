import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import type { LetterEntry } from '@/content/alphabet/types'
import { SPEAK_PRIORITY, useSpeakable } from '@/features/learn/speakable'

/**
 * Learn Before Play (Phase 21, full contract): a letter counts as met only
 * after the child has done something with it — here, finding it among two.
 * A wrong tap only says "look again"; nothing is lost.
 */
export function LetterCheck({
  letter,
  other,
  met,
  onMet,
}: {
  letter: LetterEntry
  /** Another letter to tell it apart from. */
  other: LetterEntry
  /** Already met before (or just now). */
  met: boolean
  onMet: () => void
}) {
  const { t } = useTranslation()
  const [missed, setMissed] = useState<string | null>(null)
  // the question is said too (a child who cannot read yet)
  useSpeakable(met ? null : [t('letter.check', { letter: letter.upper })], SPEAK_PRIORITY.content)
  // the right one sits left or right, steadily for each letter
  const choices = letter.id.charCodeAt(0) % 2 === 0 ? [letter, other] : [other, letter]

  return (
    <div
      className="flex flex-col items-center gap-2 lg:items-start"
      data-testid="letter-check"
      data-met={met}
    >
      <p className="font-display text-xl font-bold">
        {met ? t('letter.checkDone') : t('letter.check', { letter: letter.upper })}
      </p>
      <div
        className="flex gap-3"
        role="group"
        aria-label={t('letter.check', { letter: letter.upper })}
      >
        {choices.map((choice) => {
          const right = choice.id === letter.id
          return (
            <button
              key={choice.id}
              type="button"
              data-testid={right ? 'letter-check-right' : 'letter-check-other'}
              onClick={() => {
                if (right) {
                  setMissed(null)
                  onMet()
                } else setMissed(choice.id)
              }}
              className={clsx(
                'flex size-20 items-center justify-center rounded-3xl border-4 font-display text-4xl font-extrabold shadow-press transition-transform active:translate-y-0.5 sm:size-24 sm:text-5xl',
                met && right
                  ? 'border-primary bg-primary-soft text-primary-ink'
                  : missed === choice.id
                    ? 'border-line-strong bg-cream text-ink-soft'
                    : 'border-line-strong bg-surface text-ink',
              )}
            >
              {choice.upper}
              {met && right && <CheckIcon size={24} className="ml-1" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className="min-h-6 text-ink-soft">
        {missed ? t('letter.checkAgain') : ''}
      </p>
    </div>
  )
}
