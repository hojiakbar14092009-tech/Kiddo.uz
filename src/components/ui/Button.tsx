import clsx from 'clsx'
import type { ComponentProps, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'coin' | 'soft' | 'oops'
type ButtonSize = 'md' | 'lg'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'start' | 'end'
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-[0_6px_0_var(--color-primary-shadow)] active:shadow-[0_2px_0_var(--color-primary-shadow)]',
  coin: 'bg-coin text-ink shadow-[0_6px_0_var(--color-coin-shadow)] active:shadow-[0_2px_0_var(--color-coin-shadow)]',
  soft: 'bg-surface text-ink shadow-[0_6px_0_var(--color-line)] active:shadow-[0_2px_0_var(--color-line)]',
  oops: 'bg-oops-soft text-oops-ink shadow-[0_6px_0_#F6C2A3] active:shadow-[0_2px_0_#F6C2A3]',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-14 px-6 text-xl gap-2',
  lg: 'min-h-16 px-8 text-2xl gap-3',
}

/** Large, chunky “pressable” button sized for small fingers. */
export function Button({
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'start',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-display font-bold whitespace-nowrap',
        'transition-[transform,box-shadow] duration-100 active:translate-y-1',
        'disabled:opacity-50 disabled:active:translate-y-0',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {iconPosition === 'start' && icon}
      {children}
      {iconPosition === 'end' && icon}
    </button>
  )
}
