import clsx from 'clsx'
import type { ReactNode } from 'react'

interface SpeechBubbleProps {
  children: ReactNode
  /** Which side the tail points to (towards the speaker). */
  tail?: 'left' | 'right' | 'bottom'
  className?: string
}

const TAIL_CLASSES = {
  left: '-left-2 top-1/2 -translate-y-1/2',
  right: '-right-2 top-1/2 -translate-y-1/2',
  bottom: 'left-1/2 -bottom-2 -translate-x-1/2',
} as const

export function SpeechBubble({ children, tail = 'left', className }: SpeechBubbleProps) {
  return (
    <div
      className={clsx(
        'relative rounded-3xl bg-surface px-5 py-3 font-display text-xl font-bold shadow-[0_5px_0_var(--color-line)] sm:text-2xl',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx('absolute size-5 rotate-45 rounded-[4px] bg-surface', TAIL_CLASSES[tail])}
      />
      <span className="relative">{children}</span>
    </div>
  )
}
