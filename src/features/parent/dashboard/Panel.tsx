import clsx from 'clsx'
import type { ReactNode } from 'react'

/** A white card section of the parent dashboard. */
export function Panel({
  title,
  children,
  className,
  id,
}: {
  title: string
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={clsx(
        'flex scroll-mt-24 flex-col gap-4 rounded-[28px] bg-surface p-5 shadow-[0_6px_0_var(--color-line)]',
        className,
      )}
    >
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  )
}
