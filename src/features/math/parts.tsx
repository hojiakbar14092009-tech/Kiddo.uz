import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Img3D } from '@/features/learn/Img3D'
import { bridge, type Fact, type MathObject, type StageId } from './generators'

/*
 * Pictures of the Matematika section: groups of 3D objects a child can tap
 * to count, ten-frames for making and passing 10, and the big equation.
 */

/** A neat group of the same object, never overlapping (rows of up to 3). */
export function ObjectGroup({
  object,
  count,
  className,
  itemClassName = 'w-[30%]',
}: {
  object: MathObject
  count: number
  className?: string
  itemClassName?: string
}) {
  return (
    <div
      className={clsx('flex flex-wrap content-center items-center justify-center gap-1', className)}
      data-count={count}
    >
      {Array.from({ length: count }, (_, i) => (
        <Img3D key={i} name={object} className={clsx('aspect-square', itemClassName)} eager />
      ))}
    </div>
  )
}

/**
 * Age 4: one group, then a second group comes beside it. The child can tap
 * each object: it lights up with its number, and is never counted twice.
 */
export function CountScene({
  fact,
  object,
  counting = true,
  label,
  recountLabel,
}: {
  fact: Fact
  object: MathObject
  counting?: boolean
  label: (n: number) => string
  recountLabel: string
}) {
  const reduceMotion = useReducedMotion() ?? false
  const [counted, setCounted] = useState<string[]>([])

  const item = (key: string, delay: number) => {
    const index = counted.indexOf(key)
    const on = index >= 0
    return (
      <motion.button
        key={key}
        type="button"
        data-testid="count-object"
        aria-pressed={on}
        aria-label={on ? String(index + 1) : '?'}
        disabled={!counting}
        onClick={() => !on && setCounted((list) => [...list, key])}
        initial={reduceMotion ? false : { x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{
          delay: reduceMotion ? 0 : delay,
          type: 'spring',
          stiffness: 200,
          damping: 18,
        }}
        className={clsx(
          'relative flex size-16 items-center justify-center rounded-3xl transition-colors sm:size-20 lg:size-24',
          on ? 'bg-coin-soft ring-4 ring-coin' : 'bg-white/70',
        )}
      >
        <Img3D name={object} className="size-[82%]" eager />
        {on && (
          <span className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-coin font-display text-lg font-extrabold text-ink shadow-[0_3px_0_var(--color-coin-shadow)]">
            {index + 1}
          </span>
        )}
      </motion.button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        <div className="flex flex-wrap justify-center gap-2" data-group="a">
          {Array.from({ length: fact.a }, (_, i) => item(`a${i}`, 0.05 * i))}
        </div>
        <span aria-hidden="true" className="font-display text-4xl font-extrabold text-primary-ink">
          +
        </span>
        <div className="flex flex-wrap justify-center gap-2" data-group="b">
          {Array.from({ length: fact.b }, (_, i) => item(`b${i}`, 0.6 + 0.1 * i))}
        </div>
      </div>
      {counting && (
        <div className="flex min-h-10 items-center gap-3 text-lg">
          <span aria-live="polite" className="font-display font-bold" data-testid="counted">
            {label(counted.length)}
          </span>
          {counted.length > 0 && (
            <button
              type="button"
              onClick={() => setCounted([])}
              className="rounded-full bg-surface px-3 py-1 text-base shadow-[0_3px_0_var(--color-line)]"
            >
              ↺ {recountLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** The big equation, e.g. "2 + 1 = ?" (the answer replaces "?" once found). */
export function Equation({
  fact,
  solved,
  small = false,
}: {
  fact: Fact
  solved: boolean
  small?: boolean
}) {
  return (
    <p
      className={clsx(
        'text-center font-display font-extrabold tracking-wide tabular-nums',
        small ? 'text-2xl text-ink-soft sm:text-3xl' : 'text-6xl sm:text-7xl lg:text-8xl',
      )}
      data-testid="equation"
    >
      {fact.a} + {fact.b} ={' '}
      <span className={solved ? 'text-primary-ink' : 'text-girl-ink'}>
        {solved ? fact.sum : '?'}
      </span>
    </p>
  )
}

type Cell = 'a' | 'b' | null

/** A ten-frame: 2 rows of 5. Red apples for the first number, green for the second. */
export function TenFrame({ cells }: { cells: readonly Cell[] }) {
  return (
    <div
      className="grid w-full max-w-[17rem] min-w-0 flex-1 grid-cols-5 gap-1 rounded-2xl bg-white p-1.5 shadow-[0_4px_0_var(--color-line)]"
      data-testid="ten-frame"
    >
      {Array.from({ length: 10 }, (_, i) => {
        const cell = cells[i] ?? null
        return (
          <span
            key={i}
            className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-line-strong"
          >
            {cell && (
              <Img3D name={cell === 'a' ? 'apple' : 'green-apple'} className="size-[85%]" eager />
            )}
          </span>
        )
      })}
    </div>
  )
}

const fill = (a: number, b: number): Cell[] => [
  ...Array.from({ length: a }, () => 'a' as const),
  ...Array.from({ length: b }, () => 'b' as const),
]

/**
 * The picture that explains an example, with exactly as many objects as the
 * equation says: groups for small sums, ten-frames for making and passing 10.
 */
export function HelpVisual({
  fact,
  stage,
  object,
}: {
  fact: Fact
  stage: StageId
  object: MathObject
}) {
  if (stage === '6-over10') {
    const big = Math.max(fact.a, fact.b)
    const { toTen, rest } = bridge(fact)
    return (
      <div className="flex w-full items-center justify-center gap-2" data-objects={fact.sum}>
        <TenFrame cells={fill(big, toTen)} />
        <span aria-hidden="true" className="font-display text-3xl font-extrabold">
          +
        </span>
        <TenFrame cells={fill(0, rest)} />
      </div>
    )
  }
  if (stage === '6-make10' || stage === '6-to10') {
    return (
      <div className="flex justify-center" data-objects={fact.sum}>
        <TenFrame cells={fill(fact.a, fact.b)} />
      </div>
    )
  }
  // both groups use the same object size, so neither looks like "more"
  const size = Math.max(fact.a, fact.b) <= 4 ? 'w-[45%]' : 'w-[30%]'
  return (
    <div className="flex w-full items-center justify-center gap-2" data-objects={fact.sum}>
      <ObjectGroup object={object} count={fact.a} className="w-2/5" itemClassName={size} />
      <span aria-hidden="true" className="font-display text-3xl font-extrabold">
        +
      </span>
      <ObjectGroup object={object} count={fact.b} className="w-2/5" itemClassName={size} />
    </div>
  )
}
