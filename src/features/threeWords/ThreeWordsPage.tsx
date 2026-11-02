import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, SpeakerIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LANGUAGE_INFO, type Language } from '@/content/languages'
import { canUse } from '@/domain/entitlements'
import { audioManager } from '@/services/audio/audioManager'
import { LearnShell } from '@/features/learn/LearnShell'
import { speakLines } from '@/features/learn/voice'
import { useMascot } from '@/features/mascot/useMascot'
import { TRI_LANGUAGES, TRI_WORDS, displayWord } from './content'

const TINTS: Record<Language, string> = {
  uz: 'bg-primary-soft',
  ru: 'bg-sky-soft',
  en: 'bg-coin-soft',
}

/**
 * «Uch tilli so‘z» (Phase 49): a picture and its word in Uzbek, Russian and
 * English side by side. Pressing a word says it in that word's own language
 * (from recordings, PRO; Free shows the calm PRO note). Only the three words
 * are in their own languages (each with its `lang`); everything around them
 * stays in the child's language.
 */
export function ThreeWordsPage() {
  const { t } = useTranslation()
  const { react } = useMascot()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState<Language | null>(null)
  const item = TRI_WORDS[index]!
  const total = TRI_WORDS.length

  const play = async (language: Language) => {
    if (!canUse('audio')) {
      react('locked', { text: t('learn.voiceLocked'), emoji: '👑' }, { speak: false })
      return
    }
    setPlaying(language)
    const outcome = await speakLines([item.words[language]], language)
    setPlaying((current) => (current === language ? null : current))
    if (outcome === 'muted')
      react('instruct', { text: t('learn.voiceMuted'), emoji: '🔇' }, { speak: false })
    else if (outcome === 'missing' || outcome === 'error') {
      react('instruct', { text: t('learn.voiceError'), emoji: '📖' }, { speak: false })
    }
  }

  const go = (step: number) => {
    // the word being said belongs to the old card: it stops at once
    audioManager.stopSpeech()
    setPlaying(null)
    setIndex((value) => (value + step + total) % total)
  }

  return (
    <LearnShell title={t('threeWords.title')} speak={[t('threeWords.say.intro')]}>
      <section
        data-testid="three-words"
        className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-[36px] bg-surface p-4 shadow-[0_8px_0_var(--color-line)] sm:gap-6 sm:p-6"
      >
        <p className="text-center font-semibold text-ink-soft">{t('threeWords.say.intro')}</p>
        <div
          key={item.id}
          className="flex size-40 items-center justify-center rounded-[32px] bg-sky-soft motion-safe:animate-pop-in sm:size-52"
        >
          <Img3D name={item.picture} className="size-[80%]" eager />
        </div>
        <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {TRI_LANGUAGES.map((language) => {
            const text = displayWord(item.words[language], language)
            const languageName = t(`threeWords.languages.${language}`)
            return (
              <li key={language}>
                <button
                  type="button"
                  onClick={() => void play(language)}
                  data-testid={`tri-word-${language}`}
                  data-playing={playing === language || undefined}
                  className={clsx(
                    'flex min-h-20 w-full items-center gap-3 rounded-3xl px-4 py-3 text-left shadow-press-sm transition-transform active:translate-y-1',
                    TINTS[language],
                    playing === language && 'ring-4 ring-primary',
                  )}
                >
                  <SpeakerIcon size={28} aria-hidden="true" className="shrink-0" />
                  <span className="flex min-w-0 flex-col">
                    {/* the name is the visible content: the language for screen readers, then the word in its own lang */}
                    <span className="sr-only">{languageName}:</span>{' '}
                    <span aria-hidden="true" className="text-sm font-semibold text-ink-soft">
                      {LANGUAGE_INFO[language].shortLabel}
                    </span>
                    <span
                      lang={language}
                      className="font-display text-2xl leading-tight font-extrabold [overflow-wrap:anywhere] sm:text-3xl"
                    >
                      {text}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <Button
            variant="soft"
            size="md"
            onClick={() => go(-1)}
            aria-label={t('threeWords.prev')}
            icon={<ChevronLeftIcon size={24} />}
            data-testid="tri-prev"
          />
          <p className="font-display text-lg font-bold" data-testid="tri-counter">
            {t('threeWords.counter', { current: index + 1, total })}
          </p>
          <Button
            variant="soft"
            size="md"
            onClick={() => go(1)}
            aria-label={t('threeWords.next')}
            icon={<ChevronRightIcon size={24} />}
            data-testid="tri-next"
          />
        </div>
      </section>
    </LearnShell>
  )
}
