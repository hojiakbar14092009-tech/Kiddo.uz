import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import type { Language } from '@/content/languages'
import { CITIES, CITY_IDS, type CityId } from './content'
import { ARAL_PATH, BORDER_PATH, cityPoint, MAP_HEIGHT, MAP_WIDTH, PEAKS, RIVER_PATH } from './geo'

const LABEL_SIDE: Record<'above' | 'below' | 'left' | 'right', string> = {
  above: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
  below: 'top-full left-1/2 -translate-x-1/2 -mt-1',
  left: 'right-full top-1/2 -translate-y-1/2 -mr-1',
  right: 'left-full top-1/2 -translate-y-1/2 -ml-1',
}

/** The outline, the Aral Sea, the river and a few peaks (decorative). */
export function MapShape({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      aria-hidden="true"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={BORDER_PATH}
        fill="#f6e3b4"
        stroke="#c9a35f"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path d={ARAL_PATH} fill="#a9d8f2" stroke="#7cc4f5" strokeWidth="3" />
      <path
        d={RIVER_PATH}
        fill="none"
        stroke="#7cc4f5"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {PEAKS.map((peak) => (
        <path
          key={`${peak.x}-${peak.y}`}
          d={`M${peak.x - 26} ${peak.y + 16} L${peak.x} ${peak.y - 20} L${peak.x + 26} ${peak.y + 16} Z`}
          fill="#d7c08f"
          stroke="#b89a5e"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

/**
 * The stylised map with tappable cities. Every city is a 48 px button (the
 * positions keep them apart even on a 320 px phone); its name sits beside the
 * dot and is not part of the tap target.
 */
export function UzMap({
  cities,
  labels,
  tried,
  solved,
  language,
  onPick,
}: {
  cities: readonly CityId[]
  /** Show every name; otherwise only names of cities tapped already. */
  labels: boolean
  tried: readonly CityId[]
  /** The answer, once found. */
  solved: CityId | null
  language: Language
  onPick: (city: CityId) => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="group"
      aria-label={t('uzbekistan.map.label')}
      data-testid="uz-map"
      className="relative aspect-[790/520] w-full"
    >
      <MapShape className="absolute inset-0 size-full" />
      {CITY_IDS.filter((id) => cities.includes(id)).map((id) => {
        const city = CITIES[id]
        const { x, y } = cityPoint(id)
        const wasTried = tried.includes(id)
        const isAnswer = solved === id
        const showName = labels || wasTried || isAnswer
        return (
          <div
            key={id}
            className="absolute size-12 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(x / MAP_WIDTH) * 100}%`, top: `${(y / MAP_HEIGHT) * 100}%` }}
          >
            <button
              type="button"
              onClick={() => onPick(id)}
              aria-label={city.name[language]}
              aria-disabled={wasTried || solved !== null}
              data-testid="uz-city"
              data-city={id}
              className="group flex size-12 items-center justify-center rounded-full"
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'flex items-center justify-center rounded-full border-4 border-white transition-transform',
                  isAnswer
                    ? 'size-9 bg-primary text-white shadow-press-primary'
                    : wasTried
                      ? 'size-6 bg-line-strong'
                      : 'size-7 bg-oops shadow-press-sm group-active:scale-90',
                )}
              >
                {isAnswer && <CheckIcon size={18} />}
              </span>
            </button>
            {showName && (
              <span
                aria-hidden="true"
                className={clsx(
                  'pointer-events-none absolute rounded-full bg-surface/90 px-2 py-0.5 font-display text-sm leading-tight font-bold whitespace-nowrap sm:text-base',
                  LABEL_SIDE[city.labelSide],
                  wasTried && !isAnswer ? 'text-ink-soft' : 'text-ink',
                )}
              >
                {city.name[language]}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
