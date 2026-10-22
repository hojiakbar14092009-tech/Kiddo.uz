import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, CoinIcon } from '@/components/icons'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { toast } from '@/components/ui/toast'
import { useDailyQuest } from '@/domain/universe'
import { useChildKey } from '@/store/progressStore'
import { claimQuest } from './cityModel'
import { useLocalDay } from './useLocalDay'

const FAIL_TEXT = {
  claimed: 'quest.failClaimed',
  'not-done': 'quest.failNotDone',
  failed: 'quest.failOther',
} as const

/**
 * Today's treasure under the plan. The reward is shown before the child
 * starts (a crystal and coins); when every step is done it can be opened
 * once, and then the card says calmly that this is a good place to rest
 * (or to keep playing). An unopened treasure waits until the day ends; the
 * card follows the clock, so after midnight it shows the new day's quest.
 */
export function DailyQuestCard() {
  const { t } = useTranslation()
  const childKey = useChildKey()
  // re-renders on a new day, so useDailyQuest below reads the new day's quest
  const today = useLocalDay()
  const quest = useDailyQuest()
  const shownDay = 'day' in quest && typeof quest.day === 'string' ? quest.day : today
  const [justClaimed, setJustClaimed] = useState(false)
  const left = quest.steps.filter((step) => step.status !== 'done').length

  /** Claims the day this card shows (also when the clock passed midnight meanwhile). */
  const claim = () => {
    const result = claimQuest(childKey, shownDay)
    if ('award' in result) {
      setJustClaimed(true)
      toast(t('quest.claimedToast'), 'success')
    } else {
      toast(t(FAIL_TEXT[result.reason]), 'warning')
    }
  }

  const chest = (
    <span
      className={clsx(
        'flex size-20 shrink-0 items-center justify-center rounded-card sm:size-24 short:size-16',
        quest.claimed ? 'bg-lilac-soft' : 'bg-coin-soft',
      )}
    >
      <Img3D name={quest.claimed ? 'crescent-moon' : 'gift'} className="size-[76%]" />
    </span>
  )

  const prizes = (
    <ul className="flex flex-wrap items-center gap-2" aria-label={t('quest.promise')}>
      <li className="flex min-h-10 items-center gap-1.5 rounded-full bg-lilac-soft px-3 py-1 font-display text-lg font-extrabold">
        <ResourceIcon resource="crystal" size={26} />
        {t('quest.crystal', { count: quest.reward.crystals })}
      </li>
      <li className="flex min-h-10 items-center gap-1.5 rounded-full bg-coin-soft px-3 py-1 font-display text-lg font-extrabold">
        <CoinIcon size={26} />
        {t('quest.coins', { count: quest.reward.coins })}
      </li>
    </ul>
  )

  return (
    <section
      aria-labelledby="quest-title"
      data-testid="daily-quest"
      className={clsx(
        'flex w-full max-w-3xl flex-col items-center gap-4 rounded-card p-4 text-center shadow-press sm:flex-row sm:p-5 sm:text-left short:flex-row short:text-left',
        quest.complete && !quest.claimed ? 'bg-coin-soft' : 'bg-surface',
      )}
    >
      {justClaimed ? <RewardBurst pieces={10}>{chest}</RewardBurst> : chest}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start short:items-start">
        {quest.claimed ? (
          <>
            <h2
              id="quest-title"
              className="flex items-center gap-2 font-display text-2xl font-extrabold"
            >
              <CheckIcon size={24} className="text-primary" />
              {t('quest.claimed')}
            </h2>
            <p role="status" className="text-lg text-ink-soft">
              {t('quest.restOrPlay')}
            </p>
          </>
        ) : quest.complete ? (
          <>
            <h2 id="quest-title" className="font-display text-2xl font-extrabold">
              {t('home.restTitle')}
            </h2>
            {prizes}
            <p className="text-base font-semibold text-ink-soft">{t('quest.waits')}</p>
          </>
        ) : (
          <>
            <h2 id="quest-title" className="font-display text-2xl font-extrabold">
              {t('quest.title')}
            </h2>
            <p className="text-lg text-ink-soft">{t('quest.promise')}</p>
            {prizes}
            <p className="text-base font-semibold text-ink-soft">
              {t('quest.left', { count: left })}
            </p>
          </>
        )}
      </div>
      {quest.complete && !quest.claimed && (
        <Button variant="coin" size="md" onClick={claim} className="shrink-0">
          {t('quest.claim')}
        </Button>
      )}
    </section>
  )
}
