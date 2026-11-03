import React from 'react'
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { C, H, THEME, W, type ShortId } from './data'
import { BODY, DISPLAY } from './fonts'

const DARK_SKIES = new Set<ShortId>(['planets', 'dayNight'])

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
export const outEase = Easing.bezier(0.16, 1, 0.3, 1)

/** A spring from 0 to 1 starting at `delay` frames. */
export function usePop(delay = 0, damping = 12, stiffness = 140): number {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delay, fps, config: { damping, stiffness, mass: 0.9 } })
}

/** The cartoon's sky: a soft gradient with two slow light clouds of colour. */
export const Sky: React.FC<{ short: ShortId; night?: number }> = ({ short, night = 0 }) => {
  const frame = useCurrentFrame()
  const theme = THEME[short]
  const drift = Math.sin(frame / 60) * 30
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(180deg, ${theme.top} 0%, ${theme.bottom} 100%)` }}
    >
      <div
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          left: -260 + drift,
          top: -200,
          borderRadius: 9999,
          background: 'radial-gradient(circle, rgba(255,255,255,0.45), transparent 65%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          right: -300 - drift,
          bottom: -260,
          borderRadius: 9999,
          background: `radial-gradient(circle, ${theme.accent}33, transparent 65%)`,
        }}
      />
      {/* slow clouds on a day sky, twinkling dots on a night one */}
      {!DARK_SKIES.has(short) &&
        [0, 1].map((i) => (
          <Img
            key={i}
            src={staticFile('art/cloud.webp')}
            style={{
              position: 'absolute',
              width: 150 - i * 40,
              height: 150 - i * 40,
              left: ((i * 420 + frame * (0.6 + i * 0.3)) % (W + 300)) - 200,
              top: 120 + i * 140,
              opacity: 0.55 * (1 - night),
            }}
          />
        ))}
      {Array.from({ length: 26 }, (_, i) => (
        <div
          key={`s${i}`}
          style={{
            position: 'absolute',
            left: (i * 137) % W,
            top: (i * 211) % 980,
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            borderRadius: 9,
            background: 'white',
            opacity:
              (DARK_SKIES.has(short) ? 1 : night) * (0.35 + 0.35 * Math.sin((frame + i * 13) / 9)),
          }}
        />
      ))}
      <AbsoluteFill style={{ backgroundColor: C.night, opacity: night }} />
    </AbsoluteFill>
  )
}

/** One of the app's 3D pictures, popping in and gently floating. */
export const Art: React.FC<{
  name: string
  x: number
  y: number
  size: number
  delay?: number
  float?: number
  rotate?: number
  style?: React.CSSProperties
}> = ({ name, x, y, size, delay = 0, float = 8, rotate = 0, style }) => {
  const frame = useCurrentFrame()
  const pop = usePop(delay)
  return (
    <Img
      src={staticFile(`art/${name}.webp`)}
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        scale: String(pop),
        rotate: `${rotate + Math.sin((frame + delay * 3) / 22) * 3}deg`,
        translate: `0px ${Math.sin((frame + delay * 7) / 18) * float}px`,
        filter: 'drop-shadow(0 14px 18px rgba(40,30,70,0.18))',
        ...style,
      }}
    />
  )
}

/** A colour emoji (for things the app's pictures do not have: a magnet, a bolt…). */
export const Emoji: React.FC<{
  char: string
  x: number
  y: number
  size: number
  delay?: number
  style?: React.CSSProperties
}> = ({ char, x, y, size, delay = 0, style }) => {
  const frame = useCurrentFrame()
  const pop = usePop(delay)
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        fontSize: size * 0.82,
        lineHeight: `${size}px`,
        textAlign: 'center',
        scale: String(pop),
        translate: `0px ${Math.sin((frame + delay * 5) / 20) * 6}px`,
        filter: 'drop-shadow(0 12px 14px rgba(40,30,70,0.2))',
        ...style,
      }}
    >
      {char}
    </div>
  )
}

/** The sea: two layers of slow waves at the bottom of the frame. */
export const Sea: React.FC<{ top: number; left?: number; width?: number; dark?: boolean }> = ({
  top,
  left = 0,
  width = W,
  dark = false,
}) => {
  const frame = useCurrentFrame()
  const wave = (offset: number, amp: number) => {
    const points = Array.from({ length: 13 }, (_, i) => {
      const x = (i / 12) * width
      const y = Math.sin(i * 0.9 + (frame + offset) / 14) * amp
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    return `M0,${H} L${points.join(' L')} L${width},${H} Z`
  }
  return (
    <svg
      style={{ position: 'absolute', left, top, overflow: 'visible' }}
      width={width}
      height={H - top}
      viewBox={`0 0 ${width} ${H - top}`}
    >
      <path d={wave(0, 14)} fill={dark ? '#2a5f9e' : '#6fc0f0'} />
      <path d={wave(20, 10)} fill={dark ? '#1f4b80' : '#3b93d6'} transform="translate(0,28)" />
    </svg>
  )
}

/** Green ground with a soft hill. */
export const Ground: React.FC<{ top: number; color?: string }> = ({ top, color = '#8bc47a' }) => (
  <div
    style={{
      position: 'absolute',
      left: -80,
      right: -80,
      top,
      bottom: -200,
      borderRadius: '50% 50% 0 0 / 120px 120px 0 0',
      background: `linear-gradient(180deg, ${color} 0%, #5f9e4f 100%)`,
    }}
  />
)

/** Kiddo's robot in the corner: it bounces while it talks. */
export const Robot: React.FC<{ talking: boolean; x?: number; y?: number; size?: number }> = ({
  talking,
  x = 610,
  y = 880,
  size = 230,
}) => {
  const frame = useCurrentFrame()
  const pop = usePop(4, 11)
  const bob = talking ? Math.abs(Math.sin(frame / 3.2)) * -10 : Math.sin(frame / 20) * 4
  return (
    <Img
      src={staticFile('art/kidobot.webp')}
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - (size * 1.2) / 2,
        width: size,
        height: size * 1.2,
        scale: String(pop),
        translate: `0px ${bob}px`,
        rotate: `${Math.sin(frame / 26) * 3}deg`,
        filter: 'drop-shadow(0 16px 18px rgba(40,30,70,0.25))',
      }}
    />
  )
}

/**
 * The spoken line, shown as a caption that lights up word by word with the voice
 * (time is shared by the words in proportion to their letters).
 */
export const Caption: React.FC<{ text: string; seconds: number; dark?: boolean }> = ({
  text,
  seconds,
  dark = false,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const words = text.split(' ')
  const letters = words.reduce((sum, word) => sum + word.length + 1, 0)
  const now = (frame / fps / Math.max(0.5, seconds)) * letters
  let seen = 0
  const enter = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: outEase })
  return (
    <div
      style={{
        position: 'absolute',
        left: 36,
        right: 36,
        bottom: 70,
        padding: '22px 26px',
        borderRadius: 34,
        background: dark ? 'rgba(18,13,29,0.78)' : 'rgba(255,255,255,0.93)',
        boxShadow: dark ? 'none' : `0 8px 0 ${C.line}`,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: 40,
        lineHeight: 1.22,
        textAlign: 'center',
        color: dark ? '#ffffff' : C.ink,
        opacity: enter,
        translate: `0px ${(1 - enter) * 30}px`,
      }}
    >
      {words.map((word, i) => {
        const start = seen
        seen += word.length + 1
        const lit = now >= start
        return (
          <span
            key={i}
            style={{
              color: lit ? (dark ? C.coin : C.primary) : undefined,
              opacity: lit ? 1 : 0.55,
            }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </div>
  )
}

/** A big word on screen (a rule to remember). */
export const BigText: React.FC<{
  text: string
  y: number
  size?: number
  delay?: number
  color?: string
}> = ({ text, y, size = 64, delay = 0, color = C.ink }) => {
  const pop = usePop(delay, 13)
  return (
    <div
      style={{
        position: 'absolute',
        left: 30,
        right: 30,
        top: y,
        textAlign: 'center',
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.1,
        color,
        scale: String(0.6 + pop * 0.4),
        opacity: pop,
      }}
    >
      {text}
    </div>
  )
}

/** A soft white card (a thing in a row, a game card). */
export const Card: React.FC<{
  x: number
  y: number
  w: number
  h: number
  delay?: number
  color?: string
  children?: React.ReactNode
}> = ({ x, y, w, h, delay = 0, color = 'rgba(255,255,255,0.92)', children }) => {
  const pop = usePop(delay, 13)
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 36,
        background: color,
        boxShadow: `0 8px 0 ${C.line}`,
        scale: String(pop),
        fontFamily: BODY,
      }}
    >
      {children}
    </div>
  )
}

/** A frame number in this scene to 0–1, eased. */
export function useProgress(from: number, to: number): number {
  const frame = useCurrentFrame()
  return interpolate(frame, [from, to], [0, 1], { ...clamp, easing: outEase })
}
