import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { C, FPS, VOICE_IN } from './data'
import { DISPLAY } from './fonts'

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const
const out = Easing.bezier(0.16, 1, 0.3, 1)

/** Phone geometry: a 1080×2338 screenshot shown 650 px wide. */
export const PHONE = { x: 215, y: 372, w: 650, h: 1407, bezel: 16 }

/** A point on the phone screen, from 0–1 fractions of the screenshot. */
export const onScreen = (fx: number, fy: number) => ({
  x: PHONE.x + fx * PHONE.w,
  y: PHONE.y + fy * PHONE.h,
})

/** The warm paper of the app, with two slow colour clouds. */
export const Backdrop: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const frame = useCurrentFrame()
  const drift = Math.sin(frame / 50) * 40
  return (
    <AbsoluteFill style={{ backgroundColor: dark ? C.night : C.cream, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: 900,
          height: 900,
          left: -300 + drift,
          top: -200,
          borderRadius: 9999,
          background: dark
            ? 'radial-gradient(circle, rgba(70,90,200,0.35), transparent 65%)'
            : 'radial-gradient(circle, rgba(47,95,224,0.16), transparent 65%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1000,
          height: 1000,
          right: -350 - drift,
          bottom: -250,
          borderRadius: 9999,
          background: dark
            ? 'radial-gradient(circle, rgba(255,126,41,0.18), transparent 65%)'
            : 'radial-gradient(circle, rgba(255,201,60,0.28), transparent 65%)',
        }}
      />
      {!dark && (
        <AbsoluteFill
          style={{
            opacity: 0.5,
            backgroundImage: 'radial-gradient(rgba(29,37,80,0.10) 2px, transparent 2.5px)',
            backgroundSize: '44px 44px',
          }}
        />
      )}
    </AbsoluteFill>
  )
}

/** A phone that rises into place and holds a real screenshot of Kiddo. */
export const Phone: React.FC<{
  src: string
  enterFrom?: number
  children?: React.ReactNode
  scroll?: number
}> = ({ src, enterFrom, children, scroll = 0 }) => {
  const frame = useCurrentFrame()
  // only the first light scene brings the phone in; after that it stays put
  const t = enterFrom === undefined ? 999 : frame - enterFrom
  return (
    <div
      style={{
        position: 'absolute',
        left: PHONE.x - PHONE.bezel,
        top: PHONE.y - PHONE.bezel,
        width: PHONE.w + PHONE.bezel * 2,
        height: PHONE.h + PHONE.bezel * 2,
        borderRadius: 96,
        background: '#1b2240',
        boxShadow: '0 50px 90px rgba(29,37,80,0.28), 0 12px 24px rgba(29,37,80,0.18)',
        translate: `0px ${interpolate(t, [0, 16], [140, 0], { ...clamp, easing: out })}px`,
        opacity: interpolate(t, [0, 8], [0, 1], clamp),
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: PHONE.bezel,
          top: PHONE.bezel,
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: 80,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            width: PHONE.w,
            height: PHONE.h,
            display: 'block',
            translate: `0px ${-scroll}px`,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: PHONE.bezel,
          top: PHONE.bezel,
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: 80,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -PHONE.x,
            top: -PHONE.y,
            width: 1080,
            height: 1920,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

/** Swaps one screenshot for the next with a quick cross-fade. */
export const ScreenSwap: React.FC<{ src: string; at: number }> = ({ src, at }) => {
  const frame = useCurrentFrame()
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: 'absolute',
        left: PHONE.x,
        top: PHONE.y,
        width: PHONE.w,
        height: PHONE.h,
        borderRadius: 80,
        opacity: interpolate(frame, [at, at + 5], [0, 1], clamp),
      }}
    />
  )
}

/**
 * The spoken line as a big caption over the phone. Words arrive in step
 * with the voice (spread evenly over its length), so it reads as subtitles.
 */
export const Caption: React.FC<{
  text: string
  seconds: number
  dark?: boolean
  top?: number
  size?: number
}> = ({ text, seconds, dark, top = 104, size }) => {
  const fontSize = size ?? (text.length > 40 ? 66 : 74)
  const frame = useCurrentFrame() - VOICE_IN + 2
  const words = text.split(' ')
  const per = (seconds * FPS * 0.85) / words.length
  return (
    <div
      style={{
        position: 'absolute',
        left: 80,
        right: 80,
        top,
        height: 250,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize,
        lineHeight: 1.12,
        letterSpacing: '-0.01em',
        color: dark ? '#ffffff' : C.ink,
        textWrap: 'balance',
      }}
    >
      <span>
        {words.map((word, i) => {
          const at = i * per
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                marginRight: '0.24em',
                opacity: interpolate(frame, [at, at + 5], [0.12, 1], clamp),
                translate: `0px ${interpolate(frame, [at, at + 7], [14, 0], { ...clamp, easing: out })}px`,
              }}
            >
              {word}
            </span>
          )
        })}
      </span>
    </div>
  )
}

/** A finger tap: a ring that grows and fades at a point on the screen. */
export const Tap: React.FC<{ x: number; y: number; at: number }> = ({ x, y, at }) => {
  const frame = useCurrentFrame()
  const t = frame - at
  if (t < -6 || t > 24) return null
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - 46,
          top: y - 46,
          width: 92,
          height: 92,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.9)',
          border: '4px solid rgba(29,37,80,0.25)',
          scale: interpolate(t, [-6, 0, 4], [1.15, 0.85, 1], clamp),
          opacity: interpolate(t, [-6, -2, 10, 16], [0, 0.95, 0.95, 0], clamp),
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - 70,
          top: y - 70,
          width: 140,
          height: 140,
          borderRadius: 999,
          border: `6px solid ${C.gold}`,
          scale: interpolate(t, [0, 18], [0.5, 1.8], { ...clamp, easing: out }),
          opacity: interpolate(t, [0, 18], [1, 0], clamp),
        }}
      />
    </>
  )
}

/** A soft highlight frame around part of the screen, drawn on at `at`. */
export const Spotlight: React.FC<{
  x: number
  y: number
  w: number
  h: number
  at: number
  color?: string
}> = ({ x, y, w, h, at, color = C.gold }) => {
  const frame = useCurrentFrame()
  const t = frame - at
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 36,
        border: `7px solid ${color}`,
        boxShadow: `0 0 0 9999px rgba(18,25,53,${interpolate(t, [0, 10], [0, 0.32], clamp)})`,
        opacity: interpolate(t, [0, 8], [0, 1], clamp),
        scale: interpolate(t, [0, 12], [1.08, 1], { ...clamp, easing: out }),
      }}
    />
  )
}

/** Kiddo's hazelnut, the one in-app currency (same paths as the app's icon). */
export const Nut: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <svg viewBox="0 0 28 28" width={size} height={size} style={style}>
    <path
      d="M14 9c5.6 0 9 4.2 9 8.6 0 4.7-4 8.4-9 8.4s-9-3.7-9-8.4C5 13.2 8.4 9 14 9z"
      fill="#C98A4B"
      stroke="#8A5527"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 12.2C5.4 7.4 9.2 4.5 14 4.5s8.6 2.9 9.5 7.7c-2.6 1.2-5.8 1.8-9.5 1.8s-6.9-.6-9.5-1.8z"
      fill="#7A4A22"
      stroke="#5C3416"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M14 4.5V1.8" stroke="#5C3416" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M10 17.5c.6-1.6 1.8-2.6 3.2-3"
      stroke="#E7B985"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)
