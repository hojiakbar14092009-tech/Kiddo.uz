import clsx from 'clsx'
import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useInView } from '@/components/three/useInView'
import { stableHash, type GardenPlant } from '@/domain/garden'
import { tDynamic } from '@/lib/tDynamic'
import { DomainIcon } from './DomainIcon'
import { STAGE_CHIP } from './gardenStyles'
import { PlantArt } from './PlantArt'
import { skillNameKey } from '@/domain/learning'

/*
 * The garden as a place: sky, hills, a meadow and one patch of soil per
 * plant. Two butterflies and a slow leaf sway are the only ambient motion,
 * and both stop while the scene is off screen.
 */

function Backdrop() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 400 110"
      preserveAspectRatio="none"
      className="absolute inset-x-0 top-0 h-[96px] w-full sm:h-[124px]"
    >
      <g fill="#fff" opacity={0.8}>
        <ellipse cx={70} cy={26} rx={26} ry={8} />
        <ellipse cx={88} cy={20} rx={16} ry={9} />
        <ellipse cx={262} cy={36} rx={22} ry={6} />
        <ellipse cx={276} cy={31} rx={12} ry={7} />
      </g>
      <path d="M0 78 C60 46 120 50 180 70 C240 90 300 44 400 58 L400 110 L0 110Z" fill="#a9d993" />
      <path d="M0 92 C80 70 150 78 220 88 C290 98 340 76 400 82 L400 110 L0 110Z" fill="#cdeebb" />
    </svg>
  )
}

function Butterfly({ className, color }: { className: string; color: string }) {
  return (
    <svg
      viewBox="0 0 26 22"
      aria-hidden="true"
      focusable="false"
      className={clsx('garden-butterfly', className)}
    >
      <g className="wing">
        <path d="M13 11 C6 0 0 3 3 10 C0 16 7 20 13 12Z" fill={color} />
      </g>
      <g className="wing wing-right">
        <path d="M13 11 C20 0 26 3 23 10 C26 16 19 20 13 12Z" fill={color} />
      </g>
      <rect x={12.2} y={6} width={1.6} height={11} rx={0.8} fill="#3a2e4d" />
    </svg>
  )
}

export interface PlantPatchProps {
  plant: GardenPlant
  /** The stage rank it grew from since the child last looked (plays the growth once). */
  grewFrom?: number
  onOpen: (plant: GardenPlant) => void
}

export function PlantPatch({ plant, grewFrom, onOpen }: PlantPatchProps) {
  const { t } = useTranslation()
  const name = tDynamic(t, skillNameKey(plant.skillKey))
  const stage = t(`practiceGarden.stage.${plant.stage}`)
  return (
    <button
      type="button"
      onClick={() => onOpen(plant)}
      aria-haspopup="dialog"
      aria-label={t('practiceGarden.plantLabel', { name, stage })}
      data-testid="garden-plant"
      data-skill={plant.skillKey}
      data-domain={plant.domain ?? undefined}
      data-stage={plant.stage}
      data-grew={grewFrom !== undefined ? 'true' : undefined}
      className="group flex w-full min-w-0 flex-col items-center rounded-card p-1 transition-transform duration-200 ease-soft focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97]"
    >
      <PlantArt
        look={plant.look}
        stage={plant.stage}
        growing={grewFrom !== undefined}
        sway
        swayDelay={(stableHash(plant.skillKey) % 70) / 10}
        className="aspect-[4/5] w-full max-w-[150px] sm:max-w-[170px]"
      />
      <span className="-mt-2 flex w-full max-w-[190px] flex-col items-center gap-1 rounded-tile bg-surface/95 px-2 py-2 shadow-press-sm">
        <span className="font-display text-base leading-tight font-bold break-words sm:text-lg">
          {name}
        </span>
        <span className="flex items-center gap-1.5">
          {plant.domain && <DomainIcon domain={plant.domain} />}
          <span
            className={clsx(
              'rounded-full px-2.5 py-0.5 text-sm font-bold',
              STAGE_CHIP[plant.stage],
            )}
          >
            {stage}
          </span>
        </span>
      </span>
    </button>
  )
}

export function GardenScene({
  label,
  children,
  testId = 'garden-scene',
}: {
  label: string
  children: ReactNode
  testId?: string
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref)
  return (
    <section
      ref={ref}
      aria-label={label}
      data-testid={testId}
      data-still={inView ? 'false' : 'true'}
      className="garden-sky relative w-full max-w-5xl overflow-hidden rounded-panel shadow-press-lg"
    >
      <Backdrop />
      <Butterfly className="top-4 left-[6%]" color="#f7a8c4" />
      <Butterfly className="top-12 left-[12%]" color="#ffd36a" />
      <div className="garden-meadow relative mt-[90px] px-3 pt-3 pb-6 sm:mt-[118px] sm:px-6 sm:pb-8">
        {children}
      </div>
    </section>
  )
}

/** Plants in rows; on a phone two per row, a little staggered like a real bed. */
export function PlantGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 [&>li:nth-child(even)]:translate-y-3">
      {children}
    </ul>
  )
}
