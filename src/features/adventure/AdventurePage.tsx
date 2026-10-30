import { JourneyCard } from '@/features/city/JourneyCard'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Screen } from '@/components/layout/Screen'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { stageIndex, useAdventure, useResources, worldStage } from '@/domain/universe'
import { useChildKey, useProgressStore } from '@/store/progressStore'
import { tDynamic } from '@/lib/tDynamic'
import { queueCue } from '@/services/audio/soundLanguage'
import { cellFor, roadPath, useMapColumns } from './mapLayout'
import { WorldStop } from './WorldStop'

/**
 * The Adventure Map: worlds along a winding road, opening as the child
 * collects stars. Opening a world only changes the map; every learning
 * activity stays reachable from the city at any time.
 */
export function AdventurePage() {
  // a different child (profiles switched) gets their own map and their own news
  const childKey = useChildKey()
  return <AdventureMap key={childKey} childKey={childKey} />
}

function AdventureMap({ childKey }: { childKey: string }) {
  const { t } = useTranslation()
  const worlds = useAdventure()
  const stars = useResources().star ?? 0
  const cols = useMapColumns()
  const mapRef = useRef<HTMLDivElement>(null)
  const [road, setRoad] = useState({ path: '', width: 1, height: 1 })

  // World Card Evolution: a card whose stage rose since the child last saw the map is shown
  // off this once (remembered per child; the stages never drop, stars are never spent)
  const markWorldStages = useProgressStore((state) => state.markWorldStages)
  const stages = Object.fromEntries(
    worlds.map((world) => [world.id, stageIndex(worldStage(world))]),
  )
  const [fresh] = useState(() => {
    const seen = useProgressStore.getState().byChild[childKey]?.worldStages ?? {}
    return new Set(
      Object.entries(stages)
        .filter(([id, stage]) => stage > (seen[id] ?? 0))
        .map(([id]) => id),
    )
  })
  const stageKey = JSON.stringify(stages)
  useEffect(() => {
    markWorldStages(childKey, JSON.parse(stageKey) as Record<string, number>)
  }, [childKey, markWorldStages, stageKey])
  // one announcement for the new stages, put in the live region after it is on the page
  const news = worlds
    .filter((world) => fresh.has(world.id))
    .map((world) =>
      t('adventure.stageNews', {
        name: tDynamic(t, world.nameKey),
        stage: t(`adventure.stages.${worldStage(world)}`),
      }),
    )
    .join(' ')
  const [said, setSaid] = useState('')
  useEffect(() => {
    if (!news) return undefined
    const timer = window.setTimeout(() => {
      setSaid(news)
      queueCue('unlock')
    }, 400)
    return () => window.clearTimeout(timer)
  }, [news])

  // the road follows the cards as they are laid out (and again when they resize)
  useLayoutEffect(() => {
    const map = mapRef.current
    if (!map) return undefined
    const measure = () => {
      const box = map.getBoundingClientRect()
      const cards = [
        ...map.querySelectorAll<HTMLElement>(':scope > ol > li[data-testid^="world-"]'),
      ]
      const points = cards.map((card, index) => {
        const rect = card.getBoundingClientRect()
        return {
          x: rect.left - box.left + rect.width / 2,
          y: rect.top - box.top + Math.min(rect.height / 2, 56),
          row: cellFor(index, cols).row,
        }
      })
      setRoad({
        path: roadPath(points, cols, box.width),
        width: Math.max(1, box.width),
        height: Math.max(1, box.height),
      })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(map)
    return () => observer.disconnect()
  }, [cols, worlds])

  return (
    <Screen
      header={<TitleTopBar title={t('adventure.title')} back="/home" />}
      className="items-center gap-5 px-4 py-6 sm:gap-6 sm:py-8 short:gap-3 short:py-3"
    >
      {/* the big journey's chain of places, above the map of worlds */}
      <JourneyCard />

      <div className="flex w-full max-w-5xl flex-col items-center gap-2 text-center">
        <p className="flex min-h-11 items-center gap-2 rounded-full bg-coin-soft px-4 py-1.5 font-display text-xl font-extrabold">
          <ResourceIcon resource="star" size={30} />
          {t('adventure.starsTotal', { count: stars })}
        </p>
        <p className="max-w-xl text-lg text-ink-soft">{t('adventure.hint')}</p>
      </div>

      <p role="status" className="sr-only" data-testid="stage-news">
        {said}
      </p>

      <div ref={mapRef} className="relative w-full max-w-5xl">
        {road.path && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
            viewBox={`0 0 ${road.width} ${road.height}`}
          >
            <path
              d={road.path}
              fill="none"
              stroke="var(--color-line-strong)"
              strokeWidth={14}
              strokeLinecap="round"
            />
            <path
              d={road.path}
              fill="none"
              stroke="var(--color-surface)"
              strokeWidth={3}
              strokeDasharray="10 12"
              strokeLinecap="round"
            />
          </svg>
        )}
        <ol
          className="relative grid items-start gap-x-8 gap-y-8 sm:gap-x-12 sm:gap-y-10"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {worlds.map((world, index) => {
            const cell = cellFor(index, cols)
            const swing = cols === 1 ? (index % 2 === 0 ? 'mr-6' : 'ml-6') : ''
            return (
              <WorldStop
                key={world.id}
                world={world}
                stars={stars}
                fresh={fresh.has(world.id)}
                className={swing}
                style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
              />
            )
          })}
        </ol>
      </div>
    </Screen>
  )
}
