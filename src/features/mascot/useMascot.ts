import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { audioManager, type Utterance } from '@/services/audio/audioManager'
import { useActiveChild } from '@/store/familyStore'
import { useLanguage } from '@/store/settingsStore'
import { useMascotStore } from './mascotStore'
import type { MascotEvent, MascotMessage } from './types'

const CHEERS = ['Yahoooo!', 'Wow!', 'Hooray!', 'Yay!', 'Woohoo!'] as const
const OOPSES = ['Oops!', 'Uh-oh!', 'Hmm!'] as const
const PRAISES = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'] as const
const RETRIES = ['r1', 'r2', 'r3', 'r4'] as const

/** Takes turns through a list, so the robot never says the same thing twice in a row. */
let praiseTurn = 0
let retryTurn = 0

/** Test helper: start the cheers from the first one again. */
export function resetMascotPhrases(): void {
  praiseTurn = 0
  retryTurn = 0
}

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
        case 'correct': {
          const turn = praiseTurn++
          const exclaim = CHEERS[turn % CHEERS.length]!
          const praise = t(`mascot.praises.${PRAISES[turn % PRAISES.length]!}`)
          return { text: `${exclaim} ${praise}`, emoji, exclaim, spoken: praise }
        }
        case 'wrong': {
          const turn = retryTurn++
          const exclaim = OOPSES[turn % OOPSES.length]!
          const retry = t(`mascot.retries.${RETRIES[turn % RETRIES.length]!}`)
          return { text: `${exclaim} ${retry}`, emoji, exclaim, spoken: retry }
        }
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

      if ((event === 'correct' || event === 'wrong') && message?.exclaim) {
        if (await say([{ text: message.exclaim }], true)) {
          await say([{ text: message.spoken ?? message.text }])
        }
        return
      }
      // A locked feature is only ever announced on Free, which has no voice.
      if (event === 'locked' || !message) return
      await say([{ text: message.spoken ?? message.text }])
    },
    [language],
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
