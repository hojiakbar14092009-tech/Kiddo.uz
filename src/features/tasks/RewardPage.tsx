import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BackToGarden } from '@/features/mistakeGarden/BackToGarden'
import { ChevronRightIcon, CoinIcon, HomeIcon, StarIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { AwardLines } from '@/components/reward/AwardLines'
import { CoachMarks } from '@/features/onboarding/CoachMarks'
import { useAward } from '@/components/reward/useAward'
import { Button } from '@/components/ui/Button'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { findSticker } from '@/features/stickers/stickers'
import { isGameType } from './games'
import { isRewardState, type RewardState } from './rewardState'
import { Picture } from '@/components/ui/Picture'

const MAX_STARS = 3

type PopProps = Pick<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'transition'>

export function RewardPage() {
  const { state } = useLocation()
  if (!isRewardState(state)) return <Navigate to="/home" replace />
  return <RewardContent taskType={state.taskType} outcome={state.outcome} />
}

function RewardContent({ taskType, outcome }: RewardState) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion() ?? false
  const { react, reset } = useMascot()
  const perfect = outcome.mistakes === 0
  const award = useAward(outcome.resultId)
  const sticker = outcome.stickerId ? findSticker(outcome.stickerId) : undefined
  const title = perfect ? t('reward.perfectTitle') : t('reward.goodTitle')
  const text = perfect ? t('reward.perfectText') : t('reward.goodText')

  useEffect(() => {
    if (perfect) react('correct')
    else react('greet', { text: `${title} ${text}`, emoji: '💪' })
  }, [perfect, react, text, title])
  useEffect(() => reset, [reset])

  /** Rewards pop in one after another, like presents being handed over. */
  const pop = (delay: number): PopProps =>
    reduceMotion
      ? {}
      : {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { type: 'spring', stiffness: 260, damping: 14, delay },
        }

  return (
    <Screen header={<TopBar />} className="items-center justify-center gap-5 px-4 py-6 text-center">
      <Mascot robotClassName="w-32 sm:w-44" className="max-w-xl" />

      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{title}</h1>
      <p className="max-w-md text-xl text-ink-soft">{text}</p>

      <RewardBurst kind="stars" pieces={outcome.stars > 0 ? 10 : 0} delay={0.3}>
        <div
          className="flex items-end gap-2"
          role="img"
          aria-label={t('reward.stars', { count: outcome.stars })}
        >
          {Array.from({ length: MAX_STARS }, (_, index) => (
            <motion.div
              key={index}
              {...pop(0.35 + index * 0.15)}
              className={index < outcome.stars ? 'text-coin' : 'text-line-strong'}
            >
              <StarIcon size={index === 1 ? 84 : 64} />
            </motion.div>
          ))}
        </div>
      </RewardBurst>

      <div data-tour="earned" className="flex flex-wrap items-center justify-center gap-3">
        <motion.div
          {...pop(0.9)}
          className="flex items-center gap-2 rounded-3xl border-[3px] border-coin bg-surface px-5 py-3"
        >
          <CoinIcon size={40} />
          <span className="font-display text-3xl font-extrabold">
            {t('reward.coins', { count: outcome.coins })}
          </span>
        </motion.div>
        {outcome.bonus > 0 && (
          <motion.div {...pop(1.05)} className="rounded-3xl bg-coin-soft px-5 py-3 text-lg">
            {t('reward.bonus', { count: outcome.bonus })}
          </motion.div>
        )}
        {sticker && (
          <motion.div
            {...pop(1.2)}
            className="flex items-center gap-3 rounded-3xl bg-surface py-2 pr-5 pl-2 shadow-press"
          >
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-2xl bg-white p-1.5"
            >
              <Picture emoji={sticker.emoji} className="size-full" />
            </span>
            <span className="font-display text-xl font-bold">{t('reward.newSticker')}</span>
          </motion.div>
        )}
      </div>

      <AwardLines award={award} />
      {/* what was earned and where it goes, once per child */}
      <CoachMarks tour="reward" delayMs={2200} />

      <div className="mt-2 flex flex-wrap justify-center gap-4">
        <BackToGarden />
        <Button
          variant="soft"
          icon={<HomeIcon size={26} />}
          data-sound="back"
          data-tour="reward-home"
          onClick={() => navigate('/home')}
        >
          {t('reward.home')}
        </Button>
        {isGameType(taskType) && (
          <Button
            icon={<ChevronRightIcon size={28} />}
            iconPosition="end"
            onClick={() => navigate(`/tasks/${taskType}`, { replace: true })}
          >
            {t('reward.again')}
          </Button>
        )}
      </div>
    </Screen>
  )
}
