import clsx from 'clsx'
import { BOX, toSvgPath, type Stroke } from '@/components/trace/paths'

/** A small drawing of a trace item, made from the same stroke data as the board. */
export function TraceThumb({
  strokes,
  className,
}: {
  strokes: readonly Stroke[]
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`-6 -6 ${BOX + 12} ${BOX + 12}`}
      className={clsx('shrink-0', className)}
    >
      {strokes.map((stroke, index) => (
        <path
          key={index}
          d={toSvgPath(stroke)}
          fill="none"
          stroke="currentColor"
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
