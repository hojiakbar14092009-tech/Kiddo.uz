import clsx from 'clsx'
import { Img3D } from '@/components/ui/Img3D'
import type { MedalCollection, Tier } from '@/domain/universe'

/*
 * The medal itself (Phase 30). Prestige changes the medal's shape and
 * material, not only its colour: each tier grows a new silhouette, more
 * detail and depth, and the top tier a glow and a slow shimmer (the glow
 * stays still under reduced motion). Two families: the classic medals (disc → scalloped medal
 * with ribbons → star-burst with laurels) and the Star Paths collection
 * (night tile → tile with an orbit → a whole constellation).
 */

const CLASSIC: Record<Tier, { metal: string; deep: string; light: string }> = {
  bronze: { metal: '#d99a66', deep: '#a8683a', light: '#f3c9a3' },
  silver: { metal: '#b4bec9', deep: '#7d8995', light: '#eef2f6' },
  gold: { metal: '#f2b632', deep: '#c47f12', light: '#ffe79a' },
}

function polygon(points: number, outer: number, inner: number, rotate = -90): string {
  const out: string[] = []
  for (let index = 0; index < points * 2; index++) {
    const radius = index % 2 === 0 ? outer : inner
    const angle = ((rotate + (index * 180) / points) * Math.PI) / 180
    out.push(
      `${(50 + radius * Math.cos(angle)).toFixed(1)},${(50 + radius * Math.sin(angle)).toFixed(1)}`,
    )
  }
  return out.join(' ')
}

function scallop(lobes: number, radius: number, bump: number): string {
  let d = ''
  for (let index = 0; index <= lobes; index++) {
    const angle = (index / lobes) * Math.PI * 2
    const x = 50 + radius * Math.cos(angle)
    const y = 50 + radius * Math.sin(angle)
    d +=
      index === 0
        ? `M${x.toFixed(1)} ${y.toFixed(1)}`
        : ` A${bump} ${bump} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return `${d}Z`
}

const STAR8 = polygon(8, 47, 36)
const SCALLOP = scallop(14, 42, 6)
/** Six corners: three "points" whose inner corners sit on the same circle. */
const HEX = polygon(3, 44, 44)

function ClassicShape({ tier }: { tier: Tier | null }) {
  if (!tier)
    return (
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="6 6"
      />
    )
  const c = CLASSIC[tier]
  if (tier === 'bronze')
    return (
      <>
        <circle cx="50" cy="52" r="40" fill={c.deep} />
        <circle cx="50" cy="50" r="40" fill={c.metal} />
        <circle cx="50" cy="50" r="31" fill={c.light} />
      </>
    )
  if (tier === 'silver')
    return (
      <>
        <path d="M32 78 24 98l12-6 6 10 6-22zm36 0 8 20-12-6-6 10-6-22z" fill="#5a8fd8" />
        <path d={SCALLOP} fill={c.deep} transform="translate(0 2)" />
        <path d={SCALLOP} fill={c.metal} />
        <circle cx="50" cy="50" r="33" fill={c.deep} />
        <circle cx="50" cy="50" r="30" fill={c.light} />
      </>
    )
  return (
    <>
      <circle cx="50" cy="50" r="49" fill={c.light} opacity="0.55" className="medal-glow" />
      <path
        d="M18 78c-8-10-10-24-6-36m70 36c8-10 10-24 6-36"
        fill="none"
        stroke="#4cc069"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="m10 52 6 4m-4-14 7 2m70 8-6 4m4-14-7 2"
        stroke="#4cc069"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <polygon points={STAR8} fill={c.deep} transform="translate(0 2)" />
      <polygon points={STAR8} fill={c.metal} />
      <circle cx="50" cy="50" r="31" fill={c.deep} />
      <circle cx="50" cy="50" r="28" fill={c.light} />
      <circle cx="50" cy="12" r="3.5" fill="#e2574c" />
      <circle cx="88" cy="50" r="3.5" fill="#3c8ee0" />
      <circle cx="12" cy="50" r="3.5" fill="#3c8ee0" />
    </>
  )
}

function StarPathShape({ tier }: { tier: Tier | null }) {
  if (!tier)
    return (
      <polygon
        points={HEX}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="6 6"
      />
    )
  if (tier === 'bronze')
    return (
      <>
        <polygon points={HEX} fill="#1d2a52" />
        <circle cx="50" cy="50" r="27" fill="#2f4378" />
        <circle cx="76" cy="26" r="3" fill="#ffd34d" />
      </>
    )
  if (tier === 'silver')
    return (
      <>
        <polygon points={HEX} fill="#1d2a52" />
        <ellipse
          cx="50"
          cy="50"
          rx="44"
          ry="15"
          fill="none"
          stroke="#9d8af0"
          strokeWidth="3"
          transform="rotate(-20 50 50)"
        />
        <circle cx="50" cy="50" r="27" fill="#3c4f86" />
        <circle cx="16" cy="40" r="3" fill="#ffd34d" />
        <circle cx="84" cy="60" r="3.5" fill="#ffd34d" />
        <circle cx="70" cy="18" r="2.5" fill="#fff" />
      </>
    )
  return (
    <>
      <circle cx="50" cy="50" r="49" fill="#9d8af0" opacity="0.45" className="medal-glow" />
      <polygon points={polygon(6, 48, 40, -90)} fill="#1d2a52" />
      <path
        d="M14 30 30 14 52 8 74 18 88 36"
        fill="none"
        stroke="#ffe79a"
        strokeWidth="2"
        opacity="0.9"
      />
      {[
        [14, 30],
        [30, 14],
        [52, 8],
        [74, 18],
        [88, 36],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="#ffd34d" className="medal-twinkle" />
      ))}
      <circle cx="50" cy="52" r="30" fill="#ffd34d" />
      <circle cx="50" cy="52" r="27" fill="#3c4f86" />
    </>
  )
}

/** A medal at its tier (null: not reached). Decorative: the card names it. */
export function MedalBadge({
  collection,
  tier,
  icon3d,
  className,
}: {
  collection: MedalCollection
  tier: Tier | null
  icon3d: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-medal-tier={tier ?? 'none'}
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center text-line-strong',
        className,
      )}
    >
      <svg viewBox="0 0 100 104" className="absolute inset-0 size-full overflow-visible">
        {collection === 'stars' ? <StarPathShape tier={tier} /> : <ClassicShape tier={tier} />}
      </svg>
      <Img3D
        name={icon3d}
        className={clsx(
          'relative size-[52%]',
          collection === 'stars' && tier && 'translate-y-[2%]',
          !tier && 'opacity-45 grayscale',
        )}
      />
      {tier === 'gold' && (
        <span className="medal-shimmer pointer-events-none absolute inset-[14%] rounded-full" />
      )}
    </span>
  )
}
