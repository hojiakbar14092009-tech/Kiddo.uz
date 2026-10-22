import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { SpeakerIcon } from '@/components/icons'
import { ProBadge } from '@/components/ui/ProLock'
import { useProLabel } from '@/components/ui/useProLabel'
import { useMascot } from '@/features/mascot/useMascot'
import { useSettingsStore } from '@/store/settingsStore'
import { canUse } from '@/store/subscriptionStore'
import { takeCurrentSpeakable } from './speakable'
import { setLearnVoiceOn, speakLines, useLearnVoice } from './voice'

/**
 * The speaker button of every learning screen: it reads the question that is
 * on screen now, in the language chosen now.
 * - PRO: each press stops whatever is playing and reads the current question
 *   from the start (pressing again restarts it, voices never overlap).
 * - Free: no sound; the mascot says, in its bubble, that reading aloud is a
 *   PRO feature a parent can turn on. Nothing pops up and nothing is lost.
 * The PRO check happens on press and again inside the audio manager right
 * before any sound, so hiding or re-enabling the button cannot bypass it.
 */
export function SpeakButton({ fallback = [] }: { fallback?: readonly string[] }) {
  const { t } = useTranslation()
  const voice = useLearnVoice()
  const proLabel = useProLabel()
  const { react } = useMascot()
  const status = voice.status
  const note = (text: string, emoji: string, event: 'locked' | 'instruct' = 'instruct') =>
    react(event, { text, emoji }, { speak: false })

  const press = async () => {
    if (!canUse('audio')) {
      note(t('learn.voiceLocked'), '👑', 'locked')
      return
    }
    const current = takeCurrentSpeakable()
    const lines = current.lines.length > 0 ? current.lines : fallback
    if (lines.length === 0) {
      note(t('learn.voiceNothing'), '🙂')
      return
    }
    setLearnVoiceOn(true)
    // the language at the moment of the press; a new reading replaces any voice playing now
    const language = useSettingsStore.getState().language ?? 'uz'
    const reading = speakLines(lines, language)
    current.started()
    const outcome = await reading
    if (outcome === 'muted') note(t('learn.voiceMuted'), '🔇')
    else if (outcome === 'locked') note(t('learn.voiceLocked'), '👑', 'locked')
    else if (outcome === 'missing' || outcome === 'error') note(t('learn.voiceError'), '📖')
  }

  const label = !voice.isPro
    ? proLabel(t('learn.listen'))
    : status === 'speaking'
      ? t('learn.voiceAgain')
      : t('learn.listen')

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => void press()}
        aria-label={label}
        aria-busy={status === 'loading'}
        data-testid="learn-speak"
        data-status={voice.isPro ? status : 'locked'}
        className={clsx(
          'learn-speak relative flex size-14 items-center justify-center rounded-full transition-colors sm:size-16',
          !voice.isPro && 'bg-surface text-ink shadow-press',
          voice.isPro && status === 'idle' && 'bg-surface text-primary-ink shadow-press',
          voice.isPro &&
            (status === 'loading' || status === 'speaking') &&
            'bg-primary text-white shadow-press-primary',
          voice.isPro &&
            status === 'error' &&
            'bg-oops-soft text-oops-ink shadow-[0_5px_0_var(--color-oops-shadow)]',
        )}
      >
        {voice.isPro && status === 'speaking' && (
          <span aria-hidden="true" className="learn-speak-wave" />
        )}
        {voice.isPro && status === 'loading' && (
          <span aria-hidden="true" className="learn-speak-spin" />
        )}
        <SpeakerIcon size={28} />
      </button>
      {!voice.isPro && <ProBadge size="sm" />}
    </span>
  )
}
