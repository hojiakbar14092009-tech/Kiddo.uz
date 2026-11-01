import clsx from 'clsx'
import type { ReactNode } from 'react'

interface ScreenProps {
  header?: ReactNode
  /** After the main content, outside <main> (e.g. the section tabs). */
  footer?: ReactNode
  children: ReactNode
  className?: string
}

/** Full-height page frame that respects iPhone/iPad safe areas. */
export function Screen({ header, footer, children, className }: ScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      {header}
      <main className={clsx('relative flex flex-1 flex-col', className)}>{children}</main>
      {footer}
    </div>
  )
}
