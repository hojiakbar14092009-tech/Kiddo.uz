import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon } from '@/components/icons'
import { Explorer3D } from '@/components/explorer3d'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { ProBadge } from '@/components/ui/ProLock'
import { useProLabel } from '@/components/ui/useProLabel'
import { canUse, useCanUse } from '@/domain/entitlements'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useChildKey } from '@/store/progressStore'
import { BoneShape, DinoFrame, DinoPicture } from './parts'
import { DINO_IDS, DINO_MODELS, DINOS, type DinoId } from './content'
import { fill, useDinoText } from './text'

export const DINO_ROOT = '/worlds/dino'

/**
 * Animals whose every hotspot the child opened, per child, for this visit of
 * the app (shown as a tick on the cards; nothing is stored or rewarded).
 */
const exploredThisVisit = new Map<string, Set<DinoId>>()
function exploredFor(childKey: string): Set<DinoId> {
  let set = exploredThisVisit.get(childKey)
  if (!set) {
    set = new Set()
    exploredThisVisit.set(childKey, set)
  }
  return set
}

// ------------------------------------------------------------------ hub

const CARD =
  'flex items-center gap-4 rounded-panel bg-surface p-4 text-left shadow-press transition-transform active:translate-y-1 sm:flex-col sm:p-6 sm:text-center short:flex-row short:p-3 short:text-left'

/** `/worlds/dino`: the valley with its three activities. */
export function DinoHub() {
  const text = useDinoText()
  const { say } = useLearnMascot()

  useEffect(() => {
    say('greet', { text: text.title, emoji: '🦕' })
  }, [say, text.title])

  const modes = [
    {
      id: 'explore',
      to: `${DINO_ROOT}/explore`,
      picture: <DinoPicture id="triceratops" className="size-full" eager />,
      ...text.modes.explore,
    },
    {
      id: 'dig',
      to: `${DINO_ROOT}/dig`,
      picture: <BoneShape dino="trex" className="size-full p-2" />,
      ...text.modes.dig,
    },
    {
      id: 'quiz',
      to: `${DINO_ROOT}/quiz`,
      picture: <Img3D name="lamp" className="size-full p-2" eager />,
      ...text.modes.quiz,
    },
  ]

  return (
    <DinoFrame back="/home" speak={[text.title, text.intro]}>
      <p className="mx-auto max-w-3xl text-center text-lg text-ink-soft short:hidden">
        {text.intro}
      </p>
      <ul className="mx-auto grid w-full max-w-5xl gap-3 sm:grid-cols-3 sm:gap-5 short:grid-cols-3 short:gap-3">
        {modes.map((mode) => (
          <li key={mode.id} className="min-w-0">
            <Link to={mode.to} className={CARD} data-testid={`dino-mode-${mode.id}`}>
              <span
                aria-hidden="true"
                // a 320 px phone: a smaller picture and no arrow, so the long title fits
                className="flex size-16 shrink-0 items-center justify-center rounded-tile bg-coin-soft min-[380px]:size-20 sm:size-32 short:size-16"
              >
                {mode.picture}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-xl font-extrabold break-words min-[380px]:text-2xl short:text-xl">
                  {mode.title}
                </span>
                <span className="text-base text-ink-soft short:text-sm">{mode.text}</span>
              </span>
              <ChevronRightIcon
                size={28}
                className="ml-auto shrink-0 text-ink-soft max-[379px]:hidden sm:hidden short:block"
              />
            </Link>
          </li>
        ))}
      </ul>
    </DinoFrame>
  )
}

// ------------------------------------------------------------------ list

/** `/worlds/dino/explore`: the six animals; four of them need PRO. */
export function DinoList() {
  const text = useDinoText()
  const navigate = useNavigate()
  const premium = useCanUse('premiumWorlds')
  const proLabel = useProLabel()
  const childKey = useChildKey()
  const explored = exploredFor(childKey)
  const { say } = useLearnMascot()

  useEffect(() => {
    say('instruct', { text: text.explore.choose, emoji: '🦖' })
  }, [say, text.explore.choose])

  const open = (id: DinoId) => {
    // checked again at the moment of opening, never only from the drawn screen
    if (!DINOS[id].free && !canUse('premiumWorlds')) {
      say('locked', { text: text.explore.locked, emoji: '👑' })
      return
    }
    navigate(`${DINO_ROOT}/explore/${id}`)
  }

  return (
    <DinoFrame title={text.modes.explore.title} back={DINO_ROOT} speak={[text.explore.choose]}>
      <ul className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-6 short:grid-cols-6 short:gap-2">
        {DINO_IDS.map((id) => {
          const name = text.dinos[id].name
          const locked = !DINOS[id].free && !premium
          const done = explored.has(id)
          return (
            <li key={id} className="relative">
              <button
                type="button"
                onClick={() => open(id)}
                aria-label={locked ? proLabel(name) : name}
                data-testid={`dino-card-${id}`}
                data-locked={locked ? 'true' : 'false'}
                className={clsx(
                  'flex w-full flex-col items-center gap-1 rounded-card bg-surface p-2 shadow-press transition-transform active:translate-y-1 sm:p-3',
                  locked && 'bg-cream',
                )}
              >
                <span className="relative block aspect-square w-full">
                  <DinoPicture
                    id={id}
                    eager
                    className={clsx('size-full', locked && 'opacity-60 grayscale-[40%]')}
                  />
                  {locked && (
                    <span className="absolute right-1 bottom-1 flex size-10 items-center justify-center rounded-full bg-surface text-ink shadow-press-sm">
                      <LockIcon size={22} />
                    </span>
                  )}
                  {done && (
                    <span
                      className="absolute right-1 bottom-1 flex size-10 items-center justify-center rounded-full bg-primary text-white"
                      title={text.explore.foundShort}
                    >
                      <CheckIcon size={22} />
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-center font-display text-lg font-extrabold short:text-sm">
                  {name}
                </span>
              </button>
              {locked && <ProBadge size="sm" className="top-1! right-1!" />}
            </li>
          )
        })}
      </ul>
    </DinoFrame>
  )
}

// ------------------------------------------------------------------ one animal

/** `/worlds/dino/explore/:dino`: the model to turn, its points and its facts. */
export function DinoDetail({ id }: { id: DinoId }) {
  const text = useDinoText()
  const premium = useCanUse('premiumWorlds')
  const childKey = useChildKey()
  const { say } = useLearnMascot()
  const dino = text.dinos[id]
  const def = DINOS[id]
  const allowed = def.free || premium
  const [active, setActive] = useState<string | null>(null)
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set())
  const allSeen = def.hotspots.every((spot) => seen.has(spot.id))
  const spots: Record<string, { label: string; fact: string } | undefined> = dino.spots
  const spot = active ? spots[active] : undefined

  useEffect(() => {
    if (!allowed) say('locked', { text: text.explore.locked, emoji: '👑' })
    else say('instruct', { text: text.explore.tapPoints, emoji: '👆' })
  }, [allowed, say, text.explore.locked, text.explore.tapPoints])

  const onHotspot = (spotId: string) => {
    setActive(spotId)
    const next = new Set(seen).add(spotId)
    setSeen(next)
    const done = def.hotspots.every((item) => next.has(item.id))
    if (done && !allSeen) {
      exploredFor(childKey).add(id)
      say('celebrate', { text: fill(text.explore.found, { name: dino.name }), emoji: '🏆' })
    }
  }

  if (!allowed) {
    return (
      <DinoFrame title={dino.name} back={`${DINO_ROOT}/explore`} speak={[text.explore.lockedTitle]}>
        <section
          data-testid="dino-locked"
          className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-panel bg-surface p-6 text-center shadow-press-lg short:flex-row short:p-4 short:text-left"
        >
          <span className="relative block size-40 shrink-0 short:size-28">
            <DinoPicture id={id} eager className="size-full opacity-70" />
            <ProBadge />
          </span>
          <div className="flex flex-col items-center gap-3 short:items-start">
            <h2 className="font-display text-2xl font-extrabold">{text.explore.lockedTitle}</h2>
            <p className="text-lg text-ink-soft">{text.explore.lockedText}</p>
            <LinkButton
              to={`${DINO_ROOT}/explore`}
              data-sound="back"
              variant="soft"
              size="md"
              icon={<ChevronLeftIcon size={24} />}
            >
              {text.explore.backToList}
            </LinkButton>
          </div>
        </section>
      </DinoFrame>
    )
  }

  return (
    <DinoFrame
      hideMascotShort
      title={dino.name}
      back={`${DINO_ROOT}/explore`}
      speak={[dino.name, ...dino.facts]}
    >
      {/* one column that never grows past the screen (minmax(0,1fr)); a phone held
          sideways gives the model as much height as there is under the top bar
          (9.5rem: the top bar, the page title row and the frame's padding) */}
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] items-start gap-4 md:grid-cols-2 md:gap-8 short:grid-cols-[auto_minmax(0,1fr)] short:gap-4">
        <div className="mx-auto w-full max-w-md rounded-panel bg-sky-soft p-2 shadow-press sm:p-4 short:w-[calc(100dvh-9.5rem)] short:max-w-none short:p-1">
          <Explorer3D
            model={DINO_MODELS[id]}
            label={dino.name}
            onHotspot={onHotspot}
            activeHotspot={active}
          />
        </div>
        <section className="flex min-w-0 flex-col gap-3" data-testid="dino-facts">
          <div aria-live="polite" data-testid="dino-spot" className="empty:hidden">
            {spot && (
              <div className="rounded-card bg-coin-soft p-4">
                <p className="font-display text-xl font-extrabold">{spot.label}</p>
                <p className="text-lg">{spot.fact}</p>
              </div>
            )}
          </div>
          {allSeen && (
            <p
              data-testid="dino-all-found"
              className="flex items-center gap-2 self-start rounded-full bg-primary-soft px-4 py-2 font-display text-lg font-extrabold text-primary-ink"
            >
              <CheckIcon size={22} />
              {text.explore.foundShort}
            </p>
          )}
          {!def.dinosaur && (
            <p className="self-start rounded-full bg-lilac-soft px-4 py-1.5 font-display text-base font-bold">
              {text.explore.notDino}
            </p>
          )}
          <h2 className="font-display text-2xl font-extrabold short:text-xl">
            {text.explore.facts}
          </h2>
          <ul className="flex flex-col gap-2">
            {dino.facts.map((fact) => (
              <li
                key={fact}
                className="rounded-card bg-surface p-3 text-lg leading-snug shadow-press-sm short:text-base"
              >
                {fact}
              </li>
            ))}
          </ul>
          <LinkButton
            to={`${DINO_ROOT}/explore`}
            data-sound="back"
            variant="soft"
            size="md"
            className="self-start"
            icon={<ChevronLeftIcon size={24} />}
          >
            {text.explore.backToList}
          </LinkButton>
        </section>
      </div>
    </DinoFrame>
  )
}
