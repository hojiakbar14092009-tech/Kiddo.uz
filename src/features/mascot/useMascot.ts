import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { audioManager, type Utterance } from '@/services/audio/audioManager'
import { useActiveChild } from '@/store/familyStore'
import { useLanguage } from '@/store/settingsStore'
import { useMascotStore } from './mascotStore'
import type { MascotEvent, MascotMessage } from './types'

/** Exclamations sound the same in every language, said in a bright English voice. */
const EXCLAIM = { locale: 'en-US', pitch: 1.7, rate: 1 } as const

export interface ReactOptions {
  /** Set to `false` when the screen speaks the content itself (e.g. recorded letter clips). */
  speak?: boolean
}

const EVENT_EMOJI: Partial<Record<MascotEvent, string>> = {
  greet: '👋',
  peek: '👋',
  correct: '🌟🎉',
  wrong: '💪✨',
  rest: '😴🌙',
  locked: '👑',
  celebrate: '🏆🎉',
}

/**
 * The one way screens talk to the mascot: `react('correct')`, `react('instruct', message)`…
 * It sets the robot’s mood and bubble, plays the effect sound in every tier, and on
 * PRO also speaks. On Free the mascot stays silent and “thinks” in a bubble instead.
 */
export function useMascot() {
  const { t } = useTranslation()
  const language = useLanguage()
  const child = useActiveChild()
  const storeReact = useMascotStore((state) => state.react)
  const reset = useMascotStore((state) => state.reset)

  const defaultMessage = useCallback(
    (event: MascotEvent): MascotMessage | null => {
      const emoji = EVENT_EMOJI[event]
      switch (event) {
        case 'greet':
        case 'peek':
          return {
            text: child ? t('mascot.greet', { name: child.name }) : t('mascot.greetNoName'),
            emoji,
          }
        case 'correct':
          return { text: t('mascot.correct'), emoji }
        case 'wrong':
          return { text: t('mascot.wrong'), emoji }
        case 'rest':
          return { text: t('mascot.rest'), emoji }
        case 'locked':
          return { text: t('mascot.locked'), emoji }
        case 'celebrate':
          return { text: t('mascot.celebrate'), emoji }
        case 'instruct':
          return null
      }
    },
    [child, t],
  )

  const speakFor = useCallback(
    async (event: MascotEvent, message: MascotMessage | null) => {
      const say = (items: Utterance[], exclaim = false) =>
        audioManager.speak(items, exclaim ? { language, ...EXCLAIM } : { language })

      if (event === 'correct') {
        if (await say([{ text: 'Yahoooo!' }], true)) {
          await say([{ text: t('mascot.praise'), clip: { kind: 'phrases', id: 'praise' } }])
        }
        return
      }
      if (event === 'wrong') {
        if (await say([{ text: 'Oops!' }], true)) {
          await say([{ text: t('mascot.tryAgain'), clip: { kind: 'phrases', id: 'try-again' } }])
        }
        return
      }
      // A locked feature is only ever announced on Free, which has no voice.
      if (event === 'locked' || !message) return
      await say([{ text: message.spoken ?? message.text }])
    },
    [language, t],
  )

  const react = useCallback(
    (event: MascotEvent, custom?: MascotMessage, options: ReactOptions = {}) => {
      const message = custom ?? defaultMessage(event)
      storeReact(event, message)
      if (event === 'correct' || event === 'celebrate') audioManager.play('success')
      if (event === 'wrong') audioManager.play('soft')
      if (options.speak !== false) void speakFor(event, message)
    },
    [defaultMessage, speakFor, storeReact],
  )

  return { react, reset }
}
