import type { ReactNode } from 'react'
import {
  A4,
  COUNT_CHOICES,
  COUNT_ROWS,
  SHEET_NUMBERS,
  type CountShape,
  type SheetKind,
  type SheetLetter,
} from './sheets'

const FONT = 'Nunito, Rubik, Arial, sans-serif'
const INK = '#2B2B2B'
const GUIDE = '#C9CED6'
const DASH = { fill: 'none', stroke: '#8A93A0', strokeWidth: 0.4, strokeDasharray: '1.3 1' }
const MARGIN = 12
const TOP = 46
const BOTTOM = A4.height - 14

interface Texts {
  title: string
  task: string
  nameLabel: string
  name: string
}

/** Thin writing lines for one row: top, middle (dotted) and the base line. */
function Guides({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return (
    <g stroke={GUIDE} strokeWidth={0.25}>
      <line x1={x} x2={x + width} y1={y} y2={y} />
      <line x1={x} x2={x + width} y1={y + height / 2} y2={y + height / 2} strokeDasharray="1 1.5" />
      <line x1={x} x2={x + width} y1={y + height} y2={y + height} strokeWidth={0.4} />
    </g>
  )
}

function Letters({ letters }: { letters: readonly SheetLetter[] }) {
  const columns = 3
  const rows = Math.ceil(letters.length / columns)
  const cellW = (A4.width - MARGIN * 2) / columns
  const cellH = (BOTTOM - TOP) / rows
  const size = Math.min(15, cellH * 0.62)
  return (
    <g data-testid="sheet-letters">
      {letters.map((letter, index) => {
        const x = MARGIN + (index % columns) * cellW
        const y = TOP + Math.floor(index / columns) * cellH
        const base = y + cellH * 0.78
        const lineTop = base - size * 0.72
        return (
          <g key={letter.id} data-letter={letter.id}>
            <Guides x={x + 2} y={lineTop} width={cellW - 6} height={base - lineTop} />
            <text x={x + 3} y={y + 5} fontSize={4.2} fontFamily={FONT} fontWeight={700} fill={INK}>
              {letter.upper} {letter.lower}
            </text>
            <text x={x + 14} y={base} fontSize={size} fontFamily={FONT} fontWeight={700} {...DASH}>
              {letter.upper}
            </text>
            <text
              x={x + 14 + cellW * 0.42}
              y={base}
              fontSize={size}
              fontFamily={FONT}
              fontWeight={700}
              {...DASH}
            >
              {letter.lower}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function Numbers() {
  const columns = 4
  const rows = Math.ceil(SHEET_NUMBERS.length / columns)
  const cellW = (A4.width - MARGIN * 2) / columns
  const cellH = (BOTTOM - TOP) / rows
  const size = Math.min(30, cellH * 0.62)
  return (
    <g data-testid="sheet-numbers">
      {SHEET_NUMBERS.map((value, index) => {
        const x = MARGIN + (index % columns) * cellW
        const y = TOP + Math.floor(index / columns) * cellH
        const base = y + cellH * 0.8
        return (
          <g key={value} data-number={value}>
            <rect
              x={x + 2}
              y={y + 2}
              width={cellW - 4}
              height={cellH - 4}
              rx={4}
              fill="none"
              stroke={GUIDE}
              strokeWidth={0.3}
            />
            <text x={x + 5} y={y + 8} fontSize={5} fontFamily={FONT} fontWeight={700} fill={INK}>
              {value}
            </text>
            <text
              x={x + cellW / 2}
              y={base}
              textAnchor="middle"
              fontSize={size}
              fontFamily={FONT}
              fontWeight={700}
              {...DASH}
            >
              {value}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** One outline to colour in, about 10 mm wide, centred on (x, y). */
function Shape({ shape, x, y }: { shape: CountShape; x: number; y: number }) {
  const stroke = { fill: 'none', stroke: INK, strokeWidth: 0.5, strokeLinejoin: 'round' as const }
  let body: ReactNode
  switch (shape) {
    case 'star':
      body = (
        <path
          d="M0 -5 L1.5 -1.6 L5 -1.5 L2.3 0.9 L3.1 4.5 L0 2.5 L-3.1 4.5 L-2.3 0.9 L-5 -1.5 L-1.5 -1.6 Z"
          {...stroke}
        />
      )
      break
    case 'apple':
      body = (
        <>
          <path
            d="M0 -2.5 C3 -5 6 -2 5 1.5 C4 5 1.5 5.5 0 4.5 C-1.5 5.5 -4 5 -5 1.5 C-6 -2 -3 -5 0 -2.5 Z"
            {...stroke}
          />
          <path
            d="M0 -2.5 L0.6 -5 M0.6 -4.6 C2 -5.6 3 -5 3.2 -4.4 C2 -3.8 1.2 -4 0.6 -4.6"
            {...stroke}
          />
        </>
      )
      break
    case 'heart':
      body = (
        <path
          d="M0 4.5 C-6 0 -5 -5 -2.5 -5 C-1 -5 0 -3.8 0 -2.8 C0 -3.8 1 -5 2.5 -5 C5 -5 6 0 0 4.5 Z"
          {...stroke}
        />
      )
      break
    case 'flower':
      body = (
        <>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              key={angle}
              cx={0}
              cy={-2.6}
              rx={1.7}
              ry={2.4}
              transform={`rotate(${angle})`}
              {...stroke}
            />
          ))}
          <circle r={1.4} {...stroke} />
        </>
      )
      break
    case 'fish':
      body = (
        <>
          <path d="M-3.5 0 C-1.5 -3.5 3 -3.5 4.5 0 C3 3.5 -1.5 3.5 -3.5 0 Z" {...stroke} />
          <path d="M-3.5 0 L-5.5 -2.5 L-5.5 2.5 Z" {...stroke} />
          <circle cx={2.4} cy={-0.6} r={0.45} fill={INK} />
        </>
      )
      break
    case 'ball':
      body = (
        <>
          <circle r={4.6} {...stroke} />
          <path
            d="M-4.6 0 H4.6 M0 -4.6 C2.5 -2 2.5 2 0 4.6 M0 -4.6 C-2.5 -2 -2.5 2 0 4.6"
            {...stroke}
          />
        </>
      )
      break
  }
  return (
    <g transform={`translate(${x} ${y})`} data-shape={shape}>
      {body}
    </g>
  )
}

function Count() {
  const rowH = (BOTTOM - TOP) / COUNT_ROWS.length
  const width = A4.width - MARGIN * 2
  return (
    <g data-testid="sheet-count">
      {COUNT_ROWS.map((row, index) => {
        const y = TOP + index * rowH
        const step = width / COUNT_CHOICES.length
        return (
          <g key={index} data-count={row.count}>
            <rect
              x={MARGIN}
              y={y + 1.5}
              width={width}
              height={rowH - 3}
              rx={5}
              fill="none"
              stroke={GUIDE}
              strokeWidth={0.3}
            />
            {Array.from({ length: row.count }, (_, i) => (
              <Shape key={i} shape={row.shape} x={MARGIN + 12 + i * 14} y={y + rowH * 0.36} />
            ))}
            {COUNT_CHOICES.map((choice, i) => (
              <g key={choice}>
                <circle
                  cx={MARGIN + step * (i + 0.5)}
                  cy={y + rowH * 0.74}
                  r={4}
                  fill="none"
                  stroke={GUIDE}
                  strokeWidth={0.3}
                />
                <text
                  x={MARGIN + step * (i + 0.5)}
                  y={y + rowH * 0.74 + 2}
                  textAnchor="middle"
                  fontSize={5.5}
                  fontFamily={FONT}
                  fontWeight={700}
                  fill={INK}
                >
                  {choice}
                </text>
              </g>
            ))}
          </g>
        )
      })}
    </g>
  )
}

/** A whole A4 sheet as one SVG in millimetres: on screen it scales to the width, in print it is A4. */
export function WorksheetSvg({
  kind,
  letters,
  texts,
  label,
}: {
  kind: SheetKind
  letters: readonly SheetLetter[]
  texts: Texts
  label: string
}) {
  return (
    <svg
      role="img"
      aria-label={label}
      data-testid="worksheet"
      data-kind={kind}
      viewBox={`0 0 ${A4.width} ${A4.height}`}
      className="worksheet-svg block h-auto w-full bg-white"
    >
      <rect width={A4.width} height={A4.height} fill="#ffffff" />
      <text x={MARGIN} y={20} fontSize={9} fontFamily={FONT} fontWeight={800} fill={INK}>
        {texts.title}
      </text>
      <text
        x={A4.width - MARGIN}
        y={20}
        textAnchor="end"
        fontSize={5.5}
        fontFamily={FONT}
        fontWeight={700}
        fill={INK}
        data-testid="sheet-name"
      >
        {texts.nameLabel}: {texts.name || '________________'}
      </text>
      <text x={MARGIN} y={32} fontSize={5} fontFamily={FONT} fill={INK}>
        {texts.task}
      </text>
      <line x1={MARGIN} x2={A4.width - MARGIN} y1={38} y2={38} stroke={GUIDE} strokeWidth={0.4} />
      {kind === 'letters' && <Letters letters={letters} />}
      {kind === 'numbers' && <Numbers />}
      {kind === 'count' && <Count />}
      <text
        x={A4.width / 2}
        y={A4.height - 6}
        textAnchor="middle"
        fontSize={3.5}
        fontFamily={FONT}
        fill="#8A93A0"
      >
        Kiddo
      </text>
    </svg>
  )
}
