import { Img3D } from '@/components/ui/Img3D'
import type { FindDrawing, FindPrompt } from './prompts'

/** Soft things without a 3D picture: a pillow, a slipper and a blanket. */
function Drawing({ drawing }: { drawing: FindDrawing }) {
  if (drawing === 'pillow') {
    return (
      <>
        <path
          d="M18 34c14-10 70-10 84 0 8 14 8 38 0 52-14 10-70 10-84 0-8-14-8-38 0-52Z"
          fill="#F4E9FF"
          stroke="#9B7BD0"
          strokeWidth="5"
        />
        <path d="M34 50c16 6 36 6 52 0" fill="none" stroke="#C9B3EC" strokeWidth="4" />
      </>
    )
  }
  if (drawing === 'slipper') {
    return (
      <>
        <path
          d="M20 78c0-16 12-24 30-24h28c16 0 26 8 26 18s-8 16-22 16H34c-9 0-14-3-14-10Z"
          fill="#FFC9D6"
          stroke="#D9667F"
          strokeWidth="5"
        />
        <path d="M60 54c4-12 30-14 40 2" fill="#F48AA3" stroke="#D9667F" strokeWidth="5" />
      </>
    )
  }
  return (
    <>
      <rect
        x="14"
        y="22"
        width="92"
        height="76"
        rx="12"
        fill="#BFE6D2"
        stroke="#3E9C72"
        strokeWidth="5"
      />
      <path
        d="M14 47h92M14 72h92M44 22v76M75 22v76"
        stroke="#7CC6A2"
        strokeWidth="4"
        strokeDasharray="6 5"
      />
    </>
  )
}

/** The big picture of a prompt: a colour blob, a shape, a drawing (all SVG) or a 3D picture. */
export function FindPicture({ prompt, label }: { prompt: FindPrompt; label: string }) {
  if (prompt.kind === 'colour') {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 120 120" className="size-40 sm:size-52">
        <path
          d="M60 8c22 0 46 14 50 38s-8 54-34 60S14 102 10 74 38 8 60 8Z"
          fill={prompt.colour}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="3"
        />
        <ellipse cx="42" cy="38" rx="14" ry="9" fill="#ffffff" opacity="0.45" />
      </svg>
    )
  }
  if (prompt.kind === 'shape') {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 120 120" className="size-40 sm:size-52">
        <rect
          x="14"
          y="14"
          width="92"
          height="92"
          rx="10"
          fill="#FFD98A"
          stroke="#E0A23A"
          strokeWidth="6"
        />
      </svg>
    )
  }
  if (prompt.drawing) {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 120 120" className="size-40 sm:size-52">
        <Drawing drawing={prompt.drawing} />
      </svg>
    )
  }
  return (
    <span
      role="img"
      aria-label={label}
      className="flex size-40 items-center justify-center sm:size-52"
    >
      <Img3D name={prompt.picture ?? 'star'} className="size-full" eager />
    </span>
  )
}
