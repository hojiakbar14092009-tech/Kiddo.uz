import clsx from 'clsx'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Img3D } from '@/components/ui/Img3D'
import { ProBadge } from '@/components/ui/ProLock'
import { useProLabel } from '@/components/ui/useProLabel'
import { useCanUse } from '@/domain/entitlements'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { SPEAK_PRIORITY, useSpeakable } from '@/features/learn/speakable'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { useLanguage } from '@/store/settingsStore'
import { canOpen, isPremium, itemRoute, type UzItem } from './access'
import { FoodArt, MotifArt } from './art'
import { EXPLORE, EXPLORE_IDS, isLandmark, stillName, type ExploreId } from './content'
import { GAME_KINDS, type GameKind } from './generators'
import { MapShape } from './UzMap'

const GAME_TINT: Record<GameKind, string> = {
  map: 'bg-sky-soft',
  table: 'bg-coin-soft',
  patterns: 'bg-lilac-soft',
}

const EXPLORE_TINTS = ['bg-sky-soft', 'bg-primary-soft', 'bg-coin-soft', 'bg-girl-soft'] as const

function gameArt(kind: GameKind): ReactNode {
  if (kind === 'map') return <MapShape className="size-full" />
  if (kind === 'table') {
    return (
      <span className="flex size-full items-center justify-center gap-1">
        <FoodArt id="non" className="h-full max-h-16 w-auto" />
        <FoodArt id="choy" className="h-full max-h-16 w-auto" />
      </span>
    )
  }
  return (
    <span className="flex size-full items-center justify-center gap-0.5">
      {(['rosette', 'ikat', 'rosette'] as const).map((id, index) => (
        <MotifArt key={index} id={id} className="h-full max-h-12 w-auto" />
      ))}
    </span>
  )
}

function exploreArt(id: ExploreId): ReactNode {
  return (
    <Img3D
      name={isLandmark(id) ? stillName(id) : (EXPLORE[id].picture ?? 'sparkles')}
      className={clsx('size-full', !isLandmark(id) && 'p-3')}
    />
  )
}

/** The world's front page: the games and the explore cards, free and PRO side by side. */
export function UzHub() {
  const { t } = useTranslation()
  const language = useLanguage()
  const navigate = useNavigate()
  const pro = useCanUse('premiumWorlds')
  const proLabel = useProLabel()
  const { react, reset } = useMascot()
  const mascotRow = useRef<HTMLDivElement>(null)
  const prompt = t('uzbekistan.hubPrompt')

  useSpeakable([prompt], SPEAK_PRIORITY.page)

  useEffect(() => {
    react('instruct', { text: prompt, emoji: '🧭' }, { speak: false })
    return reset
  }, [prompt, react, reset])

  /** Premium items: asked again right before opening; without PRO the robot explains. */
  const open = (item: UzItem) => {
    if (canOpen(item)) {
      navigate(itemRoute(item))
      return
    }
    react('locked', { text: t('uzbekistan.locked'), emoji: '👑' }, { speak: false })
    mascotRow.current?.scrollIntoView?.({ block: 'nearest' })
  }

  const tile = (item: UzItem, title: string, sub: string, art: ReactNode, tint: string) => {
    const premium = isPremium(item)
    const locked = premium && !pro
    const testId = `uz-${item.type}-${item.id}`
    const game = item.type === 'game'
    const body = (
      <>
        <span
          aria-hidden="true"
          className={clsx(
            'flex items-center justify-center overflow-hidden rounded-tile p-2',
            game
              ? 'h-20 w-24 shrink-0 min-[480px]:h-28 min-[480px]:w-full lg:h-36 short:h-16 short:w-full'
              : 'h-24 w-full sm:h-32 lg:h-36 short:h-16',
            tint,
            locked && 'opacity-70',
          )}
        >
          {art}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 px-1">
          <span className="font-display text-lg leading-tight font-extrabold sm:text-xl short:text-base">
            {title}
          </span>
          <span className="text-sm leading-snug text-ink-soft sm:text-base short:hidden">
            {sub}
          </span>
        </span>
      </>
    )
    const className = clsx(
      'relative flex h-full w-full gap-2 rounded-card bg-surface p-2 text-left shadow-press transition-transform active:translate-y-1 sm:p-3 short:flex-col short:items-stretch short:gap-1 short:p-1.5',
      game ? 'flex-row items-center min-[480px]:flex-col min-[480px]:items-stretch' : 'flex-col',
    )
    return (
      <li key={testId}>
        {premium ? (
          <button
            type="button"
            onClick={() => open(item)}
            aria-label={locked ? proLabel(title) : title}
            data-testid={testId}
            data-locked={locked}
            className={className}
          >
            {body}
            {locked && <ProBadge size="sm" />}
          </button>
        ) : (
          <Link to={itemRoute(item)} data-testid={testId} className={className}>
            {body}
          </Link>
        )}
      </li>
    )
  }

  return (
    <Screen header={<TitleTopBar title={t('uzbekistan.title')} back="/adventure" />}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-3 pb-8 sm:gap-6 sm:px-6 short:gap-2 short:py-2">
        <div ref={mascotRow} className="flex items-center gap-3 short:gap-2">
          <Mascot
            robotClassName="w-[56px] sm:w-20 short:w-10"
            className="min-w-0 flex-1"
            talkOnlyWhileSpeaking
          />
          <SpeakButton fallback={[prompt]} />
        </div>

        <section aria-labelledby="uz-games" className="flex flex-col gap-2">
          <h2 id="uz-games" className="font-display text-2xl font-extrabold short:text-lg">
            {t('uzbekistan.gamesTitle')}
          </h2>
          <ul className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-3 sm:gap-4 short:grid-cols-3">
            {GAME_KINDS.map((kind) =>
              tile(
                { type: 'game', id: kind },
                t(`uzbekistan.games.${kind}.title`),
                t(`uzbekistan.games.${kind}.hint`),
                gameArt(kind),
                GAME_TINT[kind],
              ),
            )}
          </ul>
        </section>

        <section aria-labelledby="uz-explore" className="flex flex-col gap-2">
          <h2 id="uz-explore" className="font-display text-2xl font-extrabold short:text-lg">
            {t('uzbekistan.exploreTitle')}
          </h2>
          <ul className="grid grid-cols-2 gap-2 min-[560px]:grid-cols-4 sm:gap-4 short:grid-cols-4">
            {EXPLORE_IDS.map((id, index) =>
              tile(
                { type: 'explore', id },
                EXPLORE[id].name[language],
                EXPLORE[id].tag[language],
                exploreArt(id),
                EXPLORE_TINTS[index % EXPLORE_TINTS.length]!,
              ),
            )}
          </ul>
        </section>
      </div>
    </Screen>
  )
}
