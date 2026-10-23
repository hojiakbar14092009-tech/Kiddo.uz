import clsx from 'clsx'

export interface WeekBar {
  /** Local day, YYYY-MM-DD (the React key). */
  day: string
  /** Short weekday name under the column. */
  label: string
  value: number
  /** Tooltip text, e.g. "Du: 12 daq". */
  tooltip: string
}

/**
 * A small single-series column chart (one hue, one baseline, no second axis):
 * 7 columns ≤ 24 px wide with a 4 px rounded top, the peak labelled at its
 * cap, a hover tooltip per column. The picture is one `role="img"` with a
 * summary; the exact numbers are in the table the panel shows next to it.
 */
export function WeekChart({
  title,
  summary,
  bars,
  peakLabel,
  testId,
}: {
  title: string
  summary: string
  bars: readonly WeekBar[]
  /** Text at the peak column's cap (the value, with its unit). */
  peakLabel: (value: number) => string
  testId?: string
}) {
  const max = Math.max(0, ...bars.map((bar) => bar.value))
  const peak = max > 0 ? bars.findIndex((bar) => bar.value === max) : -1
  const last = bars.length - 1

  return (
    <figure className="flex min-w-0 flex-col gap-2" data-testid={testId}>
      <figcaption className="font-semibold">{title}</figcaption>
      <div role="img" aria-label={summary} className="flex flex-col">
        {/* room above the tallest column for its label */}
        <div className="flex h-32 items-end gap-1 border-b border-line-strong pt-6">
          {bars.map((bar, index) => (
            <div
              key={bar.day}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
            >
              <span
                data-value={bar.value}
                className="relative w-full max-w-6 shrink-0 rounded-t-[4px] bg-viz-1"
                style={{ height: bar.value > 0 ? `${Math.max(3, (bar.value / max) * 100)}%` : 0 }}
              >
                {index === peak && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-ink-soft group-hover:invisible"
                  >
                    {peakLabel(bar.value)}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={clsx(
                    'pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-lg bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-white group-hover:block',
                    index === 0
                      ? 'left-0'
                      : index === last
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2',
                  )}
                >
                  {bar.tooltip}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="flex gap-1 pt-1">
          {bars.map((bar, index) => (
            <span
              key={bar.day}
              className={clsx(
                'flex-1 text-center text-xs text-ink-soft',
                index === last && 'font-bold text-ink',
              )}
            >
              {bar.label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  )
}
