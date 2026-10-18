import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { audioManager } from '@/services/audio/audioManager'
import { useLanguage } from '@/store/settingsStore'
import { useMascotStore } from './mascotStore'

/** The mascot’s exclamations are the same in every language, said in a bright English voice. */
const EXCLAMATION = { locale: 'en-US', pitch: 1.7, rate: 1 } as const

/**
 * Mascot reactions to answers. Every tier hears the success/soft effect;
 * the spoken “Yahoooo!” / “Oops!” is PRO-only (the audio manager gates it).
 */
export function useMascotReactions() {
  const { t } = useTranslation()
  const language = useLanguage()
  const react = useMascotStore((state) => state.react)

  const celebrate = useCallback(() => {
    react('happy')
    audioManager.play('success')
    void audioManager.speak([{ text: 'Yahoooo!' }], { language, ...EXCLAMATION })
  }, [language, react])

  const comfort = useCallback(async () => {
    react('oops')
    audioManager.play('soft')
    const spoke = await audioManager.speak([{ text: 'Oops!' }], {
      language,
      ...EXCLAMATION,
      pitch: 1.4,
    })
    if (spoke) {
      await audioManager.speak(
        [{ text: t('mascot.tryAgain'), clip: { kind: 'phrases', id: 'try-again' } }],
        {
          language,
        },
      )
    }
  }, [language, react, t])

  return { celebrate, comfort }
}
