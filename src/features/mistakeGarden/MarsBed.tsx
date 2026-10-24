import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { ProgressBar } from '@/components/ui/Progress'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { toast } from '@/components/ui/toast'
import { PLANT_STAGES, useWorldProgress } from '@/domain/universe/progression'
import { tDynamic } from '@/lib/tDynamic'

/** The Mars plant at each stage after planting (0 = just planted). */
const MARS_LOOK = ['seedling', 'herb', 'tulip', 'blossom'] as const
const STAGE_WORD = ['seed', 'sprout', 'plant', 'bloom'] as const

/**
 * The bed of the first journey's rare Mars seed (Phase 14). A world
 * artifact, not a learning plant: it is planted with the seed found on Mars
 * and grows with science runs done well (the progression rules decide; this
 * component only asks). Kept apart from the learning plants on purpose.
 */
export function MarsBed() {
  const { t } = useTranslation()
  const { isDiscovered, stageOf, plant } = useWorldProgress()
  const stage = stageOf('mars')
  const planted = stage >= 0
  const bloomed = stage >= PLANT_STAGES

  const doPlant = () => {
    if (plant('mars') === 'ok') toast(t('practiceGarden.planted'), 'success')
  }

  const picture = (
    <span className="flex size-24 shrink-0 items-end justify-center rounded-card bg-oops-soft pb-1.5 sm:size-28">
      <Img3D
        name={planted ? MARS_LOOK[Math.min(stage, PLANT_STAGES)]! : 'garden-house'}
        className={planted ? 'size-[80%]' : 'size-[70%] opacity-50'}
        eager
      />
    </span>
  )

  return (
    <section
      aria-labelledby="mars-bed"
      data-testid="mars-bed"
      data-stage={stage}
      className="flex w-full max-w-5xl flex-col items-center gap-3 rounded-panel bg-surface p-4 text-center shadow-press sm:flex-row sm:text-left"
    >
      {bloomed ? <RewardBurst pieces={8}>{picture}</RewardBurst> : picture}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:items-start">
        <h2 id="mars-bed" className="font-display text-2xl font-extrabold">
          {t('practiceGarden.marsTitle')}
        </h2>
        {!planted && !isDiscovered('mars-seed') && (
          <>
            <p className="text-lg text-ink-soft">{t('practiceGarden.noSeed')}</p>
            <LinkButton to="/spaceport" variant="soft" size="md">
              {t('practiceGarden.toSpaceport')}
            </LinkButton>
          </>
        )}
        {!planted && isDiscovered('mars-seed') && (
          <Button variant="coin" size="md" onClick={doPlant} data-testid="plant-seed">
            {t('practiceGarden.plant')}
          </Button>
        )}
        {planted && (
          <>
            <p className="font-display text-xl font-bold" data-testid="mars-stage">
              {tDynamic(t, `practiceGarden.stages.${STAGE_WORD[Math.min(stage, PLANT_STAGES)]}`)}
            </p>
            <ProgressBar
              value={stage}
              max={PLANT_STAGES}
              label={t('practiceGarden.growth', { stage, total: PLANT_STAGES })}
              className="w-full max-w-xs"
            />
            <p aria-hidden="true" className="text-base font-semibold text-ink-soft tabular-nums">
              {t('practiceGarden.growth', { stage, total: PLANT_STAGES })}
            </p>
            {bloomed ? (
              <>
                <p className="text-lg text-ink-soft">{t('practiceGarden.bloomed')}</p>
                <LinkButton to="/science-lab" size="md">
                  {t('practiceGarden.toLab')}
                </LinkButton>
              </>
            ) : (
              <>
                <p className="text-lg text-ink-soft">{t('practiceGarden.grow')}</p>
                <LinkButton to="/learn/garden" variant="soft" size="md">
                  {t('practiceGarden.toLesson')}
                </LinkButton>
              </>
            )}
          </>
        )}
      </div>
    </section>
  )
}
