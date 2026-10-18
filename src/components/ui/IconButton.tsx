import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons must still have an accessible name. */
  label: string
  tone?: 'primary' | 'plain'
  children: ReactNode
}

export function IconButton({
  label,
  tone = 'plain',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-2xl transition-transform active:scale-95 sm:size-14',
        tone === 'primary' && 'bg-primary-soft text-primary-ink',
        tone === 'plain' && 'border-2 border-line-strong bg-surface text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
