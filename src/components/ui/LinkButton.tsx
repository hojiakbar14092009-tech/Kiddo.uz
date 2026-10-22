import clsx from 'clsx'
import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

/** A link that looks like <Button> (same variants and sizes), for actions that open a screen. */
export function LinkButton({
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'start',
  className,
  children,
  ...rest
}: LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconPosition?: 'start' | 'end'
}) {
  return (
    <Link className={clsx(buttonClasses(variant, size), className)} {...rest}>
      {iconPosition === 'start' && icon}
      {children}
      {iconPosition === 'end' && icon}
    </Link>
  )
}
