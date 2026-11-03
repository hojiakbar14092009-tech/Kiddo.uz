import clsx from 'clsx'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Img3D } from '@/components/ui/Img3D'
import { useWorld } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'
import { FitWords } from '@/components/ui/FitWords'

/** A titled group of places in a section. */
export function PlaceGroup({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex w-full max-w-4xl flex-col gap-4">
      <h2 id={id} className="font-display text-2xl font-extrabold sm:text-3xl">
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">{children}</ul>
    </section>
  )
}

/** One place to go: a big picture and its name (and a short line, e.g. what opens it). */
export function PlaceCard({
  to,
  label,
  picture,
  detail,
  tint = 'bg-sky-soft',
  locked = false,
}: {
  to: string
  label: string
  picture: ReactNode
  detail?: string
  tint?: string
  locked?: boolean
}) {
  const detailId = useId()
  const body = (
    <>
      <span
        aria-hidden="true"
        className={clsx(
          'flex size-20 items-center justify-center rounded-3xl sm:size-28',
          tint,
          locked && 'opacity-60 grayscale',
        )}
      >
        {picture}
      </span>
      <FitWords
        text={label}
        className="text-center font-display text-lg leading-tight font-bold sm:text-2xl"
      />
      {detail && (
        <span id={detailId} className="text-center text-sm text-ink-soft sm:text-base">
          {detail}
        </span>
      )}
    </>
  )
  const frame =
    'flex h-full min-h-44 flex-col items-center justify-center gap-2 rounded-[28px] bg-surface p-3 shadow-[0_7px_0_var(--color-line)] sm:gap-3 sm:p-5'
  // a place not opened yet is still a door: its page says what opens it
  return (
    <li>
      <Link
        to={to}
        aria-label={label}
        aria-describedby={detail ? detailId : undefined}
        data-locked={locked || undefined}
        className={clsx(frame, 'transition-transform active:translate-y-1')}
      >
        {body}
      </Link>
    </li>
  )
}

const TINTS = [
  'bg-sky-soft',
  'bg-coin-soft',
  'bg-lilac-soft',
  'bg-primary-soft',
  'bg-girl-soft',
] as const

/** Kiddo City's buildings as places of a section, by id, in this order. */
export function BuildingPlaces({ ids }: { ids: readonly string[] }) {
  const { t } = useTranslation()
  const { buildings } = useWorld()
  return (
    <>
      {ids.map((id, index) => {
        const building = buildings.find((item) => item.id === id)
        if (!building) return null
        return (
          <PlaceCard
            key={id}
            to={building.route}
            label={tDynamic(t, building.nameKey)}
            picture={<Img3D name={building.icon3d} className="size-[72%]" />}
            tint={TINTS[index % TINTS.length]}
            locked={building.locked}
            detail={building.locked ? tDynamic(t, `city.opensWith.${building.id}`) : undefined}
          />
        )
      })}
    </>
  )
}
