import { digitsOf, formatNumber } from './format'
import clsx from 'clsx'
import type { MathObject } from '@/features/math/generators'
import { Img3D } from '@/features/learn/Img3D'
import type { HelpVisual, LabOption, Scene, Sign, Token } from './generators'

/*
 * Pictures of the Math Lab: groups of objects (with the ones that go away
 * crossed out), dots under a number, the written example, the number line.
 * All decorative pictures are aria-hidden; the question text says it all.
 */

const OBJECT_SIZE = 'size-12 sm:size-16 short:size-10'

/** A neat group of one object; `crossed` of the last ones are taken away, `fresh` just came. */
export function ObjectRow({
  object,
  count,
  crossed = 0,
  fresh = 0,
  numbered = false,
  firstNumber = 1,
  className,
  itemClassName = OBJECT_SIZE,
}: {
  object: MathObject
  count: number
  crossed?: number
  fresh?: number
  numbered?: boolean
  /** The number on the first object when numbered (counting on from an earlier group). */
  firstNumber?: number
  className?: string
  itemClassName?: string
}) {
  return (
    <div
      aria-hidden="true"
      data-count={count}
      className={clsx(
        'flex flex-wrap content-center items-center justify-center gap-1.5',
        className,
      )}
    >
      {Array.from({ length: count }, (_, i) => {
        const isCrossed = i >= count - crossed
        const isFresh = i >= count - fresh
        return (
          <span
            key={i}
            className={clsx(
              'relative flex items-center justify-center rounded-tile',
              isFresh && 'bg-coin-soft ring-4 ring-coin',
            )}
          >
            <Img3D name={object} className={clsx(itemClassName, isCrossed && 'opacity-40')} eager />
            {isCrossed && (
              <svg viewBox="0 0 10 10" className="absolute inset-1 text-oops" aria-hidden="true">
                <path
                  d="M1 1 9 9M9 1 1 9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            )}
            {numbered && !isCrossed && (
              <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-coin font-display text-sm font-extrabold text-ink">
                {firstNumber + i}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

/** A number with as many dots under it (rows of five), for the youngest. */
export function DotsNumber({ value }: { value: number }) {
  return (
    <span className="flex flex-col items-center gap-1" aria-hidden="true">
      <span className="font-display text-5xl leading-none font-extrabold tabular-nums sm:text-6xl short:text-4xl">
        {value}
      </span>
      <span className="grid grid-cols-5 gap-1">
        {Array.from({ length: value }, (_, i) => (
          <span key={i} className="size-2.5 rounded-full bg-primary sm:size-3" />
        ))}
      </span>
    </span>
  )
}

const SIGN_GLYPH: Record<Sign, string> = { '<': '<', '>': '>', '=': '=' }

/** The face of an answer card. */
export function OptionFace({ option, object }: { option: LabOption; object: MathObject }) {
  if (option.show === 'sign') {
    return (
      <span
        aria-hidden="true"
        className="font-display text-6xl font-extrabold sm:text-7xl short:text-5xl"
      >
        {SIGN_GLYPH[option.value as Sign]}
      </span>
    )
  }
  if (option.show === 'group') {
    // a grid that scales with the card, so five objects fit a small phone's card too
    const n = Number(option.value)
    return (
      <span
        aria-hidden="true"
        className={clsx(
          'grid w-full content-center justify-items-center gap-0.5 p-1',
          n === 1 ? 'grid-cols-1 px-[25%]' : n <= 4 ? 'grid-cols-2' : 'grid-cols-3',
        )}
      >
        {Array.from({ length: n }, (_, i) => (
          <Img3D key={i} name={object} className="aspect-square w-full" eager />
        ))}
      </span>
    )
  }
  if (option.show === 'dots') return <DotsNumber value={Number(option.value)} />
  const digits = digitsOf([option.value])
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'max-w-full font-display font-extrabold break-all tabular-nums',
        // big numbers (mastery): smaller digits, so the card on a 320 px phone holds them
        digits >= 4 ? 'text-3xl sm:text-5xl short:text-2xl' : 'text-5xl sm:text-6xl short:text-4xl',
      )}
    >
      {typeof option.value === 'number' ? formatNumber(option.value) : option.value}
    </span>
  )
}

function TokenView({ token }: { token: Token | Sign }) {
  if (token === '?') {
    return (
      <span className="inline-flex min-w-[1.4em] items-center justify-center rounded-tile border-4 border-dashed border-girl bg-girl-soft px-1 text-girl-ink">
        ?
      </span>
    )
  }
  return (
    <span>{token === '-' ? '−' : typeof token === 'number' ? formatNumber(token) : token}</span>
  )
}

/** A written example in big digits, e.g. "3 + ? = 5". */
export function EquationView({ tokens }: { tokens: readonly Token[] }) {
  const digits = digitsOf(tokens)
  return (
    <p
      data-testid="lab-equation"
      className={clsx(
        'flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center font-display font-extrabold tabular-nums',
        // big numbers (mastery) get smaller digits, so a 320 px phone fits them
        digits >= 4 ? 'text-4xl sm:text-6xl short:text-3xl' : 'text-5xl sm:text-7xl short:text-4xl',
      )}
    >
      {tokens.map((token, i) => (
        <TokenView key={i} token={token} />
      ))}
    </p>
  )
}

/** Above this many, a word problem shows no objects (too many to count well from a picture). */
export const WORD_PICTURE_MAX = 10

/**
 * The picture of a word problem: exactly the `a` objects the story starts
 * with, in the basket, so the picture never says another number than the
 * text. With more than WORD_PICTURE_MAX there is no picture at all.
 */
export function WordPicture({ a, object }: { a: number; object: MathObject }) {
  if (a > WORD_PICTURE_MAX) return null
  return (
    <div
      aria-hidden="true"
      data-testid="lab-word-picture"
      data-count={a}
      className="flex flex-col items-center"
    >
      <ObjectRow
        object={object}
        count={a}
        className="relative z-10 -mb-1 max-w-64 gap-1! short:max-w-56"
        itemClassName="size-9 sm:size-11 short:size-7"
      />
      <Img3D name="basket" className="size-16 sm:size-20 short:size-12" eager />
    </div>
  )
}

/** What the question shows above (or beside) the answers. */
export function SceneView({ scene, object }: { scene: Scene; object: MathObject }) {
  switch (scene.type) {
    case 'group':
      return (
        <ObjectRow
          object={object}
          count={scene.change === 1 ? scene.count + 1 : scene.count}
          fresh={scene.change === 1 ? 1 : 0}
          crossed={scene.change === -1 ? 1 : 0}
          className="max-w-sm"
        />
      )
    case 'objects':
      return scene.op === '+' ? (
        <div
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-4"
          aria-hidden="true"
        >
          <ObjectRow object={object} count={scene.a} className="max-w-48" />
          <span className="font-display text-4xl font-extrabold text-primary-ink short:text-3xl">
            +
          </span>
          <ObjectRow object={object} count={scene.b} className="max-w-48" />
        </div>
      ) : (
        <ObjectRow object={object} count={scene.a} crossed={scene.b} className="max-w-sm" />
      )
    case 'equation':
      return <EquationView tokens={scene.tokens} />
    case 'compare':
      return <EquationView tokens={[scene.a, '?', scene.b]} />
    case 'sequence':
      return (
        <div className="flex items-center justify-center gap-3" data-testid="lab-sequence">
          {scene.cells.map((cell, i) => (
            <span
              key={i}
              className={clsx(
                'flex size-20 items-center justify-center rounded-card font-display text-4xl font-extrabold tabular-nums sm:size-24 sm:text-5xl short:size-16 short:text-3xl',
                cell === '?'
                  ? 'border-4 border-dashed border-girl bg-girl-soft text-girl-ink'
                  : 'bg-surface shadow-press',
              )}
            >
              {cell}
            </span>
          ))}
        </div>
      )
    case 'word':
      return <WordPicture a={scene.a} object={object} />
    case 'basket':
    case 'none':
      return null
  }
}

/**
 * A number line window: the start is ringed, the cells walked over are
 * shaded and the end is marked. Scrolls sideways on its own when long.
 */
export function NumberLine({
  from,
  to,
  start,
  end,
  marks = [],
}: {
  from: number
  to: number
  start: number
  end: number
  marks?: number[]
}) {
  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  const cells = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const marked = marks.length > 0
  return (
    <div className="w-full overflow-x-auto pb-2" data-testid="lab-number-line">
      <ol className="mx-auto flex w-max items-end gap-1 px-1">
        {cells.map((n) => {
          const isMark = marked ? marks.includes(n) : n === start || n === end
          const onPath = !marked && n > lo && n < hi
          return (
            <li key={n} className="flex flex-col items-center gap-1">
              <span
                className={clsx(
                  'h-2 w-9 rounded-full',
                  onPath || isMark ? 'bg-primary' : 'bg-line-strong',
                )}
              />
              <span
                className={clsx(
                  'flex size-9 items-center justify-center rounded-full font-display text-lg font-extrabold tabular-nums',
                  !marked && n === start && 'bg-coin ring-4 ring-coin-soft',
                  !marked && n === end && 'bg-primary text-white',
                  marked && isMark && 'bg-coin',
                  onPath && 'bg-primary-soft',
                )}
              >
                {n}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * Big numbers in columns (mastery): ones under ones, tens under tens. It shows
 * how to work it out, never the result.
 */
function ColumnsHelp({ a, b, op }: { a: number; b: number; op: '+' | '-' }) {
  const width = Math.max(String(a).length, String(b).length)
  const digits = (n: number) => String(n).padStart(width, ' ').split('')
  const row = (cells: string[], sign: string) => (
    <>
      <span className="w-5 text-center text-ink-soft sm:w-6">{sign}</span>
      {cells.map((d, i) => (
        <span key={i} className="w-6 text-center sm:w-8">
          {d.trim()}
        </span>
      ))}
    </>
  )
  return (
    <div
      role="img"
      aria-label={`${a} ${op === '+' ? '+' : '−'} ${b} = ?`}
      className="inline-grid rounded-card bg-surface p-3 font-display text-2xl font-extrabold tabular-nums sm:text-3xl"
      style={{ gridTemplateColumns: `repeat(${width + 1}, auto)` }}
    >
      {row(digits(a), '')}
      {row(digits(b), op === '+' ? '+' : '−')}
      <span className="col-span-full my-1 h-1 rounded-full bg-ink" aria-hidden="true" />
      {row(
        Array.from({ length: width }, () => '?'),
        '=',
      )}
    </div>
  )
}

/** The picture of the help: counted objects, the number line or big numbers in columns. */
export function HelpPicture({ visual, object }: { visual: HelpVisual; object: MathObject }) {
  if (visual.type === 'line') return <NumberLine {...visual} />
  if (visual.type === 'columns') return <ColumnsHelp a={visual.a} b={visual.b} op={visual.op} />
  const groups = visual.groups
  const firsts = groups.map((_, i) =>
    visual.continued ? 1 + groups.slice(0, i).reduce((sum, n) => sum + n, 0) : 1,
  )
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {groups.map((count, i) => (
        <ObjectRow
          key={i}
          object={object}
          count={count}
          crossed={i === groups.length - 1 ? (visual.crossed ?? 0) : 0}
          numbered
          firstNumber={firsts[i]}
          className="max-w-xs rounded-card bg-surface p-2"
          itemClassName="size-11 sm:size-14"
        />
      ))}
    </div>
  )
}
