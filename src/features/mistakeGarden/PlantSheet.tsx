import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { LinkButton } from '@/components/ui/LinkButton'
import { PLANT_STAGES, stageRank, type GardenPlant, type NextStep } from '@/domain/garden'
import { tDynamic } from '@/lib/tDynamic'
import { STAGE_CHIP } from './gardenStyles'
import { PlantArt } from './PlantArt'
import { skillNameKey } from './skillName'

/** What makes the plant grow next, in words (no scores). */
function NextText({ next }: { next: NextStep }) {
  const { t } = useTranslation()
  let line: string
  switch (next.kind) {
    case 'practise':
      line = t('practiceGarden.next.practise')
      break
    case 'grow':
      line = t('practiceGarden.next.grow', { count: next.count })
      break
    case 'bloom':
      line = t('practiceGarden.next.bloom', { count: next.count })
      break
    case 'bloom-later':
      line = t('practiceGarden.next.bloomLater', { count: next.count })
      break
    case 'check-later':
      line = t('practiceGarden.next.checkLater')
      break
    case 'learned':
      line = t('practiceGarden.next.learned')
      break
  }
  return (
    <p className="text-lg text-ink-soft" data-testid="plant-sheet-next">
      {line}
    </p>
  )
}

/** Seed → sprout → plant → flower, with this plant's place on the way. */
export function GrowthPath({ current }: { current?: GardenPlant['stage'] }) {
  const { t } = useTranslation()
  const reached = current ? stageRank(current) : 0
  return (
    <ol
      className="flex w-full items-start justify-between gap-1"
      aria-label={t('practiceGarden.pathTitle')}
    >
      {PLANT_STAGES.map((stage, index) => {
        const done = index + 1 <= reached
        const here = index + 1 === reached
        return (
          <li
            key={stage}
            aria-current={here ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
          >
            <PlantArt
              look={{ family: 'flower', hue: 0, mirrored: false }}
              stage={stage}
              className={clsx('aspect-[4/5] w-11 sm:w-14', current && !done && 'opacity-40')}
            />
            <span
              className={clsx(
                'text-sm leading-tight font-bold break-words',
                here ? 'text-primary-ink' : 'text-ink-soft',
              )}
            >
              {t(`practiceGarden.stage.${stage}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/** The plant up close: what it is, how far it grew, what makes it grow next. */
export function PlantSheet({ plant, onClose }: { plant: GardenPlant; onClose: () => void }) {
  const { t } = useTranslation()
  const name = tDynamic(t, skillNameKey(plant.skillKey))
  const bloom = plant.stage === 'bloom'
  return (
    <Dialog
      title={name}
      onClose={onClose}
      dismissible
      placement="sheet"
      size="md"
      testId="plant-sheet"
      media={
        <div className="garden-meadow mx-auto flex w-full max-w-xs justify-center rounded-card pt-2">
          <PlantArt look={plant.look} stage={plant.stage} className="aspect-[4/5] w-36 sm:w-44" />
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          className={clsx('rounded-full px-3 py-1 text-base font-bold', STAGE_CHIP[plant.stage])}
          data-testid="plant-sheet-stage"
        >
          {t(`practiceGarden.stage.${plant.stage}`)}
        </span>
        {bloom && (
          <p className="font-display text-2xl font-extrabold text-girl-ink">
            {t('practiceGarden.learned')}
          </p>
        )}
        <GrowthPath current={plant.stage} />
        <NextText next={plant.next} />
        <div className="flex w-full flex-wrap justify-center gap-3">
          {plant.practice && (
            <LinkButton to={plant.practice} size="md" data-testid="plant-practise">
              {t('practiceGarden.practise')}
            </LinkButton>
          )}
          <Button variant="soft" size="md" onClick={onClose}>
            {t('practiceGarden.close')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
