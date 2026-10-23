import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { useSpeakable } from '@/features/learn/speakable'
import { FeelingFace } from './FeelingFace'
import {
  BREATH_IN_MS,
  BREATH_OUT_MS,
  BREATHS,
  FIRST_BREATH,
  nextPosition,
  type BreathPosition,
} from './session'

type Stage = 'ready' | 'running' | 'done'

/**
 * The calm corner: breathe with a circle that grows and shrinks. Nothing is
 * scored, nothing is earned (so it is never a way to collect rewards), and the
 * child can leave at any moment. With reduced motion the circle stands still
 * and the breaths are text steps the child moves through at their own pace.
 */
export function CalmCorner() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const [stage, setStage] = useState<Stage>('ready')
  const [pos, setPos] = useState<BreathPosition>(FIRST_BREATH)
  const { breath, half } = pos

  const advance = () => {
    const following = nextPosition(pos)
    if (following) setPos(following)
    else setStage('done')
  }

  // the animated breathing moves on by itself; the text steps wait for the child
  useEffect(() => {
    if (stage !== 'running' || reduceMotion) return
    const timer = window.setTimeout(
      () => {
        const following = nextPosition(pos)
        if (following) setPos(following)
        else setStage('done')
      },
      pos.half === 'in' ? BREATH_IN_MS : BREATH_OUT_MS,
    )
    return () => window.clearTimeout(timer)
  }, [stage, pos, reduceMotion])

  const start = () => {
    setPos(FIRST_BREATH)
    setStage('running')
  }

  const cue = half === 'in' ? t('feelings.calm.breatheIn') : t('feelings.calm.breatheOut')
  const step = half === 'in' ? t('feelings.calm.stepIn') : t('feelings.calm.stepOut')
  const status =
    stage === 'ready'
      ? t('feelings.calm.intro')
      : stage === 'running'
        ? t('feelings.calm.count', { current: breath + 1, total: BREATHS })
        : t('feelings.calm.done')
  useSpeakable(stage === 'running' ? [reduceMotion ? step : cue] : [status])

  const grown = stage === 'running' && half === 'in'

  return (
    <Screen header={<TitleTopBar title={t('feelings.kinds.calm')} back="/feelings" />}>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-4 py-6 text-center short:max-w-3xl short:flex-row short:gap-6 short:py-2">
        <div className="relative flex size-60 shrink-0 items-center justify-center sm:size-80 short:size-[min(15rem,calc(100dvh-7rem))]">
          {/* the breathing circle: still when motion is reduced */}
          <div
            role="img"
            aria-label={t('feelings.calm.circle')}
            data-testid="calm-circle"
            data-half={stage === 'running' ? half : 'rest'}
            className="absolute inset-0 rounded-full bg-primary-soft"
          />
          <div
            aria-hidden="true"
            className={clsx(
              'absolute inset-[8%] rounded-full bg-primary/25 ease-in-out',
              !reduceMotion && 'transition-transform',
            )}
            style={{
              transform: `scale(${reduceMotion ? 0.8 : grown ? 1 : 0.55})`,
              transitionDuration: `${grown ? BREATH_IN_MS : BREATH_OUT_MS}ms`,
            }}
          />
          <div className="relative flex flex-col items-center gap-1 px-6">
            {stage === 'running' ? (
              <p className="font-display text-3xl font-extrabold text-primary-ink sm:text-4xl short:text-2xl">
                {cue}
              </p>
            ) : (
              <FeelingFace feeling="calm" className="size-24 sm:size-32 short:size-20" />
            )}
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-4 short:gap-3">
          <div className="flex items-center gap-3">
            <p
              aria-live="polite"
              className="font-display text-xl font-extrabold sm:text-2xl short:text-lg"
            >
              {status}
            </p>
            <SpeakButton />
          </div>

          {stage === 'running' && reduceMotion && (
            <p
              data-testid="calm-step"
              className="rounded-card bg-surface p-4 text-lg shadow-press short:p-2 short:text-base"
            >
              {step}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {stage === 'ready' && (
              <Button size="md" onClick={start}>
                {t('feelings.calm.start')}
              </Button>
            )}
            {stage === 'running' && reduceMotion && (
              <Button size="md" onClick={advance}>
                {t('feelings.calm.nextStep')}
              </Button>
            )}
            {stage === 'running' && (
              // leaving is always allowed, nothing is lost
              <LinkButton to="/feelings" variant="soft" size="md">
                {t('feelings.calm.stop')}
              </LinkButton>
            )}
            {stage === 'done' && (
              <>
                <LinkButton to="/feelings" variant="soft" size="md">
                  {t('feelings.calm.back')}
                </LinkButton>
                <Button size="md" onClick={start}>
                  {t('feelings.calm.again')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Screen>
  )
}
