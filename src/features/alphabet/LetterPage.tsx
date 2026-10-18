import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, SpeakerIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { getAlphabet } from '@/content/alphabet'
import { useSpeaker } from '@/services/useSpeaker'
import { useLanguage } from '@/store/settingsStore'
import { HighlightedWord } from './HighlightedWord'
import { paletteFor } from './letterPalette'

const NAV_LINK_CLASSES =
  'inline-flex size-16 items-center justify-center rounded-full bg-surface font-display text-xl font-bold shadow-[0_5px_0_var(--color-line)] active:translate-y-1'

export function LetterPage() {
  const { t } = useTranslation()
  const { letterId = '' } = useParams()
  const language = useLanguage()
  const { sayLetter } = useSpeaker()

  const { letters } = getAlphabet(language)
  const index = letters.findIndex((entry) => entry.id === letterId)
  const letter = letters[index]

  useEffect(() => {
    if (letter) void sayLetter(letter)
  }, [letter, sayLetter])

  if (!letter) return <Navigate to="/alphabet" replace />

  const previous = letters[index - 1]
  const next = letters[index + 1]
  const palette = paletteFor(index)
  const showLower = letter.lower !== letter.upper

  return (
    <Screen
      header={
        <TopBar
          start={
            <Link
              to="/alphabet"
              className="inline-flex h-14 items-center gap-1 rounded-full border-2 border-line-strong bg-surface pr-5 pl-3 text-lg"
            >
              <ChevronLeftIcon />
              <span className="hidden sm:inline">{t('alphabet.title')}</span>
              <span className="sr-only sm:hidden">{t('letter.backToAlphabet')}</span>
            </Link>
          }
        />
      }
      className="gap-5 px-4 py-5 sm:px-8"
    >
      <section className="flex flex-1 flex-col items-center gap-6 rounded-[36px] bg-surface p-5 shadow-[0_8px_0_var(--color-line)] sm:p-8 md:flex-row md:gap-10">
        <div
          className="flex aspect-square w-full max-w-[min(380px,70vw)] shrink-0 items-center justify-center rounded-[30px]"
          style={{ backgroundColor: palette.background }}
        >
          <span
            role="img"
            aria-label={letter.word}
            className="text-[clamp(7rem,22vw,12rem)] leading-none"
          >
            {letter.emoji}
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 text-center md:items-start md:text-left">
          <p className="flex items-baseline gap-4 font-display font-extrabold leading-none">
            <span className="text-[clamp(5rem,14vw,8rem)] text-primary">{letter.upper}</span>
            {showLower && (
              <span className="text-[clamp(3rem,9vw,5rem)] text-[#7DBFB3]">{letter.lower}</span>
            )}
          </p>
          <HighlightedWord
            letter={letter}
            className="text-[clamp(3rem,9vw,4.75rem)] leading-tight"
          />
          <p className="text-lg text-ink-soft">{t('letter.hint')}</p>
          <Button icon={<SpeakerIcon size={30} />} onClick={() => void sayLetter(letter)}>
            {t('common.listenAgain')}
          </Button>
        </div>
      </section>

      <nav className="flex items-center justify-between gap-4" aria-label={t('alphabet.title')}>
        {previous ? (
          <Link
            to={`/alphabet/${previous.id}`}
            aria-label={t('letter.previous')}
            className={NAV_LINK_CLASSES}
          >
            <ChevronLeftIcon size={30} />
          </Link>
        ) : (
          <span className="size-16" />
        )}
        <span className="text-lg text-ink-soft tabular-nums">
          {t('letter.position', { current: index + 1, total: letters.length })}
        </span>
        {next ? (
          <Link
            to={`/alphabet/${next.id}`}
            aria-label={t('letter.next')}
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
