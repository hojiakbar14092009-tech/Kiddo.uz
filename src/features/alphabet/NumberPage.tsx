import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { ListenButton } from '@/components/ui/ListenButton'
import { NUMBERS } from '@/content/numbers'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useLanguage } from '@/store/settingsStore'
import { paletteFor } from './letterPalette'
import { Picture } from '@/components/ui/Picture'

const NAV_LINK_CLASSES =
  'inline-flex size-16 items-center justify-center rounded-full bg-surface shadow-[0_5px_0_var(--color-line)] active:translate-y-1'

export function NumberPage() {
  const { itemId = '' } = useParams()
  const index = NUMBERS.findIndex((entry) => entry.id === itemId)
  // every number is open at any age
  if (index === -1) return <Navigate to="/alphabet?tab=numbers" replace />
  // A fresh counting game for every number.
  return <NumberScreen key={itemId} index={index} />
}

function NumberScreen({ index }: { index: number }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const reduceMotion = useReducedMotion() ?? false
  const { sayNumber, sayCount, speaking } = useSpeaker()
  const { react, reset } = useMascot()
  const entry = NUMBERS[index]!
  const word = entry.words[language]
  const palette = paletteFor(index)
  const previous = NUMBERS[index - 1]
  const next = NUMBERS[index + 1]

  /** Order in which the pictures were tapped: `counted[i]` is the count shown on picture `i`. */
  const [counted, setCounted] = useState<Record<number, number>>({})
  const total = Object.keys(counted).length
  const done = total === entry.value

  useEffect(() => {
    react('instruct', { text: `${entry.value} — ${word}`, emoji: entry.emoji }, { speak: false })
    void sayNumber(entry)
  }, [entry, word, react, sayNumber])

  useEffect(() => reset, [reset])

  const countPicture = (picture: number) => {
    if (counted[picture] !== undefined || done) return
    const count = total + 1
    setCounted((current) => ({ ...current, [picture]: count }))
    const countWord = NUMBERS[count - 1]?.words[language] ?? String(count)
    if (count === entry.value) {
      react('correct', { text: `${count} — ${countWord}!`, emoji: '🎉' })
    } else {
      void sayCount(count, countWord)
    }
  }

  return (
    <Screen
      header={
        <TopBar
          start={
            <Link
              to="/alphabet?tab=numbers"
              data-sound="back"
              aria-label={t('number.backToNumbers')}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-lg sm:h-14 sm:w-auto sm:gap-1 sm:pr-5 sm:pl-3"
            >
              <ChevronLeftIcon />
              <span className="hidden sm:inline">{t('alphabet.tabNumbers')}</span>
            </Link>
          }
        />
      }
      className="gap-5 px-4 py-5 sm:px-8"
    >
      <section className="flex flex-1 flex-col items-center gap-6 rounded-[36px] bg-surface p-5 shadow-[0_8px_0_var(--color-line)] sm:p-8 lg:flex-row lg:gap-10">
        <div className="flex flex-col items-center gap-3 lg:w-80">
          <p
            className="font-display text-[clamp(7rem,22vw,11rem)] leading-none font-extrabold"
            style={{ color: palette.ink }}
          >
            {entry.value}
          </p>
          <p className="font-display text-[clamp(2.5rem,8vw,4rem)] leading-tight font-extrabold">
            {word}
          </p>
          <Mascot robotClassName="w-20 sm:w-24" speaking={speaking} className="w-full max-w-md" />
          <ListenButton onListen={() => void sayNumber(entry)} onLocked={() => react('locked')} />
        </div>

        <div className="flex w-full flex-1 flex-col items-center gap-4">
          <p className="text-xl text-ink-soft" aria-live="polite">
            {done ? t('number.counted', { count: total }) : t('number.countHint')}
          </p>
          <ul
            className="grid w-full max-w-xl grid-cols-5 gap-3 rounded-[30px] p-4 sm:gap-4"
            style={{ backgroundColor: palette.background }}
          >
            {Array.from({ length: entry.value }, (_, picture) => {
              const count = counted[picture]
              return (
                <li key={picture}>
                  <motion.button
                    type="button"
                    aria-label={t('number.item', { count: picture + 1 })}
                    aria-pressed={count !== undefined}
                    onClick={() => countPicture(picture)}
                    animate={
                      count !== undefined && !reduceMotion
                        ? { scale: [1, 1.25, 1], y: [0, -10, 0] }
                        : undefined
                    }
                    transition={{ duration: 0.35 }}
                    className={clsx(
                      'relative flex aspect-square w-full items-center justify-center rounded-2xl bg-white text-[clamp(1.75rem,6vw,3rem)]',
                      count !== undefined && 'ring-4 ring-primary',
                    )}
                  >
                    <Picture emoji={entry.emoji} className="size-[70%]" />
                    {count !== undefined && (
                      <span className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-white">
                        {count}
                      </span>
                    )}
                  </motion.button>
                </li>
              )
            })}
          </ul>
          {done && (
            <Button variant="soft" size="md" onClick={() => setCounted({})}>
              {t('number.countAgain')}
            </Button>
          )}
        </div>
      </section>

      <nav
        className="flex items-center justify-between gap-4"
        aria-label={t('alphabet.tabNumbers')}
      >
        {previous ? (
          <Link
            to={`/alphabet/${previous.id}`}
            aria-label={t('number.previous')}
            className={NAV_LINK_CLASSES}
          >
            <ChevronLeftIcon size={30} />
          </Link>
        ) : (
          <span className="size-16" />
        )}
        <span className="text-lg text-ink-soft tabular-nums">
          {entry.value} / {NUMBERS.length}
        </span>
        {next ? (
          <Link
            to={`/alphabet/${next.id}`}
            aria-label={t('number.next')}
            className={NAV_LINK_CLASSES}
          >
            <ChevronRightIcon size={30} />
          </Link>
        ) : (
          <span className="size-16" />
        )}
      </nav>
    </Screen>
  )
}
