import type { ReactNode } from 'react'
import type { SolidId } from './solids'

/** Simple solid pictures for the views puzzle (a little depth, flat colours). */
export const SOLID_PICTURES: Record<SolidId, ReactNode> = {
  cube: (
    <>
      <path d="M20 35 L50 20 L80 35 L50 50 Z" fill="#9DD3F5" />
      <path d="M20 35 L50 50 L50 85 L20 70 Z" fill="#5BA8DF" />
      <path d="M80 35 L50 50 L50 85 L80 70 Z" fill="#3C8EE0" />
    </>
  ),
  cylinder: (
    <>
      <path d="M25 25 L25 75 A25 9 0 0 0 75 75 L75 25 Z" fill="#4CB76A" />
      <ellipse cx="50" cy="25" rx="25" ry="9" fill="#9BE0AE" />
    </>
  ),
  cone: (
    <>
      <path d="M50 12 L76 78 A26 9 0 0 1 24 78 Z" fill="#FFB534" />
      <path d="M50 12 L76 78 A26 9 0 0 1 50 87 Z" fill="#E0951C" />
    </>
  ),
  sphere: (
    <>
      <circle cx="50" cy="52" r="32" fill="#F2789C" />
      <ellipse cx="40" cy="40" rx="11" ry="7" fill="#FFFFFF" opacity="0.45" />
    </>
  ),
  pyramid: (
    <>
      <path d="M50 14 L22 70 L52 84 Z" fill="#C9A56A" />
      <path d="M50 14 L52 84 L80 66 Z" fill="#9E7B3E" />
    </>
  ),
  prism: (
    <>
      <path d="M14 70 L32 34 L50 70 Z" fill="#B9A6FF" />
      <path d="M32 34 L74 26 L90 62 L50 70 Z" fill="#8E77E8" />
    </>
  ),
}
