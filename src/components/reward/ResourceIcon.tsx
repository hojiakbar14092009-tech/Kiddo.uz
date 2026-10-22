import type { ReactNode } from 'react'
import type { ResourceId } from '@/domain/universe'

/*
 * One picture per universe resource, drawn like the coin (solid, two tones),
 * so a star, a crystal, a part and a scroll are told apart at a glance even
 * when small. Decorative: the amount is always said in text beside it.
 */

export function ResourceIcon({
  resource,
  size = 28,
  className,
}: {
  resource: ResourceId
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-resource={resource}
    >
      {SHAPES[resource]}
    </svg>
  )
}

const SHAPES: Record<ResourceId, ReactNode> = {
  star: (
    <path
      d="M14 2.5l3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6L14 19.9l-6.8 3.6 1.3-7.6L3 10.5l7.6-1.1z"
      fill="#FFC93C"
      stroke="#E0A419"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  crystal: (
    <>
      <path
        d="M8 3.5h12l5 7-11 14.5L3 10.5z"
        fill="#B79CF2"
        stroke="#7E5CCB"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 10.5h21M14 25l-4-14.5 4-7 4 7z"
        fill="none"
        stroke="#7E5CCB"
        strokeWidth="1.4"
      />
      <path d="M10 10.5l4-7 4 7z" fill="#E4D9FB" />
    </>
  ),
  part: (
    <>
      <path
        d="M12 2.5h4l.7 3.1 2.4 1 2.7-1.7 2.8 2.8-1.7 2.7 1 2.4 3.1.7v4l-3.1.7-1 2.4 1.7 2.7-2.8 2.8-2.7-1.7-2.4 1-.7 3.1h-4l-.7-3.1-2.4-1-2.7 1.7-2.8-2.8 1.7-2.7-1-2.4-3.1-.7v-4l3.1-.7 1-2.4-1.7-2.7 2.8-2.8 2.7 1.7 2.4-1z"
        fill="#7CC4F5"
        stroke="#3F8DC2"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="14" r="4.2" fill="#E6F3FD" stroke="#3F8DC2" strokeWidth="1.6" />
    </>
  ),
  scroll: (
    <>
      <path
        d="M7 5h15a3 3 0 0 1 0 6h-1v10a3 3 0 0 1-3 3H6a3 3 0 0 1 0-6h1z"
        fill="#FFE4C4"
        stroke="#D08A4E"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M11 10h6M11 14h6" stroke="#D08A4E" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  seed: (
    <path
      d="M14 25c-6 0-9-5-9-10 0-6 5-11 9-12 4 1 9 6 9 12 0 5-3 10-9 10z"
      fill="#7FD3A8"
      stroke="#13917E"
      strokeWidth="1.8"
    />
  ),
  key: (
    <>
      <circle cx="9" cy="14" r="5.5" fill="#FFC93C" stroke="#E0A419" strokeWidth="1.8" />
      <path d="M14.5 14H25v4M21 14v3" fill="none" stroke="#E0A419" strokeWidth="2.4" />
    </>
  ),
}
