import React, { createContext } from 'react'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'

/** Where the camera is now: the sky reads it to move less than the foreground (parallax). */
export interface Cam {
  x: number
  y: number
  s: number
}
export const CamCtx = createContext<Cam>({ x: 0, y: 0, s: 1 })

export type Move = 'push' | 'pull' | 'panL' | 'panR'
export const MOVES: Move[] = ['push', 'panR', 'pull', 'panL']

const FROM: Record<Move, Cam> = {
  push: { x: 0, y: 0, s: 1.02 },
  pull: { x: 0, y: -6, s: 1.06 },
  panL: { x: 14, y: 0, s: 1.04 },
  panR: { x: -14, y: 0, s: 1.04 },
}
const TO: Record<Move, Cam> = {
  push: { x: 0, y: -6, s: 1.06 },
  pull: { x: 0, y: 0, s: 1.02 },
  panL: { x: -14, y: -4, s: 1.04 },
  panR: { x: 14, y: -4, s: 1.04 },
}

/** A slow, eased camera move: every scene is filmed, never pinned. */
export const Camera: React.FC<{ frames: number; move: Move; children: React.ReactNode }> = ({
  frames,
  move,
  children,
}) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [0, frames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  })
  const a = FROM[move]
  const b = TO[move]
  const cam = { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, s: a.s + (b.s - a.s) * p }
  return (
    <CamCtx.Provider value={cam}>
      <AbsoluteFill
        style={{
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`,
          transformOrigin: '50% 45%',
        }}
      >
        {children}
      </AbsoluteFill>
    </CamCtx.Provider>
  )
}
