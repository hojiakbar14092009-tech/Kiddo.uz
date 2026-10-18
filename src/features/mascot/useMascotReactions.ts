import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { speech } from '@/services/speech'
import { useLanguage } from '@/store/settingsStore'
import { useMascotStore } from './mascotStore'

/** The mascot’s exclamations are the same in every language, said in a bright English voice. */
const EXCLAMATION = { locale: 'en-US', pitch: 1.7, rate: 1 } as const

/** Mascot reactions to answers: a jump with “Yahoooo!”, or “Oops!” with encouragement. */
export function useMascotReactions() {
  const { t } = useTranslation()
  const language = useLanguage()
  const react = useMascotStore((state) => state.react)

  const celebrate = useCallback(() => {
    react('happy')
    void speech.say('Yahoooo!', { language, ...EXCLAMATION })
  }, [language, react])

  const comfort = useCallback(async () => {
    react('oops')
    await speech.say('Oops!', { language, ...EXCLAMATION, pitch: 1.4 })
    await speech.say(t('mascot.tryAgain'), { language })
  }, [language, react, t])

  return { celebrate, comfort }
}
