import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { LinkButton } from '@/components/ui/LinkButton'
import { GUEST_KEY } from '@/domain/childKey'
import {
  FILTER_FROM_PLANTS,
  gardenAreas,
  useGarden,
  type GardenPlant,
  type GardenSummary,
} from '@/domain/garden'
import { tabPanelProps } from '@/components/ui/tabPanel'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { useChildKey } from '@/store/progressStore'
import { FILTER_ID, GardenFilter, type GardenArea } from './GardenFilter'
import { GardenScene, PlantGrid, PlantPatch } from './GardenScene'
import { MarsBed } from './MarsBed'
import { useMarsActionPending } from './useMarsActionPending'
import { GrowthPath, PlantSheet } from './PlantSheet'
import { endGardenTrip } from './gardenTrip'
import { anyGrew, grownSince, markSeen } from './seenStages'
import './garden.css'

/*
 * The Mistake Garden (Phase 16), shown to the child as the Practice Garden:
 * never a list of mistakes. Every skill the learning memory holds as a real
 * difficulty is one plant; practice in the existing activities grows it, and
 * a bloom means "I learned this". The page only shows: the stages come from
 * the learning memory (domain/garden), the Mars bed from the progression rules.
 */
export function MistakeGardenPage() {
  const childKey = useChildKey()
  // a profile switch starts a fresh view: one child's plants never show for another
  return <Garden key={childKey} childKey={childKey} />
}

type MascotLine = 'empty' | 'seeds' | 'growing' | 'bloom' | 'grew'

function mascotLine(summary: GardenSummary, grew: boolean): MascotLine {
  if (grew) return 'grew'
  if (summary.total === 0) return 'empty'
  if (summary.seed > 0) return 'seeds'
  return summary.growing > 0 ? 'growing' : 'bloom'
}

function Garden({ childKey }: { childKey: string }) {
  const { t } = useTranslation()
  const { plants, summary } = useGarden(childKey)
  // what grew since the child last looked (this page lifetime only; see seenStages)
  const [grown] = useState(() => grownSince(childKey, plants))
  const [openSkill, setOpenSkill] = useState<string | null>(null)
  const marsFirst = useMarsActionPending()
  const { react } = useMascot()
  const line = mascotLine(summary, anyGrew(grown))
  const open = plants.find((plant) => plant.skillKey === openSkill) ?? null
  // a big, mixed garden can show one area at a time (never for a few plants)
  const areas = gardenAreas(plants)
  const filterable = plants.length >= FILTER_FROM_PLANTS && areas.length >= 2
  const [area, setArea] = useState<GardenArea>('all')
  const shownArea = filterable && (area === 'all' || areas.includes(area)) ? area : 'all'
  const shown = shownArea === 'all' ? plants : plants.filter((plant) => plant.domain === shownArea)

  useEffect(() => {
    markSeen(childKey, plants)
  }, [childKey, plants])

  // back in the garden: the practice trip is over
  useEffect(() => endGardenTrip(), [])

  useEffect(() => {
    react(
      line === 'grew' || line === 'bloom' ? 'correct' : 'instruct',
      { text: t(`practiceGarden.mascot.${line}`), emoji: line === 'bloom' ? '🌸' : '🌱' },
      { speak: false },
    )
  }, [line, react, t])

  return (
    <Screen
      header={<TitleTopBar title={t('practiceGarden.title')} back="/home" />}
      className="items-center gap-5 px-3 py-4 sm:px-6 sm:py-6 short:gap-3 short:py-3"
    >
      <div className="flex w-full max-w-5xl flex-col items-center gap-2 sm:flex-row sm:gap-4">
        <Mascot robotClassName="w-16 sm:w-24" className="w-full sm:w-auto sm:flex-1" />
      </div>
      <p className="max-w-2xl text-center text-lg text-ink-soft">
        {t('practiceGarden.learningIntro')}
      </p>

      {marsFirst && <MarsBed />}

      <GardenScene label={t('practiceGarden.sceneLabel', { count: plants.length })}>
        {plants.length === 0 ? (
          <EmptyGarden />
        ) : (
          <div className="flex flex-col gap-4">
            {filterable && <GardenFilter areas={areas} value={shownArea} onChange={setArea} />}
            <div {...(filterable ? tabPanelProps(FILTER_ID, shownArea) : {})}>
              <PlantGrid>
                {shown.map((plant) => (
                  <li key={plant.skillKey}>
                    <PlantPatch
                      plant={plant}
                      grewFrom={grown.get(plant.skillKey)}
                      onOpen={(chosen: GardenPlant) => setOpenSkill(chosen.skillKey)}
                    />
                  </li>
                ))}
              </PlantGrid>
            </div>
          </div>
        )}
      </GardenScene>

      <section
        aria-labelledby="garden-path"
        className="flex w-full max-w-xl flex-col items-center gap-3 rounded-panel bg-surface p-4 shadow-press"
      >
        <h2 id="garden-path" className="font-display text-xl font-extrabold">
          {t('practiceGarden.pathTitle')}
        </h2>
        <GrowthPath />
      </section>

      {childKey === GUEST_KEY && (
        <p
          className="max-w-xl text-center text-base font-semibold text-ink-soft"
          data-testid="garden-guest"
        >
          {t('practiceGarden.guest')}
        </p>
      )}

      {!marsFirst && <MarsBed />}

      {open && <PlantSheet plant={open} onClose={() => setOpenSkill(null)} />}
    </Screen>
  )
}

function EmptyGarden() {
  const { t } = useTranslation()
  return (
    <div
      data-testid="garden-empty"
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card bg-surface/90 px-5 py-6 text-center shadow-press-sm"
    >
      <h2 className="font-display text-2xl font-extrabold">{t('practiceGarden.empty.title')}</h2>
      <p className="text-lg text-ink-soft">{t('practiceGarden.empty.text')}</p>
      <LinkButton to="/math-lab" variant="soft" size="md">
        {t('practiceGarden.empty.go')}
      </LinkButton>
    </div>
  )
}
