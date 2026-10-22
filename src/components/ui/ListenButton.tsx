import { useTranslation } from 'react-i18next'
import { SpeakerIcon } from '@/components/icons'
import { useCanUse } from '@/domain/entitlements'
import { Button } from './Button'
import { ProBadge } from './ProLock'
import { useProLabel } from './useProLabel'

interface ListenButtonProps {
  onListen: () => void
  /** Called instead of `onListen` on Free, where voice is a PRO feature. */
  onLocked?: () => void
  label?: string
}

/** “Listen” button. On Free it carries a small gold PRO crown and does not speak. */
export function ListenButton({ onListen, onLocked, label }: ListenButtonProps) {
  const { t } = useTranslation()
  const isPro = useCanUse('audio')
  const proLabel = useProLabel()
  const text = label ?? t('common.listenAgain')

  return (
    <span className="relative inline-flex">
      <Button
        icon={<SpeakerIcon size={30} />}
        onClick={isPro ? onListen : onLocked}
        variant={isPro ? 'primary' : 'soft'}
        aria-label={isPro ? undefined : proLabel(text)}
      >
        {text}
      </Button>
      {!isPro && <ProBadge />}
    </span>
  )
}
