import { useTranslation } from 'react-i18next'
import { CrownIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { LinkButton } from '@/components/ui/LinkButton'
import { useSpeakable } from '@/features/learn/speakable'
import { HUB } from './useGameRun'

/**
 * A premium item opened without PRO (e.g. a saved link): a calm note for the
 * child and a parent, no purchase pop-up. Its content is never rendered.
 */
export function LockedView({ title }: { title: string }) {
  const { t } = useTranslation()
  useSpeakable([t('uzbekistan.lockedTitle'), t('uzbekistan.lockedText')])
  return (
    <Screen header={<TitleTopBar title={title} back={HUB} />}>
      <div
        className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center short:gap-2 short:py-2"
        data-testid="uz-locked"
      >
        <span className="flex size-20 items-center justify-center rounded-full bg-coin text-ink shadow-press-coin short:size-14">
          <CrownIcon size={40} />
        </span>
        <h2 className="font-display text-2xl font-extrabold sm:text-3xl short:text-xl">
          {t('uzbekistan.lockedTitle')}
        </h2>
        <p className="text-lg leading-snug text-ink-soft short:text-base">
          {t('uzbekistan.lockedText')}
        </p>
        <LinkButton to={HUB} size="md">
          {t('uzbekistan.backToWorld')}
        </LinkButton>
      </div>
    </Screen>
  )
}
