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
 * to an answer once the voice is on; the screen's instruction or question is
 * read by the speaker (on its own since Phase 41: speakable.ts), so the bubble
 * never says it a second time.
 */
export function useLearnMascot() {
  const { t } = useTranslation()
  const { react, reset } = useMascot()
  const voice = useLearnVoice()
  // `speak` is stable: `say` must not change on every render, or a screen's
  // effect that says something (with `say` in its deps) would say it again and
  // again while the voice status changes – a loop that freezes the page
  const { speak } = voice

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
      if (line && SPOKEN_EVENTS.has(event)) void speak([line])
    },
    [react, speak, t],
  )

  return { say, reset, voice }
}
