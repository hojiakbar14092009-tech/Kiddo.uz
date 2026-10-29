import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { useSpeakable } from '@/features/learn/speakable'
import type { GameKind } from './generators'
import { HUB, type Reward } from './useGameRun'

export function GameHeader({ kind }: { kind: GameKind }) {
  const { t } = useTranslation()
  return <TitleTopBar title={t(`uzbekistan.games.${kind}.title`)} back={HUB} />
}

/** The end of a run: praise, what it brought, and the way on. */
export function RunDone({
  kind,
  reward,
  doneText,
  art,
  onAgain,
  onReview,
}: {
  kind: GameKind
  reward: Reward
  doneText: string
  art: ReactNode
  onAgain: () => void
  /** Show the game's lesson again (Learn Before Play). */
  onReview?: () => void
}) {
  const { t } = useTranslation()
  useSpeakable([doneText])
  return (
    <Screen header={<GameHeader kind={kind} />}>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 py-6 text-center short:gap-3 short:py-2">
        <div
          aria-hidden="true"
          className="flex h-28 items-center justify-center sm:h-36 short:h-20"
        >
          {art}
        </div>
        <p className="font-display text-2xl font-extrabold text-primary sm:text-3xl short:text-xl">
          {doneText}
        </p>
        <ActivityReward stars={reward.stars} crystals={reward.crystals} />
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton to={HUB} variant="soft" size="md">
            {t('uzbekistan.chooseOther')}
          </LinkButton>
          {onReview && (
            <Button variant="soft" size="md" onClick={onReview} data-testid="lesson-review">
              {t('learnFirst.review')}
            </Button>
          )}
          <Button size="md" onClick={onAgain}>
            {t('uzbekistan.again')}
          </Button>
        </div>
      </div>
    </Screen>
  )
}
