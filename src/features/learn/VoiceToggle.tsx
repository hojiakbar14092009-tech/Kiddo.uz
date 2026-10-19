import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { CrownIcon, SpeakerIcon } from '@/components/icons'
import { useMascot } from '@/features/mascot/useMascot'
import { useLearnVoice } from './voice'

/**
 * Turns reading aloud on or off in the new sections. On Free it carries the
 * PRO crown; pressing it only shows a short note – the game goes on, nothing
 * is bought and no result is lost.
 */
export function VoiceToggle({ onTurnedOn }: { onTurnedOn?: () => void }) {
  const { t } = useTranslation()
  const voice = useLearnVoice()
  const { react } = useMascot()

  const press = () => {
    if (!voice.isPro) {
      react('locked', { text: t('learn.voiceLocked'), emoji: '👑' }, { speak: false })
      return
    }
    if (voice.on) {
      voice.stop()
      voice.setOn(false)
    } else {
      voice.setOn(true)
      onTurnedOn?.()
    }
  }

  const label = voice.on ? t('learn.voiceOn') : t('learn.voiceOff')
  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={press}
        aria-pressed={voice.isPro ? voice.on : undefined}
        aria-label={voice.isPro ? label : `${label} (${t('tier.proFeature')})`}
        className={clsx(
          'flex size-14 items-center justify-center rounded-full transition-colors sm:size-16',
          voice.on
            ? 'bg-primary text-white shadow-[0_5px_0_var(--color-primary-shadow)]'
            : 'bg-surface text-ink shadow-[0_5px_0_var(--color-line)]',
        )}
      >
        <SpeakerIcon size={28} />
      </button>
      {!voice.isPro && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 -right-2 inline-flex items-center gap-0.5 rounded-full bg-coin px-1.5 py-0.5 font-display text-xs font-bold text-ink shadow-[0_2px_0_var(--color-coin-shadow)]"
        >
          <CrownIcon size={12} />
          {t('tier.proFeature')}
        </span>
      )}
    </span>
  )
}
