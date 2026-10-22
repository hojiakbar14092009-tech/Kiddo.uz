import type { ReactNode } from 'react'
import { Img3D } from './Img3D'

/**
 * Nothing to show yet – said kindly, with one clear thing to do next
 * (e.g. "Add a child", "Start a lesson").
 */
export function EmptyState({
  picture = 'sparkles',
  title,
  text,
  action,
}: {
  /** A 3D picture from public/3d (name without extension). */
  picture?: string
  title: ReactNode
  text?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-cream px-6 py-8 text-center">
      <Img3D name={picture} className="size-20" />
      <p className="font-display text-xl font-extrabold">{title}</p>
      {text && <p className="max-w-sm text-ink-soft">{text}</p>}
      {action}
    </div>
  )
}
