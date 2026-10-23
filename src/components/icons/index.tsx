import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function StrokeIcon({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </StrokeIcon>
  )
}

export function LockIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </StrokeIcon>
  )
}

export function SpeakerIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </StrokeIcon>
  )
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M15 5l-7 7 7 7" />
    </StrokeIcon>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 5l7 7-7 7" />
    </StrokeIcon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon strokeWidth={3.5} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </StrokeIcon>
  )
}

export function StarIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path
        d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z"
        fill="currentColor"
      />
    </svg>
  )
}

export function CoinIcon({ size = 28, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <circle cx="14" cy="14" r="13" fill="#FFC93C" stroke="#E5A419" strokeWidth="2" />
      <path
        d="M14 7l2.1 4.3 4.7.7-3.4 3.3.8 4.7L14 17.8 9.8 20l.8-4.7-3.4-3.3 4.7-.7z"
        fill="#FFF4D1"
      />
    </svg>
  )
}

export function PictureIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="M21 16l-5-5-7 7" />
    </StrokeIcon>
  )
}

export function TrophyIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4a3 3 0 0 0 3 4" />
      <path d="M17 6h3a3 3 0 0 1-3 4" />
      <path d="M12 14v4" />
      <path d="M8 21h8" />
    </StrokeIcon>
  )
}

export function StickerIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M15 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h9l6-6V6a3 3 0 0 0-3-3h-3" />
      <path d="M15 21v-4a2 2 0 0 1 2-2h4" />
    </StrokeIcon>
  )
}

export function CrownIcon({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path
        d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* Section icons (tabs, help): one stroke family instead of platform emoji. */

export function ChartIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 20h16" />
      <path d="M7 16v-5" />
      <path d="M12 16V7" />
      <path d="M17 16v-8" />
    </StrokeIcon>
  )
}

export function ChildIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </StrokeIcon>
  )
}

export function ClipboardIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 11l2 2 4-4" />
      <path d="M9 17h6" />
    </StrokeIcon>
  )
}

export function GearIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </StrokeIcon>
  )
}

export function ShirtIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M8 3.5 4 5.5 2.5 10l3 1.5V20h13v-8.5l3-1.5L20 5.5l-4-2a4 4 0 0 1-8 0Z" />
    </StrokeIcon>
  )
}

export function PawIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 12.5c-3 0-5.5 3-5.5 5.2 0 1.6 1.3 2.3 2.7 2.3 1.2 0 1.8-.6 2.8-.6s1.6.6 2.8.6c1.4 0 2.7-.7 2.7-2.3 0-2.2-2.5-5.2-5.5-5.2Z" />
      <circle cx="6" cy="9.5" r="1.8" />
      <circle cx="9.5" cy="5.5" r="1.8" />
      <circle cx="14.5" cy="5.5" r="1.8" />
      <circle cx="18" cy="9.5" r="1.8" />
    </StrokeIcon>
  )
}

export function AlbumIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" />
      <path d="M5 17a3 3 0 0 1 3-3h11" />
      <path d="M11 7.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3Z" />
    </StrokeIcon>
  )
}

export function BulbIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 17h6" />
      <path d="M10 20.5h4" />
      <path d="M8.5 14.5A6.5 6.5 0 1 1 15.5 14.5c-.6.5-1 1.2-1 2v.5h-5v-.5c0-.8-.4-1.5-1-2Z" />
    </StrokeIcon>
  )
}

export function UndoIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </StrokeIcon>
  )
}

export function RedoIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </StrokeIcon>
  )
}

export function BrushIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M19.5 3.5 11 12" />
      <path d="M11 12l1.5 1.5" />
      <path d="M9.5 13.5c-2 0-3.5 1.5-3.5 3.5 0 1.5-1 2.5-2.5 3 2.5 1 7 .5 7.5-3 .3-1.5 0-2.5-1.5-3.5Z" />
    </StrokeIcon>
  )
}

export function EraserIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M8.5 20 3.6 15.1a2 2 0 0 1 0-2.8l8.7-8.7a2 2 0 0 1 2.8 0l5.3 5.3a2 2 0 0 1 0 2.8L12 20Z" />
      <path d="M8 20h12" />
      <path d="m7.5 8.5 8 8" />
    </StrokeIcon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4.5h6V7" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </StrokeIcon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 5v14M5 12h14" />
    </StrokeIcon>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 12h14" />
    </StrokeIcon>
  )
}

export function SaveIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 4h11l3 3v13H5Z" />
      <path d="M8 4v5h7V4" />
      <path d="M8 20v-6h8v6" />
    </StrokeIcon>
  )
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 19V6" />
      <path d="M6 11l6-6 6 6" />
    </StrokeIcon>
  )
}

export function MapIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </StrokeIcon>
  )
}

export function MedalIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M8 3l2.5 6M16 3l-2.5 6" />
      <circle cx="12" cy="15" r="6" />
      <path d="M12 12.5v5" />
    </StrokeIcon>
  )
}

/** Turn a 3D model around (an orbit with an arrow). */
export function RotateIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <ellipse cx="12" cy="12" rx="9" ry="4" />
      <path d="M12 3v18" strokeDasharray="2 3" />
      <path d="m17 14.5 3.5 1.5-1 3.5" />
    </StrokeIcon>
  )
}
