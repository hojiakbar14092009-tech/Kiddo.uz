import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { StepDots } from '@/components/ui/Progress'
import { useChildKey } from '@/store/progressStore'
import { useLearnStore } from './learnStore'
import { SPEAK_PRIORITY, useSpeakable } from './speakable'

/*
 * Learn Before Play (Phase 21): a short lesson, one card at a time, before a
 * game asks about it. The speaker reads the card on screen. The last card
 * starts the game and remembers the lesson for this child (learnStore), so
 * the next time the game starts straight away, with "learn again" beside it.
 */

export interface LessonCard {
  id: string
  art: ReactNode
  title: string
  lines: readonly string[]
}

export function LessonDeck({
  lessonId,
  cards,
  onDone,
}: {
  lessonId: string
  cards: readonly LessonCard[]
  onDone: () => void
}) {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const markLesson = useLearnStore((state) => state.markLesson)
  const [index, setIndex] = useState(0)
  const card = cards[Math.min(index, cards.length - 1)]
  const last = index >= cards.length - 1
  // a new card: focus moves to its title, so a screen reader reads the new card
  const heading = useRef<HTMLHeadingElement>(null)
  const shownIndex = useRef(index)
  useEffect(() => {
    if (shownIndex.current !== index) heading.current?.focus()
    shownIndex.current = index
  }, [index])
  useSpeakable(card ? [card.title, ...card.lines] : null, SPEAK_PRIORITY.content)

  if (!card) return null

  const finish = () => {
    markLesson(childKey, lessonId)
    onDone()
  }

  return (
    <section
      aria-labelledby="lesson-title"
      data-testid="lesson-deck"
      data-lesson={lessonId}
      data-card={card.id}
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 rounded-panel bg-surface p-4 text-center shadow-press-lg sm:gap-4 sm:p-6 short:max-w-4xl short:flex-row short:items-stretch short:gap-4 short:p-3 short:text-left"
    >
      <div
        aria-hidden="true"
        className="flex w-full max-w-sm items-center justify-center short:w-[40%] short:max-w-none"
      >
        {card.art}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-3 short:items-start short:justify-center short:gap-2">
        <p className="text-sm font-bold text-primary-ink">{t('learnFirst.title')}</p>
        <h2
          ref={heading}
          tabIndex={-1}
          id="lesson-title"
          className="font-display text-2xl leading-tight font-extrabold break-words focus-visible:outline-2 focus-visible:outline-primary sm:text-3xl short:text-xl"
        >
          {card.title}
        </h2>
        <ul className="flex flex-col gap-1 text-base text-ink-soft sm:text-lg short:text-sm">
          {card.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {cards.length > 1 && (
          <StepDots
            current={index}
            total={cards.length}
            label={t('learnFirst.step', { current: index + 1, total: cards.length })}
          />
        )}
        <div className="flex w-full flex-wrap items-center justify-center gap-2 short:justify-start">
          {index > 0 && (
            <Button
              variant="soft"
              size="md"
              onClick={() => setIndex(index - 1)}
              data-testid="lesson-back"
            >
              {t('learnFirst.back')}
            </Button>
          )}
          {last ? (
            <Button onClick={finish} data-testid="lesson-start">
              {t('learnFirst.start')}
            </Button>
          ) : (
            <Button onClick={() => setIndex(index + 1)} data-testid="lesson-next">
              {t('learnFirst.next')}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
