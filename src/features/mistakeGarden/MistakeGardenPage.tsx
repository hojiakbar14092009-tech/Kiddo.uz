import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { ProgressBar } from '@/components/ui/Progress'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { toast } from '@/components/ui/toast'
import { gardenStage, useChildMemory, type GardenStage } from '@/domain/learningMemory'
import { PLANT_STAGES, useWorldProgress } from '@/domain/universe/progression'
import { skillFamily } from '@/features/parent/insights/activityNames'
import { tDynamic } from '@/lib/tDynamic'
import { useChildKey } from '@/store/progressStore'

/** The Mars plant at each stage after planting (0 = just planted). */
const MARS_LOOK = ['seedling', 'herb', 'tulip', 'blossom'] as const
const STAGE_WORD = ['seed', 'sprout', 'plant', 'bloom'] as const
const PRACTICE_LOOK: Record<Exclude<GardenStage, 'none'>, string> = {
  seed: 'seedling',
  sprout: 'herb',
  plant: 'clover',
  bloom: 'blossom',
}

/**
 * The Mistake Garden, shown to the child as the Practice Garden: never a
 * list of failures. One bed holds the rare Mars seed of the first journey;
 * it grows with science runs done well (the progression rules decide). Below
 * it, practice sprouts from the learning memory: a skill that was tricky is
 * a sprout, and it blooms as the memory sees the child get past it.
 */
export function MistakeGardenPage() {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const { isDiscovered, stageOf, plant } = useWorldProgress()
  const memory = useChildMemory(childKey)
  const stage = stageOf('mars')
  const planted = stage >= 0
  const bloomed = stage >= PLANT_STAGES

  // one sprout per skill family, the furthest along first
  const sprouts = useMemo(() => {
    const order: GardenStage[] = ['bloom', 'plant', 'sprout', 'seed']
    const byLabel = new Map<string, { family: string; stage: Exclude<GardenStage, 'none'> }>()
    for (const skill of Object.values(memory.skills)) {
      const look = gardenStage(skill)
      if (look === 'none') continue
      const family = skillFamily(skill.skill.replace(/^math:/, ''))
      const known = byLabel.get(family)
      if (!known || order.indexOf(look) > order.indexOf(known.stage)) {
        byLabel.set(family, { family, stage: look })
      }
    }
    return [...byLabel.values()].sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage))
  }, [memory.skills])

  const doPlant = () => {
    if (plant('mars') === 'ok') toast(t('practiceGarden.planted'), 'success')
  }

  const marsPicture = (
    <span className="flex size-32 items-end justify-center rounded-card bg-primary-soft pb-2 sm:size-36">
      <Img3D
        name={planted ? MARS_LOOK[Math.min(stage, PLANT_STAGES)]! : 'garden-house'}
        className={planted ? 'size-[78%]' : 'size-[70%] opacity-50'}
        eager
      />
    </span>
  )

  return (
    <Screen
      header={<TitleTopBar title={t('practiceGarden.title')} back="/home" />}
      className="items-center gap-6 px-4 py-6 sm:py-8 short:gap-3 short:py-3"
    >
      <p className="max-w-xl text-center text-lg text-ink-soft">{t('practiceGarden.intro')}</p>

      <section
        aria-labelledby="mars-bed"
        data-testid="mars-bed"
        data-stage={stage}
        className="flex w-full max-w-2xl flex-col items-center gap-4 rounded-card bg-surface p-4 text-center shadow-press sm:flex-row sm:text-left"
      >
        {bloomed ? <RewardBurst pieces={8}>{marsPicture}</RewardBurst> : marsPicture}
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

      <section aria-labelledby="sprouts" className="flex w-full max-w-2xl flex-col gap-3">
        <h2 id="sprouts" className="font-display text-2xl font-extrabold">
          {t('practiceGarden.practiceTitle')}
        </h2>
        <p className="text-lg text-ink-soft">{t('practiceGarden.practiceIntro')}</p>
        {sprouts.length === 0 ? (
          <p className="text-lg text-ink-soft" data-testid="sprouts-empty">
            {t('practiceGarden.practiceEmpty')}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="sprouts">
            {sprouts.map((sprout) => (
              <li
                key={sprout.family}
                className="flex flex-col items-center gap-1 rounded-card bg-surface p-3 text-center shadow-press-sm"
              >
                <Img3D name={PRACTICE_LOOK[sprout.stage]} className="size-14" />
                <span className="font-display text-lg leading-tight font-bold">
                  {tDynamic(t, `parent.insights.skillNames.${sprout.family}`)}
                </span>
                <span className="text-sm font-semibold text-ink-soft">
                  {tDynamic(t, `practiceGarden.practice.${sprout.stage}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <LinkButton to="/math-lab" variant="soft" size="md" className="self-center">
          {t('practiceGarden.practiceGo')}
        </LinkButton>
      </section>
    </Screen>
  )
}
