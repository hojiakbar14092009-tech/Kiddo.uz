import clsx from 'clsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { StepDots } from '@/components/ui/Progress'
import { useChildKey } from '@/store/progressStore'
import { useLearnStore } from './learnStore'
import { SPEAK_PRIORITY, useSpeakable } from './speakable'

/*
 * Learn Before Play (Phase 21): a short lesson, one card at a time, before a
 * game asks about it. The speaker reads the card on screen. On the last card
 * the child finds the first card's picture again (guided practice); only
 * then the lesson counts for this child (learnStore), so the next time the
 * game starts straight away, with "learn again" beside it.
 */

export interface LessonCard {
  id: string
  art: ReactNode
  title: string
  lines: readonly string[]
  /** A smaller picture of just this thing, for the check at the end (default: `art`). */
  thumb?: ReactNode
}

/** Which two cards the check at the end shows: find `ask` (not `other`). */
export interface LessonCheck {
  ask: string
  other: string
}

export function LessonDeck({
  lessonId,
  cards,
  check,
  onDone,
}: {
  lessonId: string
  cards: readonly LessonCard[]
  /** The pair for the check (default: the first two cards); each deck picks two clearly different things. */
  check?: LessonCheck
  onDone: () => void
}) {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const markLesson = useLearnStore((state) => state.markLesson)
  const [index, setIndex] = useState(0)
  const card = cards[Math.min(index, cards.length - 1)]
  const last = index >= cards.length - 1
  // a short guided check after the cards (two or more): find the first card again.
  // Only then the lesson counts — opening it is not learning it.
  const asked = cards.find((item) => item.id === (check?.ask ?? cards[0]?.id))
  const other =
    cards.length > 1 ? cards.find((item) => item.id === (check?.other ?? cards[1]?.id)) : undefined
  const [checked, setChecked] = useState(cards.length < 2)
  const [missed, setMissed] = useState(false)
  // a new card: focus moves to its title, so a screen reader reads the new card
  const heading = useRef<HTMLHeadingElement>(null)
  const shownIndex = useRef(index)
  useEffect(() => {
    if (shownIndex.current !== index) heading.current?.focus()
    shownIndex.current = index
  }, [index])
  // the speaker reads the card; on the last card also the check's question (for non-readers)
  const question = asked ? t('learnFirst.check', { title: asked.title }) : ''
  useSpeakable(
    card
      ? [card.title, ...card.lines, ...(last && asked && other && !checked ? [question] : [])]
      : null,
    SPEAK_PRIORITY.content,
  )

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
        {last && asked && other && (
          <div
            className="flex flex-col items-center gap-2 short:items-start"
            data-testid="lesson-check"
            data-done={checked}
          >
            <p className="font-display text-lg font-bold">
              {checked ? t('learnFirst.checkDone') : t('learnFirst.check', { title: asked.title })}
            </p>
            <div
              className="flex gap-3"
              role="group"
              aria-label={t('learnFirst.check', { title: asked.title })}
            >
              {(asked.id < other.id ? [asked, other] : [other, asked]).map((choice) => {
                const right = choice.id === asked.id
                return (
                  <button
                    key={choice.id}
                    type="button"
                    aria-label={t('learnFirst.checkPicture', { title: choice.title })}
                    data-testid={right ? 'lesson-check-right' : 'lesson-check-other'}
                    onClick={() => {
                      if (checked) return
                      if (right) setChecked(true)
                      setMissed(!right)
                    }}
                    className={clsx(
                      'flex size-24 items-center justify-center overflow-hidden rounded-3xl border-4 bg-white p-1.5 shadow-press focus-visible:outline-4 focus-visible:outline-primary sm:size-28',
                      checked && right ? 'border-primary' : 'border-line-strong',
                    )}
                  >
                    {/* the picture scaled into the tile (never cropped) */}
                    <span
                      aria-hidden="true"
                      className="flex size-full items-center justify-center [&_img]:max-h-full [&_img]:max-w-full [&_svg]:max-h-full [&_svg]:max-w-full [&>*]:max-h-full [&>*]:max-w-full"
                    >
                      {choice.thumb ?? choice.art}
                    </span>
                  </button>
                )
              })}
            </div>
            <p aria-live="polite" className="min-h-6 text-sm text-ink-soft">
              {missed ? t('learnFirst.checkAgain') : ''}
            </p>
          </div>
        )}
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
            // the way to the game appears once the check is done
            checked && (
              <Button onClick={finish} data-testid="lesson-start">
                {t('learnFirst.start')}
              </Button>
            )
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
