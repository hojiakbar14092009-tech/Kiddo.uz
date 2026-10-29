import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { LetterEntry } from '@/content/alphabet'

/**
 * Learn Before Play (Phase 21): a letter the child has not met yet, shown big
 * with its word and picture before a game asks about it. Focus starts on the
 * button, so keyboard and screen-reader users land on the new letter too.
 */
export function LetterIntro({ letter, onGo }: { letter: LetterEntry; onGo: () => void }) {
  const { t } = useTranslation()
  const go = useRef<HTMLButtonElement>(null)
  useEffect(() => go.current?.focus(), [letter.id])
  return (
    <section
      data-testid="letter-intro"
      data-letter={letter.id}
      aria-labelledby="letter-intro-title"
      className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 text-center short:flex-row short:gap-6 short:text-left"
    >
      <p
        aria-hidden="true"
        className="font-display text-8xl leading-none font-extrabold text-primary sm:text-9xl short:text-7xl"
      >
        {letter.upper}
        {letter.lower}
      </p>
      <div className="flex flex-col items-center gap-2 short:items-start">
        <p className="text-sm font-bold text-primary-ink">{t('learnFirst.newLetter')}</p>
        <h2 id="letter-intro-title" className="font-display text-3xl font-extrabold">
          <span aria-hidden="true">{letter.emoji} </span>
          {t('learnFirst.letterWord', { letter: letter.upper, word: letter.word })}
        </h2>
        <Button ref={go} onClick={onGo} data-testid="letter-intro-go">
          {t('learnFirst.letterGo')}
        </Button>
      </div>
    </section>
  )
}
