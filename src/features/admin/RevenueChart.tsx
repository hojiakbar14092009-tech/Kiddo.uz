import { useState } from 'react'
import { formatSom, shortSom, type RevenueBar } from './revenue'

interface RevenueChartProps {
  bars: RevenueBar[]
  /** How a bar's period is named in the tooltip, e.g. “18-okt” or “Oktyabr 2026”. */
  label: (bar: RevenueBar) => string
  /** Short axis tick under some bars. */
  tick: (bar: RevenueBar, index: number) => string | null
}

const HEIGHT = 220
const PAD_LEFT = 44
const PAD_BOTTOM = 26
const PAD_TOP = 12

/** Round the top of the axis to a friendly number. */
function niceMax(value: number): number {
  if (value <= 0) return 100_000
  const step = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / step) * step
}

/**
 * Income per day or per month, one series: thin teal bars on a quiet grid.
 * The current period is gold. Hover (or focus) a bar for its exact sum.
 */
export function RevenueChart({ bars, label, tick }: RevenueChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const max = niceMax(Math.max(...bars.map((bar) => bar.amount)))
  const width = 720
  const plotWidth = width - PAD_LEFT - 8
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const slot = plotWidth / bars.length
  const barWidth = Math.max(4, Math.min(28, slot - 2))
  const grid = [0, 0.5, 1]
  const hovered = active === null ? null : bars[active]

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Daromad grafigi"
        onMouseLeave={() => setActive(null)}
      >
        {grid.map((fraction) => {
          const y = PAD_TOP + plotHeight * (1 - fraction)
          return (
            <g key={fraction}>
              <line
                x1={PAD_LEFT}
                x2={width - 8}
                y1={y}
                y2={y}
                stroke="var(--a-line)"
                strokeDasharray={fraction === 0 ? undefined : '3 5'}
              />
              <text
                x={PAD_LEFT - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="kd-num"
                fontSize="11"
                fill="var(--a-ink-faint)"
              >
                {shortSom(max * fraction)}
              </text>
            </g>
          )
        })}
        {bars.map((bar, index) => {
          const h = (bar.amount / max) * plotHeight
          const x = PAD_LEFT + index * slot + (slot - barWidth) / 2
          const y = PAD_TOP + plotHeight - h
          const current = index === bars.length - 1
          const tickLabel = tick(bar, index)
          return (
            <g key={bar.start.toISOString()}>
              {/* a tall, invisible hit area: easier to hover than the bar itself */}
              <rect
                x={PAD_LEFT + index * slot}
                y={PAD_TOP}
                width={slot}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                aria-label={`${labelFor(bar)}: ${formatSom(bar.amount)} so‘m`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              />
              {bar.amount > 0 && (
                <path
                  d={roundedTop(x, y, barWidth, Math.max(h, 2), Math.min(4, barWidth / 2))}
                  fill={current ? 'var(--a-gold)' : 'var(--a-accent)'}
                  opacity={active === null || active === index ? 1 : 0.45}
                  pointerEvents="none"
                />
              )}
              {tickLabel && (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--a-ink-faint)"
                >
                  {tickLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hovered && active !== null && (
        <div
          role="status"
          className="kd-panel pointer-events-none absolute top-0 z-10 -translate-x-1/2 px-3 py-2 text-sm shadow-lg"
          style={{
            left: `${((PAD_LEFT + active * slot + slot / 2) / width) * 100}%`,
            background: 'var(--a-panel-solid)',
          }}
        >
          <p className="text-[var(--a-ink-soft)]">{label(hovered)}</p>
          <p className="kd-num text-base font-bold">{formatSom(hovered.amount)} so‘m</p>
          <p className="text-xs text-[var(--a-ink-faint)]">{hovered.count} ta to‘lov</p>
        </div>
      )}
    </div>
  )

  function labelFor(bar: RevenueBar) {
    return label(bar)
  }
}

/** A bar with rounded top corners and a square base on the axis. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}
