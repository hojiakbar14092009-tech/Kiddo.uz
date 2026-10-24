import clsx from 'clsx'
import type { LearningDomain } from '@/domain/learning'

/*
 * A small plant marker per learning area (decorative, aria-hidden: the
 * plant's name already says what it is): maths a plus and a minus, language a
 * letter, nature a leaf. One stroke style, the garden's colours.
 */

const TINT: Record<LearningDomain, string> = {
  math: 'bg-coin-soft text-ink',
  language: 'bg-sky-soft text-ink',
  science: 'bg-primary-soft text-primary-ink',
}

export function DomainIcon({
  domain,
  size = 22,
  className,
}: {
  domain: LearningDomain
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      data-domain={domain}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        TINT[domain],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 20 20" width={size * 0.68} height={size * 0.68} fill="none">
        {domain === 'math' && (
          <path
            d="M6 3.5v6M3 6.5h6M11.5 14.5h6"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        )}
        {domain === 'language' && (
          <path
            d="M4 16.5 9.2 3.5h1.6L16 16.5M6.4 11.5h7.2"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {domain === 'science' && (
          <path
            d="M4 16c0-7 4.5-11 12-12-.4 7.6-4.6 12-12 12Zm0 0 6.5-6.5"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  )
}
