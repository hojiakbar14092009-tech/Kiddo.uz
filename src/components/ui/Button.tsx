import clsx from 'clsx'
import type { ComponentProps, ReactNode } from 'react'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'start' | 'end'
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
        buttonClasses(variant, size),
        'disabled:opacity-50 disabled:active:translate-y-0',
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
