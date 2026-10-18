import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { ListenButton } from '@/components/ui/ListenButton'
import { getAlphabet } from '@/content/alphabet'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useLanguage } from '@/store/settingsStore'
import { HighlightedWord } from './HighlightedWord'
import { paletteFor } from './letterPalette'
import { Picture } from '@/components/ui/Picture'

const NAV_LINK_CLASSES =
  'inline-flex size-16 items-center justify-center rounded-full bg-surface font-display text-xl font-bold shadow-[0_5px_0_var(--color-line)] active:translate-y-1'

export function LetterPage() {
  const { t } = useTranslation()
  const { itemId: letterId = '' } = useParams()
  const language = useLanguage()
  const { sayLetter, speaking } = useSpeaker()
  const { react, reset } = useMascot()

  const { letters } = getAlphabet(language)
  const index = letters.findIndex((entry) => entry.id === letterId)
  const letter = letters[index]

  // New letter: the mascot shows it in its bubble; PRO also says “B … banan”.
  useEffect(() => {
    if (!letter) return
    react(
      'instruct',
      { text: `${letter.upper} — ${letter.word}`, emoji: letter.emoji },
      { speak: false },
    )
    void sayLetter(letter)
  }, [letter, react, sayLetter])

  useEffect(() => reset, [reset])

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
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-line-strong bg-surface text-lg sm:h-14 sm:w-auto sm:gap-1 sm:pr-5 sm:pl-3"
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
      <section className="flex flex-1 flex-col items-center gap-6 rounded-[36px] bg-surface p-5 shadow-[0_8px_0_var(--color-line)] sm:p-8 lg:flex-row lg:gap-10">
        <div
          className="flex aspect-square w-full max-w-[min(380px,70vw)] shrink-0 items-center justify-center rounded-[30px] border-4 bg-white p-[12%]"
          style={{ borderColor: palette.background }}
        >
          <Picture emoji={letter.emoji} alt={letter.word} className="size-full" />
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 text-center lg:items-start lg:text-left">
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
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <Mascot robotClassName="w-20 sm:w-24" speaking={speaking} className="w-full max-w-md" />
            <ListenButton
              onListen={() => void sayLetter(letter)}
              onLocked={() => react('locked')}
            />
          </div>
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
