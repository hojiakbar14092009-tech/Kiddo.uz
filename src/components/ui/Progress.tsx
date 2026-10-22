import clsx from 'clsx'

/** How far along something is: a calm bar with its numbers for screen readers. */
export function ProgressBar({
  value,
  max,
  label,
  tone = 'primary',
  className,
}: {
  value: number
  max: number
  /** Read by screen readers, e.g. "Harflar: 12 / 33". */
  label: string
  tone?: 'primary' | 'coin'
  className?: string
}) {
  const safeMax = Math.max(1, max)
  const clamped = Math.min(Math.max(0, value), safeMax)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      aria-label={label}
      className={clsx('h-3 w-full overflow-hidden rounded-full bg-line-strong', className)}
    >
      <div
        className={clsx(
          'h-full rounded-full transition-[width] duration-500',
          tone === 'primary' ? 'bg-primary' : 'bg-coin',
        )}
        style={{ width: `${(clamped / safeMax) * 100}%` }}
      />
    </div>
  )
}

/** Steps of a short exercise as dots: done, the current one (long), still to come. */
export function StepDots({
  current,
  total,
  label,
  className,
}: {
  /** Zero-based. */
  current: number
  total: number
  label: string
  className?: string
}) {
  return (
    <div
      className={clsx('flex gap-1.5', className)}
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={label}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={clsx(
            'h-2.5 rounded-full transition-all',
            index < current && 'w-2.5 bg-primary',
            index === current && 'w-7 bg-coin',
            index > current && 'w-2.5 bg-line-strong',
          )}
        />
      ))}
    </div>
  )
}
