import clsx from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import type { PlantFamily, PlantLook, PlantStage } from '@/domain/garden'

/*
 * The plants of the Mistake Garden, drawn as small SVG (no images, no 3D):
 * six families, four stages each, so a seed, a sprout, a growing plant and a
 * flower look clearly different and two skills rarely look the same. Every
 * part is drawn around its own base (local 0 0), so the growth sequence in
 * garden.css can raise a stem, unfold a leaf or open a flower from there.
 */

/** Base of the plant in the picture (the top of the soil); the view is cropped to 100 × 125 around it. */
const BASE_X = 60
const BASE_Y = 124

type LeafShape = 'round' | 'long' | 'heart' | 'gem'

const LEAF_PATH: Record<LeafShape, string> = {
  round: 'M0 0 C6 -10 21 -11 27 -2 C21 7 7 6 0 0Z',
  long: 'M0 0 C10 -6 29 -7 40 -1 C28 4 10 4 0 0Z',
  heart: 'M0 0 C2 -9 12 -13 17 -6 C21 -12 29 -7 27 0 C23 7 9 8 0 0Z',
  gem: 'M0 0 L11 -7 L26 0 L11 7Z',
}

function Leaf({
  x = 0,
  y,
  angle,
  size = 1,
  shape = 'round',
}: {
  x?: number
  y: number
  angle: number
  size?: number
  shape?: LeafShape
}) {
  const gem = shape === 'gem'
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${size})`}>
      <g className="pa-leaf">
        <path
          d={LEAF_PATH[shape]}
          fill={gem ? 'var(--g-petal)' : 'var(--g-leaf)'}
          fillOpacity={gem ? 0.85 : 1}
          stroke={gem ? 'var(--g-petal-deep)' : 'var(--g-leaf-deep)'}
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        {!gem && (
          <path
            d={shape === 'long' ? 'M3 0 L32 -1' : 'M3 0 L20 -1'}
            stroke="var(--g-leaf-deep)"
            strokeWidth={1}
            strokeOpacity={0.45}
            strokeLinecap="round"
          />
        )}
        {gem && <path d="M3 0 L11 -5 L20 0" fill="#fff" fillOpacity={0.45} />}
      </g>
    </g>
  )
}

function Stem({
  height,
  width = 4,
  bend = 5,
  color = 'var(--g-stem)',
}: {
  height: number
  width?: number
  bend?: number
  color?: string
}) {
  return (
    <path
      className="pa-stem"
      d={`M0 0 C${bend} ${-height * 0.35} ${-bend} ${-height * 0.7} 0 ${-height}`}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      fill="none"
    />
  )
}

/** Something at the top of the stem that opens on its own base. */
function Head({ y, children }: { y: number; children: ReactNode }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <g className="pa-head">{children}</g>
    </g>
  )
}

function Petals({
  count,
  length,
  width,
  color,
}: {
  count: number
  length: number
  width: number
  color: string
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <ellipse
          key={i}
          cx={0}
          cy={-length / 2}
          rx={width}
          ry={length / 2}
          fill={color}
          stroke="var(--g-petal-deep)"
          strokeWidth={0.8}
          transform={`rotate(${(360 / count) * i})`}
        />
      ))}
    </>
  )
}

function Sparkles() {
  const points = [
    [-26, -6],
    [24, -14],
    [-14, -30],
    [18, 12],
    [0, -36],
  ] as const
  return (
    <g className="pa-spark" aria-hidden="true">
      {points.map(([x, y], i) => (
        <path
          key={i}
          d="M0 -4 L1.2 -1.2 L4 0 L1.2 1.2 L0 4 L-1.2 1.2 L-4 0 L-1.2 -1.2Z"
          transform={`translate(${x} ${y})`}
          fill="var(--g-center)"
        />
      ))}
    </g>
  )
}

// ---------------------------------------------------------------- stages

function Seed({ family }: { family: PlantFamily }) {
  return (
    <>
      <circle className="pa-glow" cx={0} cy={-4} r={12} fill="var(--g-petal)" opacity={0.45} />
      <g className="pa-seed">
        {family === 'crystal' ? (
          <path
            d="M0 -14 L7 -6 L0 2 L-7 -6Z"
            fill="var(--g-petal)"
            stroke="var(--g-petal-deep)"
            strokeWidth={1.2}
          />
        ) : (
          <>
            <ellipse cx={0} cy={-4} rx={8} ry={6.5} fill="var(--g-seed)" />
            <ellipse cx={-2.5} cy={-6.5} rx={2.6} ry={1.6} fill="#fff" opacity={0.35} />
          </>
        )}
      </g>
    </>
  )
}

function Sprout({ family }: { family: PlantFamily }) {
  switch (family) {
    case 'cactus':
      return (
        <>
          <rect
            className="pa-stem"
            x={-7}
            y={-20}
            width={14}
            height={20}
            rx={7}
            fill="var(--g-cactus)"
          />
          <rect
            className="pa-stem"
            x={-2}
            y={-17}
            width={3}
            height={13}
            rx={1.5}
            fill="var(--g-cactus-light)"
          />
        </>
      )
    case 'tree':
      return (
        <>
          <Stem height={20} width={4} bend={2} color="var(--g-trunk)" />
          <Leaf y={-18} angle={-150} size={0.75} />
          <Leaf y={-20} angle={-35} size={0.8} />
        </>
      )
    case 'leaf':
      return (
        <>
          <Leaf y={-1} angle={-115} size={0.6} shape="long" />
          <Leaf y={-1} angle={-70} size={0.62} shape="long" />
        </>
      )
    case 'crystal':
      return (
        <>
          <Stem height={20} width={3} bend={3} />
          <Leaf y={-14} angle={-150} size={0.7} shape="gem" />
          <Leaf y={-18} angle={-30} size={0.7} shape="gem" />
        </>
      )
    case 'vine':
      return (
        <>
          <path
            className="pa-stem"
            d="M0 0 C-6 -8 7 -14 1 -24"
            stroke="var(--g-stem)"
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
          <Leaf x={-1} y={-12} angle={-160} size={0.65} shape="heart" />
          <Leaf x={1} y={-22} angle={-25} size={0.7} shape="heart" />
        </>
      )
    case 'flower':
      return (
        <>
          <Stem height={22} />
          <Leaf y={-18} angle={-150} size={0.8} />
          <Leaf y={-20} angle={-30} size={0.8} />
        </>
      )
  }
}

function Growing({ family }: { family: PlantFamily }) {
  switch (family) {
    case 'cactus':
      return (
        <>
          <rect
            className="pa-stem"
            x={-11}
            y={-52}
            width={22}
            height={52}
            rx={11}
            fill="var(--g-cactus)"
          />
          <path
            className="pa-leaf"
            d="M10 -22 h6 a6 6 0 0 0 6 -6 v-10 a5 5 0 0 1 10 0 v10 a16 16 0 0 1 -16 16 h-6Z"
            fill="var(--g-cactus)"
          />
          <rect
            className="pa-stem"
            x={-3}
            y={-46}
            width={4}
            height={38}
            rx={2}
            fill="var(--g-cactus-light)"
          />
          <Head y={-52}>
            <ellipse cx={0} cy={-3} rx={5} ry={6} fill="var(--g-petal-deep)" />
          </Head>
        </>
      )
    case 'tree':
      return (
        <>
          <Stem height={42} width={6} bend={2} color="var(--g-trunk)" />
          <Leaf y={-22} angle={-160} size={0.7} />
          <Head y={-46}>
            <circle cx={-9} cy={2} r={12} fill="var(--g-leaf)" />
            <circle cx={9} cy={2} r={12} fill="var(--g-leaf)" />
            <circle cx={0} cy={-8} r={14} fill="var(--g-leaf-light)" />
          </Head>
        </>
      )
    case 'leaf':
      return (
        <>
          {[-155, -125, -90, -55, -25].map((angle, i) => (
            <Leaf key={angle} y={-1} angle={angle} size={i === 2 ? 1.3 : 1.05} shape="long" />
          ))}
        </>
      )
    case 'crystal':
      return (
        <>
          <Stem height={50} width={3.5} bend={4} />
          <Leaf y={-18} angle={-155} size={0.85} shape="gem" />
          <Leaf y={-24} angle={-25} size={0.85} shape="gem" />
          <Leaf y={-36} angle={-145} size={0.7} shape="gem" />
          <Head y={-50}>
            <path
              d="M0 -14 L8 -5 L0 4 L-8 -5Z"
              fill="var(--g-petal)"
              stroke="var(--g-petal-deep)"
              strokeWidth={1.2}
            />
          </Head>
        </>
      )
    case 'vine':
      return (
        <>
          <path d="M-3 2 L-3 -62" stroke="var(--g-trunk)" strokeWidth={3} strokeLinecap="round" />
          <path
            className="pa-stem"
            d="M0 0 C-14 -10 10 -18 -4 -28 C-16 -36 8 -46 -2 -56"
            stroke="var(--g-stem)"
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
          <Leaf x={-4} y={-12} angle={-170} size={0.75} shape="heart" />
          <Leaf x={2} y={-26} angle={-15} size={0.8} shape="heart" />
          <Leaf x={-6} y={-40} angle={-165} size={0.7} shape="heart" />
          <Leaf x={0} y={-54} angle={-30} size={0.65} shape="heart" />
        </>
      )
    case 'flower':
      return (
        <>
          <Stem height={54} />
          <Leaf y={-16} angle={-160} size={1} />
          <Leaf y={-20} angle={-22} size={1} />
          <Leaf y={-36} angle={-145} size={0.8} />
          <Head y={-54}>
            <path d="M-6 0 Q0 -6 6 0" fill="var(--g-leaf)" />
            <ellipse cx={0} cy={-8} rx={7} ry={10} fill="var(--g-petal-deep)" />
            <ellipse cx={-2} cy={-11} rx={2} ry={4} fill="#fff" opacity={0.3} />
          </Head>
        </>
      )
  }
}

function Bloom({ family }: { family: PlantFamily }) {
  switch (family) {
    case 'cactus':
      return (
        <>
          <rect
            className="pa-stem"
            x={-12}
            y={-62}
            width={24}
            height={62}
            rx={12}
            fill="var(--g-cactus)"
          />
          <path
            className="pa-leaf"
            d="M11 -24 h7 a6 6 0 0 0 6 -6 v-12 a5 5 0 0 1 10 0 v12 a16 16 0 0 1 -16 16 h-7Z"
            fill="var(--g-cactus)"
          />
          <path
            className="pa-leaf"
            d="M-11 -34 h-6 a5 5 0 0 1 -5 -5 v-8 a5 5 0 0 0 -10 0 v8 a15 15 0 0 0 15 15 h6Z"
            fill="var(--g-cactus)"
          />
          <rect
            className="pa-stem"
            x={-3}
            y={-56}
            width={4}
            height={46}
            rx={2}
            fill="var(--g-cactus-light)"
          />
          <Head y={-62}>
            <Petals count={6} length={18} width={6} color="var(--g-petal)" />
            <circle r={5} fill="var(--g-center)" />
            <Sparkles />
          </Head>
        </>
      )
    case 'tree':
      return (
        <>
          <Stem height={52} width={7} bend={2} color="var(--g-trunk)" />
          <Head y={-58}>
            <circle cx={-16} cy={6} r={15} fill="var(--g-leaf-deep)" />
            <circle cx={16} cy={6} r={15} fill="var(--g-leaf-deep)" />
            <circle cx={-9} cy={-8} r={17} fill="var(--g-leaf)" />
            <circle cx={10} cy={-8} r={17} fill="var(--g-leaf)" />
            <circle cx={0} cy={-18} r={15} fill="var(--g-leaf-light)" />
            {[
              [-14, 0],
              [12, -2],
              [-4, -14],
              [16, -16],
              [-18, -16],
            ].map(([x, y]) => (
              <circle
                key={`${x}${y}`}
                cx={x}
                cy={y}
                r={4.2}
                fill="var(--g-petal)"
                stroke="var(--g-petal-deep)"
                strokeWidth={0.8}
              />
            ))}
            <Sparkles />
          </Head>
        </>
      )
    case 'leaf':
      return (
        <>
          {[-165, -140, -115, -90, -65, -40, -15].map((angle, i) => (
            <Leaf key={angle} y={-1} angle={angle} size={i === 3 ? 1.35 : 1.15} shape="long" />
          ))}
          <Head y={-40}>
            <circle
              cx={-6}
              cy={0}
              r={5}
              fill="var(--g-petal)"
              stroke="var(--g-petal-deep)"
              strokeWidth={0.8}
            />
            <circle
              cx={5}
              cy={-4}
              r={5}
              fill="var(--g-petal)"
              stroke="var(--g-petal-deep)"
              strokeWidth={0.8}
            />
            <circle
              cx={1}
              cy={6}
              r={4.5}
              fill="var(--g-petal)"
              stroke="var(--g-petal-deep)"
              strokeWidth={0.8}
            />
            <Sparkles />
          </Head>
        </>
      )
    case 'crystal':
      return (
        <>
          <Stem height={58} width={3.5} bend={4} />
          <Leaf y={-18} angle={-155} size={0.95} shape="gem" />
          <Leaf y={-24} angle={-25} size={0.95} shape="gem" />
          <Leaf y={-38} angle={-150} size={0.75} shape="gem" />
          <Head y={-62}>
            <circle r={20} fill="var(--g-petal)" opacity={0.22} />
            {Array.from({ length: 6 }, (_, i) => (
              <path
                key={i}
                d="M0 0 L5 -9 L0 -22 L-5 -9Z"
                fill="var(--g-petal)"
                fillOpacity={0.9}
                stroke="var(--g-petal-deep)"
                strokeWidth={1}
                transform={`rotate(${i * 60})`}
              />
            ))}
            <path d="M0 -6 L5 0 L0 6 L-5 0Z" fill="#fff" />
            <Sparkles />
          </Head>
        </>
      )
    case 'vine':
      return (
        <>
          <path d="M-3 2 L-3 -70" stroke="var(--g-trunk)" strokeWidth={3} strokeLinecap="round" />
          <path
            className="pa-stem"
            d="M0 0 C-16 -10 12 -20 -4 -32 C-18 -42 10 -52 -2 -66"
            stroke="var(--g-stem)"
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
          <Leaf x={-4} y={-12} angle={-170} size={0.85} shape="heart" />
          <Leaf x={3} y={-28} angle={-15} size={0.9} shape="heart" />
          <Leaf x={-7} y={-44} angle={-165} size={0.8} shape="heart" />
          <Head y={-66}>
            {[
              [-12, 6],
              [10, 2],
              [0, -6],
            ].map(([x, y]) => (
              <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
                <path
                  d="M-6 0 Q-6 -9 0 -9 Q6 -9 6 0 L4 4 L0 1 L-4 4Z"
                  fill="var(--g-petal)"
                  stroke="var(--g-petal-deep)"
                  strokeWidth={0.8}
                />
              </g>
            ))}
            <Sparkles />
          </Head>
        </>
      )
    case 'flower':
      return (
        <>
          <Stem height={62} />
          <Leaf y={-16} angle={-160} size={1.05} />
          <Leaf y={-22} angle={-22} size={1.05} />
          <Leaf y={-40} angle={-148} size={0.85} />
          <Head y={-64}>
            <Petals count={8} length={26} width={7} color="var(--g-petal)" />
            <g transform="rotate(22.5)">
              <Petals count={8} length={16} width={5} color="var(--g-petal-deep)" />
            </g>
            <circle r={7.5} fill="var(--g-center)" />
            <circle cx={-2} cy={-2} r={2} fill="#fff" opacity={0.6} />
            <Sparkles />
          </Head>
        </>
      )
  }
}

function Soil() {
  return (
    <g className="pa-soil">
      <ellipse cx={0} cy={16} rx={44} ry={6} fill="#2f8a57" opacity={0.16} />
      <path d="M-44 4 Q-38 -9 0 -9 Q38 -9 44 4 Q38 15 0 15 Q-38 15 -44 4Z" fill="var(--g-soil)" />
      <ellipse cx={0} cy={-3} rx={32} ry={5} fill="var(--g-soil-top)" />
      <path
        d="M-44 4 Q-38 15 0 15 Q38 15 44 4 Q36 10 0 10 Q-36 10 -44 4Z"
        fill="var(--g-soil-deep)"
      />
      <ellipse cx={-24} cy={2} rx={3} ry={2} fill="#d9c3a5" />
      <ellipse cx={27} cy={5} rx={2.4} ry={1.6} fill="#d9c3a5" />
    </g>
  )
}

export interface PlantArtProps {
  look: PlantLook
  stage: PlantStage
  /** Plays the growth sequence once (a stage the child has not seen yet). */
  growing?: boolean
  /** Gentle leaf sway (the garden scene; not in a dialog). */
  sway?: boolean
  /** Desynchronises the sway of neighbouring plants (seconds). */
  swayDelay?: number
  className?: string
}

/** One plant on its patch of soil. Decorative: the patch around it names the skill and the stage. */
export function PlantArt({
  look,
  stage,
  growing = false,
  sway = false,
  swayDelay = 0,
  className,
}: PlantArtProps) {
  const flip = look.mirrored ? ' scale(-1 1)' : ''
  // small stages are drawn a little larger, so a seed is never a speck on a phone
  const zoom = stage === 'seed' ? ' scale(1.35)' : stage === 'sprout' ? ' scale(1.2)' : ''
  const swayStyle: CSSProperties | undefined = sway
    ? { animationDelay: `${-swayDelay}s` }
    : undefined
  const swaying = sway && (stage === 'plant' || stage === 'bloom')
  return (
    <svg
      viewBox="10 26 100 125"
      aria-hidden="true"
      focusable="false"
      data-hue={look.hue}
      data-family={look.family}
      className={clsx('garden-art', growing && 'is-growing', className)}
    >
      <g transform={`translate(${BASE_X} ${BASE_Y})`}>
        <Soil />
        <g className="pa-plant">
          <g className={swaying ? 'pa-sway' : undefined} style={swaying ? swayStyle : undefined}>
            <g transform={`translate(0 -2)${zoom}${flip}`}>
              {stage === 'seed' && <Seed family={look.family} />}
              {stage === 'sprout' && <Sprout family={look.family} />}
              {stage === 'plant' && <Growing family={look.family} />}
              {stage === 'bloom' && <Bloom family={look.family} />}
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}
