import clsx from 'clsx'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { ACTIVITY_LESSONS } from '@/domain/learning'
import { LessonDeck, type LessonCheck, type LessonCard } from '@/features/learn/LessonDeck'
import { useLanguage } from '@/store/settingsStore'
import { MotifArt, PictureView, TableItemArt } from './art'
import {
  CITIES,
  CITY_IDS,
  FOOD_IDS,
  FOODS,
  MOTIF_IDS,
  MOTIF_NAMES,
  OTHER_IDS,
  OTHERS,
  type CityId,
} from './content'
import type { GameKind } from './generators'
import { cityPoint, LABEL_SIDE, MAP_HEIGHT, MAP_WIDTH } from './geo'
import { GameHeader } from './run'
import { MapShape } from './UzMap'

/*
 * Learn Before Play for the three "My Uzbekistan" games (Phase 21): the
 * labelled map city by city, what goes on the dasturxon, and how a border
 * pattern repeats. Shown before the first game and whenever the child asks.
 */

const GAME_LESSON: Readonly<Record<GameKind, string>> = {
  map: ACTIVITY_LESSONS.uzMap,
  table: ACTIVITY_LESSONS.uzTable,
  patterns: ACTIVITY_LESSONS.uzPatterns,
}

/** The map with every city and its name; one city stands out. Pictures only, no buttons. */
function LessonMap({ focus }: { focus: CityId | null }) {
  const language = useLanguage()
  return (
    <div className="relative aspect-[790/520] w-full" data-testid="lesson-map">
      <MapShape className="absolute inset-0 size-full" />
      {CITY_IDS.map((id) => {
        const { x, y } = cityPoint(id)
        const city = CITIES[id]
        const on = focus === null || focus === id
        return (
          <div
            key={id}
            className="absolute size-8 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(x / MAP_WIDTH) * 100}%`, top: `${(y / MAP_HEIGHT) * 100}%` }}
          >
            <span
              className={clsx(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white',
                focus === id ? 'size-8 bg-primary shadow-press-primary' : 'size-5 bg-oops',
                !on && 'opacity-50',
              )}
            />
            {on && (
              <span
                className={clsx(
                  'pointer-events-none absolute rounded-full bg-surface/90 px-2 py-0.5 font-display text-xs leading-tight font-bold whitespace-nowrap sm:text-sm',
                  LABEL_SIDE[city.labelSide],
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

function useUzLessonCards(kind: GameKind): LessonCard[] {
  const { t } = useTranslation()
  const language = useLanguage()
  return useMemo(() => {
    switch (kind) {
      case 'map':
        return [
          {
            id: 'map',
            art: <LessonMap focus={null} />,
            title: t('learnFirst.mapTitle'),
            lines: [t('learnFirst.mapLine', { count: CITY_IDS.length })],
          },
          ...CITY_IDS.map((id) => ({
            id,
            art: (
              <div className="flex w-full flex-col items-center gap-2">
                <LessonMap focus={id} />
                <PictureView picture={CITIES[id].picture} className="size-16 short:size-10" />
              </div>
            ),
            title: CITIES[id].name[language],
            lines: [CITIES[id].clue[language]],
            thumb: <PictureView picture={CITIES[id].picture} className="size-full" />,
          })),
        ]
      case 'table':
        return [
          ...FOOD_IDS.map((id) => ({
            id,
            art: <TableItemArt id={id} className="size-32 sm:size-40 short:size-24" />,
            title: FOODS[id].label[language],
            lines: [t(`learnFirst.foodGroup.${FOODS[id].group}`)],
          })),
          {
            id: 'not-food',
            art: (
              <div className="grid grid-cols-3 gap-2">
                {OTHER_IDS.slice(0, 3).map((id) => (
                  <TableItemArt key={id} id={id} className="size-20 sm:size-24 short:size-14" />
                ))}
              </div>
            ),
            title: t('learnFirst.notFood'),
            lines: [
              OTHER_IDS.map((id) => OTHERS[id].label[language]).join(', '),
              t('learnFirst.notFoodLine'),
            ],
          },
        ]
      case 'patterns': {
        const [a, b] = MOTIF_IDS
        const name = (id: (typeof MOTIF_IDS)[number]) => MOTIF_NAMES[id][language]
        return [
          {
            id: 'repeat',
            art: (
              <div className="flex items-center gap-1">
                {[a, b, a, b, a].map((id, i) => (
                  <MotifArt
                    key={i}
                    id={id}
                    className={clsx(
                      'size-12 sm:size-16 short:size-10',
                      i === 4 && 'motion-safe:animate-pulse',
                    )}
                  />
                ))}
              </div>
            ),
            title: t('learnFirst.patternTitle'),
            lines: [t('learnFirst.patternLine', { a: name(a), b: name(b) })],
          },
          ...MOTIF_IDS.map((id) => ({
            id,
            art: <MotifArt id={id} className="size-28 sm:size-36 short:size-20" />,
            title: name(id),
            lines: [t('learnFirst.motifLine', { name: name(id) })],
          })),
        ]
      }
    }
  }, [kind, language, t])
}

/** The check at the end of each lesson: two clearly different things (the whole map is not one). */
const CHECKS: Partial<Record<GameKind, LessonCheck>> = {
  map: { ask: CITY_IDS[0]!, other: CITY_IDS[1]! },
  patterns: { ask: MOTIF_IDS[0]!, other: MOTIF_IDS[1]! },
}

/** The game's lesson, on the game's own screen. */
export function UzLesson({ kind, onDone }: { kind: GameKind; onDone: () => void }) {
  const cards = useUzLessonCards(kind)
  return (
    <Screen header={<GameHeader kind={kind} />}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-4 short:py-2">
        <LessonDeck
          lessonId={GAME_LESSON[kind]}
          cards={cards}
          check={CHECKS[kind]}
          onDone={onDone}
        />
      </div>
    </Screen>
  )
}
