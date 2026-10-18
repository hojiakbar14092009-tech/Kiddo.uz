import clsx from 'clsx'
import { Robot } from '@/features/mascot/Robot'
import type { ChildProfile } from '@/store/familyStore'

interface ChildAvatarProps {
  /** `null` is the guest: a friendly face instead of a robot. */
  child: ChildProfile | null
  size: number
  className?: string
}

/** The child’s own robot in a round frame – the same picture everywhere the child is shown. */
export function ChildAvatar({ child, size, className }: ChildAvatarProps) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={clsx(
        'flex shrink-0 justify-center overflow-hidden rounded-full',
        child ? 'items-end' : 'items-center bg-sky-soft',
        child?.mascot === 'boy' && 'bg-primary-soft',
        child?.mascot === 'girl' && 'bg-girl-soft',
        className,
      )}
    >
      {child ? (
        <Robot model={child.mascot} size={Math.round(size * 0.78)} className="translate-y-[6%]" />
      ) : (
        <span style={{ fontSize: size * 0.5 }}>🙂</span>
      )}
    </span>
  )
}
