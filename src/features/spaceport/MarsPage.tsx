import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { useWorldProgress } from '@/domain/universe/progression'

const ROCKS = 3

/**
 * Mars, opened by the rocket. The child looks under the rocks; the last rock
 * looked under holds the rare seed (no chance, no hurry: every rock can be
 * turned). Taking the seed is the find (`discoverArtifact`), paid once.
 */
export function MarsPage() {
  const { t } = useTranslation()
  const { isUnlocked, isDiscovered, discover } = useWorldProgress()
  const [turned, setTurned] = useState<number[]>([])
  const found = isDiscovered('mars-seed')
  const seedUnder = turned.length === ROCKS ? turned[ROCKS - 1] : null

  if (!isUnlocked('mars')) {
    return (
      <Screen
        header={<TitleTopBar title={t('mars.title')} back="/spaceport" />}
        className="items-center gap-4 px-4 py-8 text-center"
      >
        <Img3D name="space/mars" className="size-32 opacity-60 grayscale" />
        <p className="max-w-md text-lg text-ink-soft" data-testid="mars-locked">
          {t('mars.locked')}
        </p>
        <LinkButton to="/spaceport">{t('mars.toSpaceport')}</LinkButton>
      </Screen>
    )
  }

  return (
    <Screen
      header={<TitleTopBar title={t('mars.title')} back="/spaceport" />}
      className="items-center gap-5 px-4 py-6 text-center sm:py-8 short:gap-3 short:py-3"
    >
      <Img3D name="space/mars" className="size-36 sm:size-44 short:size-24" eager />
      <p className="max-w-xl text-lg text-ink-soft">{t('mars.fact')}</p>

      {found ? (
        <RewardBurst pieces={8}>
          <div className="flex flex-col items-center gap-3" role="status" data-testid="mars-found">
            <Img3D name="seedling" className="size-24" />
            <p className="font-display text-2xl font-extrabold">{t('mars.taken')}</p>
            <LinkButton to="/mistake-garden">{t('mars.toGarden')}</LinkButton>
          </div>
        </RewardBurst>
      ) : (
        <>
          <p className="font-display text-xl font-bold">{t('mars.hint')}</p>
          <ul className="flex flex-wrap justify-center gap-4">
            {Array.from({ length: ROCKS }, (_, index) => {
              const isTurned = turned.includes(index)
              const hasSeed = seedUnder === index
              return (
                <li key={index}>
                  <button
                    type="button"
                    // stays focusable after the turn (focus is never dropped to the page)
                    aria-disabled={isTurned}
                    onClick={() => {
                      if (!isTurned) setTurned((list) => [...list, index])
                    }}
                    aria-label={t('mars.rock', { n: index + 1 })}
                    data-testid={`mars-rock-${index}`}
                    className={clsx(
                      'flex size-24 items-center justify-center rounded-card shadow-press transition-transform active:translate-y-1 sm:size-28',
                      isTurned ? 'bg-oops-soft shadow-none' : 'bg-surface',
                    )}
                  >
                    <Img3D
                      name={hasSeed ? 'seedling' : 'rock'}
                      className={clsx('size-[70%]', isTurned && !hasSeed && 'opacity-40')}
                    />
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="min-h-7 text-base font-semibold text-ink-soft" role="status">
            {seedUnder !== null ? t('mars.found') : turned.length > 0 ? t('mars.dust') : ''}
          </p>
          {seedUnder !== null && (
            <Button variant="coin" onClick={() => discover('mars-seed')} data-testid="take-seed">
              {t('mars.take')}
            </Button>
          )}
        </>
      )}
    </Screen>
  )
}
