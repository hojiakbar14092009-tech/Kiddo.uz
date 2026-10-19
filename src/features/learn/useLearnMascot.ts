import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMascot } from '@/features/mascot/useMascot'
import type { MascotEvent, MascotMessage } from '@/features/mascot/types'
import { useLearnVoice } from './voice'

/**
 * The mascot in the new sections: its bubble always shows the text (Free and
 * PRO); it speaks only on PRO with the voice turned on, and only from recordings.
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
      if (line) void voice.speak([line])
    },
    [react, t, voice],
  )

  return { say, reset, voice }
}
