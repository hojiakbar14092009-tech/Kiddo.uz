import { motion, useReducedMotion } from 'framer-motion'
import { memo, useId } from 'react'
import { GROUND, LIGHT, STYLES, styleOf, type Part, type StyleLook } from './looks'

const GROUND_Y = 124
const W = 200
const H = 160

/**
 * The drawn world of a Kiddo City building at a level (Phase 28): sky and
 * light, distant skyline, the building's own architecture, the ground and
 * its decorations — all from `looks.ts`. Decorative (aria-hidden); the
 * level is told in words by the card.
 */
export const BuildingScene = memo(function BuildingScene({
  buildingId,
  level,
  celebrate,
}: {
  buildingId?: string
  /** Domain level 0–3. */
  level: number
  /** Changes when the building was just upgraded: the new look grows in once. */
  celebrate?: number
}) {
  const reduceMotion = useReducedMotion() ?? false
  const id = useId().replace(/:/g, '')
  const stage = Math.min(Math.max(0, level), 3)
  const look = STYLES[styleOf(buildingId)]
  const light = LIGHT[stage]!
  const parts = stage === 0 ? [] : look.stages[stage - 1]!
  const grow = celebrate !== undefined && !reduceMotion

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 size-full"
      data-stage={stage}
      data-style={styleOf(buildingId)}
    >
      <defs>
        {light.sky && (
          <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={light.sky[0]} />
            <stop offset="1" stopColor={light.sky[1]} />
          </linearGradient>
        )}
        <radialGradient id={`glow-${id}`}>
          <stop offset="0" stopColor="#fff3b0" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff3b0" stopOpacity="0" />
        </radialGradient>
      </defs>

      {light.sky && <rect width={W} height={H} fill={`url(#sky-${id})`} />}
      {light.evening && <Stars />}
      {stage >= 2 && <Skyline evening={light.evening} />}

      <motion.g
        key={celebrate ?? 'still'}
        initial={grow ? { opacity: 0, scaleY: 0.6 } : false}
        animate={grow ? { opacity: 1, scaleY: 1 } : undefined}
        transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ originY: `${GROUND_Y}px`, transformBox: 'view-box' }}
      >
        {parts.map((part, index) => (
          <PartShape key={index} part={part} look={look} evening={light.evening} glow={id} />
        ))}
      </motion.g>

      <GroundShape kind={GROUND[stage]!} evening={light.evening} glow={id} />
    </svg>
  )
})

function Stars() {
  const stars = [
    [18, 14],
    [46, 26],
    [80, 10],
    [122, 20],
    [160, 12],
    [186, 30],
    [104, 34],
  ] as const
  return (
    <g fill="#fff8d6">
      {stars.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.4} />
      ))}
    </g>
  )
}

/** Far buildings: a city behind, from the third level. */
function Skyline({ evening }: { evening: boolean }) {
  const blocks = [
    [0, 26, 40],
    [24, 18, 56],
    [40, 24, 34],
    [62, 16, 48],
    [118, 20, 44],
    [136, 16, 60],
    [150, 26, 38],
    [174, 26, 50],
  ] as const
  return (
    <g fill={evening ? '#4a4f9a' : '#d9cfe8'} opacity={evening ? 0.85 : 0.6}>
      {blocks.map(([x, w, h]) => (
        <rect key={x} x={x} y={GROUND_Y - h} width={w} height={h} rx={2} />
      ))}
    </g>
  )
}

function PartShape({
  part,
  look,
  evening,
  glow,
}: {
  part: Part
  look: StyleLook
  evening: boolean
  glow: string
}) {
  const bottom = GROUND_Y - (part.base ?? 0)
  const top = bottom - part.h
  const wall = part.accent ? look.accent : look.wall
  const stroke = '#00000022'
  const roofH = Math.min(part.w * 0.45, 26)

  if (part.gantry) {
    const rungs = Math.floor(part.h / 12)
    return (
      <g stroke={look.roof} strokeWidth={2} fill="none">
        <line x1={part.x} y1={bottom} x2={part.x} y2={top} />
        <line x1={part.x + part.w} y1={bottom} x2={part.x + part.w} y2={top} />
        {Array.from({ length: rungs }, (_, i) => {
          const y = bottom - (i + 1) * 12
          return (
            <g key={i}>
              <line x1={part.x} y1={y} x2={part.x + part.w} y2={y} />
              <line x1={part.x} y1={y + 12} x2={part.x + part.w} y2={y} />
            </g>
          )
        })}
        <circle cx={part.x + part.w / 2} cy={top} r={2.5} fill={look.accent} stroke="none" />
        {part.flag && <Flag x={part.x + part.w / 2} y={top} color={look.accent} />}
      </g>
    )
  }

  const body =
    part.roof === 'none' ? (
      <rect x={part.x} y={top} width={part.w} height={part.h} fill={wall} stroke={stroke} rx={2} />
    ) : (
      <rect x={part.x} y={top} width={part.w} height={part.h} fill={wall} stroke={stroke} />
    )

  return (
    <g>
      {part.roof === 'glass' ? (
        <path
          d={`M${part.x} ${bottom} V${top + part.h * 0.35} Q${part.x + part.w / 2} ${top - part.h * 0.55} ${part.x + part.w} ${top + part.h * 0.35} V${bottom} Z`}
          fill="#bfe7f2"
          fillOpacity={0.85}
          stroke={look.roof}
          strokeWidth={1.5}
        />
      ) : (
        body
      )}
      {part.roof === 'glass' &&
        Array.from({ length: 3 }, (_, i) => (
          <line
            key={i}
            x1={part.x + ((i + 1) * part.w) / 4}
            y1={bottom}
            x2={part.x + ((i + 1) * part.w) / 4}
            y2={top}
            stroke={look.roof}
            strokeWidth={1}
            opacity={0.6}
          />
        ))}
      <Roof part={part} top={top} roofH={roofH} look={look} />
      {part.columns !== undefined && part.columns > 0 && (
        <g fill="#ffffff" stroke={stroke}>
          {Array.from({ length: part.columns }, (_, i) => {
            const gap = part.w / part.columns!
            return (
              <rect
                key={i}
                x={part.x + gap * i + gap * 0.3}
                y={top + 4}
                width={gap * 0.4}
                height={part.h - 4}
              />
            )
          })}
        </g>
      )}
      {part.windows !== undefined && part.columns === undefined && (
        <Windows part={part} top={top} evening={evening} glow={glow} />
      )}
      {part.flag && (
        <Flag
          x={part.x + part.w / 2}
          y={
            part.roof === 'cone' || part.roof === 'gable'
              ? top - roofH
              : part.roof === 'dome' || part.roof === 'slit-dome'
                ? top - part.w / 2
                : top
          }
          color={look.accent}
        />
      )}
    </g>
  )
}

function Roof({
  part,
  top,
  roofH,
  look,
}: {
  part: Part
  top: number
  roofH: number
  look: StyleLook
}) {
  const { x, w } = part
  switch (part.roof) {
    case 'gable':
      return (
        <polygon
          points={`${x - 3},${top} ${x + w / 2},${top - roofH} ${x + w + 3},${top}`}
          fill={look.roof}
        />
      )
    case 'cone':
      return (
        <polygon
          points={`${x - 2},${top} ${x + w / 2},${top - roofH * 1.4} ${x + w + 2},${top}`}
          fill={part.accent ? look.roof : look.accent}
        />
      )
    case 'dome':
      return (
        <path
          d={`M${x} ${top} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${top} Z`}
          fill={part.accent ? look.roof : look.accent}
        />
      )
    case 'slit-dome':
      return (
        <g>
          <path d={`M${x} ${top} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${top} Z`} fill={look.roof} />
          <rect x={x + w / 2 - 3} y={top - w / 2 + 2} width={6} height={w / 2 - 2} fill="#1d2244" />
        </g>
      )
    case 'saw': {
      const teeth = Math.max(2, Math.round(w / 24))
      const step = w / teeth
      const points = Array.from(
        { length: teeth },
        (_, i) => `${x + i * step},${top} ${x + i * step},${top - 12} ${x + (i + 1) * step},${top}`,
      )
      return <polygon points={`${points.join(' ')}`} fill={look.roof} />
    }
    case 'flat':
      return <rect x={x - 2} y={top - 4} width={w + 4} height={4} fill={look.roof} />
    default:
      return null
  }
}

function Windows({
  part,
  top,
  evening,
  glow,
}: {
  part: Part
  top: number
  evening: boolean
  glow: string
}) {
  const rows = part.windows ?? 0
  const cols = Math.max(1, Math.floor(part.w / 18))
  const rowGap = (part.h - 8) / Math.max(1, rows)
  const colGap = part.w / cols
  return (
    <g>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const cx = part.x + colGap * c + colGap / 2
          const cy = top + 6 + rowGap * r + rowGap / 2
          return (
            <g key={`${r}-${c}`}>
              {evening && <circle cx={cx} cy={cy} r={6} fill={`url(#glow-${glow})`} />}
              <rect
                x={cx - 3.5}
                y={cy - 4}
                width={7}
                height={8}
                rx={3.5}
                fill={evening ? '#ffd76a' : '#9cc3e6'}
              />
            </g>
          )
        }),
      )}
    </g>
  )
}

function Flag({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 14} stroke="#5a4a3a" strokeWidth={1.2} />
      <polygon points={`${x},${y - 14} ${x + 10},${y - 11} ${x},${y - 8}`} fill={color} />
    </g>
  )
}

function GroundShape({
  kind,
  evening,
  glow,
}: {
  kind: 'plot' | 'lawn' | 'path' | 'plaza'
  evening: boolean
  glow: string
}) {
  if (kind === 'plot') {
    return <ellipse cx={100} cy={GROUND_Y + 14} rx={70} ry={14} fill="#e2cfa6" />
  }
  return (
    <g>
      <rect
        x={0}
        y={GROUND_Y}
        width={W}
        height={H - GROUND_Y}
        fill={kind === 'plaza' ? '#7fbf6a' : '#93cf7c'}
      />
      {kind === 'path' && (
        <polygon points={`88,${H} 112,${H} 104,${GROUND_Y} 96,${GROUND_Y}`} fill="#e9d6b0" />
      )}
      {kind === 'plaza' && (
        <g>
          <polygon points={`40,${H} 160,${H} 130,${GROUND_Y} 70,${GROUND_Y}`} fill="#e8e1d3" />
          {[52, 148].map((x) => (
            <g key={x}>
              <line
                x1={x}
                y1={GROUND_Y + 22}
                x2={x}
                y2={GROUND_Y - 4}
                stroke="#4a4a5a"
                strokeWidth={1.6}
              />
              {evening && <circle cx={x} cy={GROUND_Y - 6} r={8} fill={`url(#glow-${glow})`} />}
              <circle cx={x} cy={GROUND_Y - 6} r={2.6} fill={evening ? '#ffe28a' : '#fff6d0'} />
            </g>
          ))}
        </g>
      )}
    </g>
  )
}
