import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMascot } from '@/features/mascot/useMascot'
import type { MascotEvent, MascotMessage } from '@/features/mascot/types'
import { useLearnVoice } from './voice'

/** Reactions to something the child just did: the only lines the mascot says by itself. */
const SPOKEN_EVENTS: ReadonlySet<MascotEvent> = new Set(['correct', 'wrong', 'celebrate'])

/**
 * The mascot in the new sections: its bubble always shows the text (Free and
 * PRO). It speaks only on PRO, only from recordings, and only its reactions
 * to an answer once the child has used the speaker button; greetings and
 * instructions are never read out on their own (the speaker button reads them).
 */
export function useLearnMascot() {
  const { t } = useTranslation()
  const { react, reset } = useMascot()
  const voice = useLearnVoice()

  const say = useCallback(
    (event: MascotEvent, message?: MascotMessage, spoken?: string) => {
      const shown: MascotMessage =
        message ??
        (event === 'correct'
          ? { text: t('learn.correct'), emoji: '🌟' }
          : event === 'wrong'
            ? { text: t('learn.retry'), emoji: '💪' }
            : { text: '' })
      react(event, shown, { speak: false })
      const line = spoken ?? shown.spoken ?? shown.text
      if (line && SPOKEN_EVENTS.has(event)) void voice.speak([line])
    },
    [react, t, voice],
  )

  return { say, reset, voice }
}
