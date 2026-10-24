import { JourneyCard } from '@/features/city/JourneyCard'
import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Screen } from '@/components/layout/Screen'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { useAdventure, useResources } from '@/domain/universe'
import { cellFor, roadPath, useMapColumns } from './mapLayout'
import { WorldStop } from './WorldStop'

/**
 * The Adventure Map: worlds along a winding road, opening as the child
 * collects stars. Opening a world only changes the map; every learning
 * activity stays reachable from the city at any time.
 */
export function AdventurePage() {
  const { t } = useTranslation()
  const worlds = useAdventure()
  const stars = useResources().star ?? 0
  const cols = useMapColumns()
  const mapRef = useRef<HTMLDivElement>(null)
  const [road, setRoad] = useState({ path: '', width: 1, height: 1 })

  // the road follows the cards as they are laid out (and again when they resize)
  useLayoutEffect(() => {
    const map = mapRef.current
    if (!map) return undefined
    const measure = () => {
      const box = map.getBoundingClientRect()
      const cards = [...map.querySelectorAll<HTMLElement>('[data-testid^="world-"]')]
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
