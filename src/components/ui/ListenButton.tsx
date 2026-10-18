import { useTranslation } from 'react-i18next'
import { CrownIcon, SpeakerIcon } from '@/components/icons'
import { useIsPro } from '@/store/subscriptionStore'
import { Button } from './Button'

interface ListenButtonProps {
  onListen: () => void
  /** Called instead of `onListen` on Free, where voice is a PRO feature. */
  onLocked?: () => void
  label?: string
}

/** “Listen” button. On Free it carries a small gold PRO crown and does not speak. */
export function ListenButton({ onListen, onLocked, label }: ListenButtonProps) {
  const { t } = useTranslation()
  const isPro = useIsPro()

  return (
    <span className="relative inline-flex">
      <Button
        icon={<SpeakerIcon size={30} />}
        onClick={isPro ? onListen : onLocked}
        variant={isPro ? 'primary' : 'soft'}
      >
        {label ?? t('common.listenAgain')}
      </Button>
      {!isPro && (
        <span className="pointer-events-none absolute -top-3 -right-2 inline-flex items-center gap-1 rounded-full bg-coin px-2 py-0.5 font-display text-sm font-bold text-ink shadow-[0_3px_0_var(--color-coin-shadow)]">
          <CrownIcon size={14} />
          {t('tier.proFeature')}
        </span>
      )}
    </span>
  )
}
