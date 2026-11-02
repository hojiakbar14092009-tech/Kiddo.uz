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
import { C, CTA, Hook, Lang } from './data'
import { BODY, DISPLAY } from './fonts'
import { Backdrop, Caption, Nut, onScreen, Phone, PHONE, ScreenSwap, Spotlight, Tap } from './parts'

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const
const out = Easing.bezier(0.16, 1, 0.3, 1)

type SceneProps = { lang: Lang; line: string; seconds: number; hook: Hook }

const TILE_COLORS = [
  ['#ff5d8f', '#ffb86b'],
  ['#7b5cff', '#3fd0ff'],
  ['#00c48c', '#c6ff4d'],
  ['#ff4d4d', '#ffd23f'],
  ['#3f7bff', '#a35cff'],
  ['#ff8a3d', '#ff3d77'],
]

/** An endless feed of loud, empty video tiles (no real app or brand). */
const Feed: React.FC = () => {
  const frame = useCurrentFrame()
  const tileH = 470
  const offset = (frame * 34) % (tileH * TILE_COLORS.length)
  return (
    <div
      style={{
        position: 'absolute',
        left: PHONE.x,
        top: PHONE.y,
        width: PHONE.w,
        height: PHONE.h,
        borderRadius: 80,
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {[...TILE_COLORS, ...TILE_COLORS, ...TILE_COLORS].map(([a, b], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            width: PHONE.w,
            top: i * tileH - offset,
            height: tileH - 10,
            background: `linear-gradient(${(i * 67) % 360}deg, ${a}, ${b})`,
            filter: 'blur(1.5px) saturate(1.3)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: PHONE.w / 2 - 56,
              top: tileH / 2 - 56,
              width: 112,
              height: 112,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.35)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: PHONE.w / 2 - 14,
              top: tileH / 2 - 28,
              width: 0,
              height: 0,
              borderTop: '28px solid transparent',
              borderBottom: '28px solid transparent',
              borderLeft: '46px solid rgba(255,255,255,0.95)',
            }}
          />
        </div>
      ))}
    </div>
  )
}

const PhoneShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      left: PHONE.x - PHONE.bezel,
      top: PHONE.y - PHONE.bezel,
      width: PHONE.w + PHONE.bezel * 2,
      height: PHONE.h + PHONE.bezel * 2,
      borderRadius: 96,
      background: '#05070f',
      boxShadow: '0 0 120px rgba(120,140,255,0.35)',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: PHONE.bezel - PHONE.x,
        top: PHONE.bezel - PHONE.y,
        width: 1080,
        height: 1920,
      }}
    >
      {children}
    </div>
  </div>
)

/** A round badge with a big number, for the hooks. */
const Badge: React.FC<{ text: string; color: string; at?: number }> = ({ text, color, at = 4 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame: frame - at, fps, config: { damping: 12 } })
  return (
    <div
      style={{
        position: 'absolute',
        right: 70,
        top: 1240,
        padding: '26px 40px',
        borderRadius: 40,
        background: color,
        color: '#fff',
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: 92,
        fontVariantNumeric: 'tabular-nums',
        boxShadow: '0 24px 50px rgba(0,0,0,0.3)',
        scale: pop,
        rotate: '-6deg',
      }}
    >
      {text}
    </div>
  )
}

const HOUR_LABEL: Record<Lang, string> = { uz: '1 soat', ru: '1 час', en: '1 hour' }
const TEN_LABEL: Record<Lang, string> = { uz: '10 daq', ru: '10 мин', en: '10 min' }

export const HookScene: React.FC<SceneProps> = ({ lang, line, seconds, hook }) => {
  const frame = useCurrentFrame()
  if (hook === 'c') {
    return (
      <AbsoluteFill>
        <Backdrop />
        <Phone src={`shots/${lang}-intro.png`} />
        <Badge text={TEN_LABEL[lang]} color={C.teal} at={8} />
        <Caption text={line} seconds={seconds} />
      </AbsoluteFill>
    )
  }
  // b: the clock keeps running while the feed scrolls
  const minutes = Math.min(59, Math.floor(frame * 0.9))
  return (
    <AbsoluteFill>
      <Backdrop dark />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          scale: interpolate(frame, [0, 90], [1.04, 1], clamp),
        }}
      >
        <PhoneShell>
          <Feed />
        </PhoneShell>
      </div>
      {hook === 'b' && (
        <Badge
          text={frame < 66 ? `0:${String(minutes).padStart(2, '0')}` : HOUR_LABEL[lang]}
          color="#ff4d6d"
          at={2}
        />
      )}
      <Caption text={line} seconds={seconds} dark />
    </AbsoluteFill>
  )
}

export const TurnScene: React.FC<SceneProps> = ({ lang, line, seconds }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame: frame - 2, fps, config: { damping: 11 } })
  return (
    <AbsoluteFill>
      <Backdrop />
      <Phone src={`shots/${lang}-home.png`} enterFrom={0}>
        <Tap {...onScreen(0.5, 0.405)} at={52} />
      </Phone>
      <Img
        src={staticFile('symbol.svg')}
        style={{
          position: 'absolute',
          width: 230,
          height: 230,
          left: 790,
          top: 300,
          scale: pop,
          rotate: `${interpolate(frame, [0, 30], [-40, 0], { ...clamp, easing: out })}deg`,
          filter: 'drop-shadow(0 18px 30px rgba(29,71,204,0.35))',
        }}
      />
      <Caption text={line} seconds={seconds} />
    </AbsoluteFill>
  )
}

/** Hear it, see it, find it: the letter card, then the question and a right tap. */
export const LetterScene: React.FC<SceneProps> = ({ lang, line, seconds }) => {
  const frame = useCurrentFrame()
  const swap = Math.round(seconds * 30 * 0.42)
  const tapAt = swap + 22
  const tile = onScreen(0.26, 0.745)
  return (
    <AbsoluteFill>
      <Backdrop />
      <Phone src={`shots/${lang}-intro.png`}>
        {/* the speaker button pulses while the letter is said */}
        <div
          style={{
            position: 'absolute',
            left: onScreen(0.885, 0.175).x - 50,
            top: onScreen(0.885, 0.175).y - 50,
            width: 100,
            height: 100,
            borderRadius: 999,
            border: `6px solid ${C.blue}`,
            opacity: frame < swap ? interpolate(frame % 24, [0, 24], [0.9, 0]) : 0,
            scale: interpolate(frame % 24, [0, 24], [0.8, 1.6]),
          }}
        />
        <ScreenSwap src={`shots/${lang}-question.png`} at={swap} />
        {frame >= tapAt && (
          <div
            style={{
              position: 'absolute',
              left: tile.x - 128,
              top: tile.y - 128,
              width: 256,
              height: 256,
              borderRadius: 40,
              background: 'rgba(19,145,126,0.22)',
              border: `8px solid ${C.teal}`,
              opacity: interpolate(frame, [tapAt, tapAt + 4], [0, 1], clamp),
            }}
          />
        )}
        <Tap x={tile.x} y={tile.y} at={tapAt} />
      </Phone>
      <Caption text={line} seconds={seconds} />
    </AbsoluteFill>
  )
}

/** Today's plan: three steps, ticked off one after another. */
export const PlanScene: React.FC<SceneProps> = ({ lang, line, seconds }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const steps = [0.185, 0.5, 0.815]
  const first = 22
  const gap = Math.round((seconds * 30 * 0.75 - first) / 3)
  const top = onScreen(0, 0.515).y
  return (
    <AbsoluteFill>
      <Backdrop />
      <Phone src={`shots/${lang}-home.png`}>
        <Spotlight
          x={PHONE.x + 14}
          y={top}
          w={PHONE.w - 28}
          h={onScreen(0, 0.805).y - top}
          at={6}
        />
        {steps.map((fx, i) => {
          const at = first + i * gap
          const p = spring({ frame: frame - at, fps, config: { damping: 10 } })
          const c = onScreen(fx, 0.665)
          return (
            <div
              key={fx}
              style={{
                position: 'absolute',
                left: c.x + 30,
                top: c.y - 100,
                width: 72,
                height: 72,
                borderRadius: 999,
                background: C.teal,
                border: '5px solid #fff',
                boxShadow: '0 8px 18px rgba(19,145,126,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scale: p,
              }}
            >
              <svg width="38" height="38" viewBox="0 0 24 24">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="#fff"
                  strokeWidth="3.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )
        })}
      </Phone>
      <Caption text={line} seconds={seconds} />
    </AbsoluteFill>
  )
}

/** A right answer pays nuts: they fly into the counter at the top. */
export const NutsScene: React.FC<SceneProps> = ({ lang, line, seconds }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const tile = onScreen(0.26, 0.745)
  const chip = onScreen(0.5, 0.043)
  const flights = [10, 16, 22, 28, 34]
  const landed = flights.filter((at) => frame >= at + 20).length
  const bump = spring({
    frame: frame - (flights[landed - 1] ?? -100) - 20,
    fps,
    config: { damping: 9 },
  })
  return (
    <AbsoluteFill>
      <Backdrop />
      <Phone src={`shots/${lang}-question.png`}>
        <div
          style={{
            position: 'absolute',
            left: tile.x - 128,
            top: tile.y - 128,
            width: 256,
            height: 256,
            borderRadius: 40,
            background: 'rgba(19,145,126,0.22)',
            border: `8px solid ${C.teal}`,
          }}
        />
        {flights.map((at, i) => {
          const t = interpolate(frame, [at, at + 20], [0, 1], {
            ...clamp,
            easing: Easing.inOut(Easing.quad),
          })
          if (frame < at || frame > at + 20) return null
          const x = tile.x + (chip.x - tile.x) * t + Math.sin(t * Math.PI) * (i % 2 ? 160 : -120)
          const y = tile.y + (chip.y - tile.y) * t - Math.sin(t * Math.PI) * 120
          return (
            <Nut
              key={at}
              size={92}
              style={{ position: 'absolute', left: x - 46, top: y - 46, rotate: `${t * 360}deg` }}
            />
          )
        })}
        {/* the counter pill, over the app's own one */}
        <div
          style={{
            position: 'absolute',
            left: chip.x - 92,
            top: chip.y - 40,
            height: 80,
            minWidth: 184,
            padding: '0 22px',
            borderRadius: 999,
            background: '#fff',
            border: `6px solid ${C.gold}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 50,
            color: C.ink,
            scale: landed ? 1 + 0.25 * Math.max(0, 1 - bump) : 1,
          }}
        >
          <Nut size={56} />
          {landed * 2}
        </div>
      </Phone>
      <div
        style={{
          position: 'absolute',
          left: 800,
          top: 1200,
          rotate: '-8deg',
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 110,
          color: C.orange,
          textShadow: '0 6px 0 #fff, 0 14px 30px rgba(255,126,41,0.35)',
          opacity: interpolate(frame, [12, 18, 60, 72], [0, 1, 1, 0], clamp),
          translate: `0px ${interpolate(frame, [12, 72], [30, -60], clamp)}px`,
        }}
      >
        +10
      </div>
      <Caption text={line} seconds={seconds} />
    </AbsoluteFill>
  )
}

/** The parent's report: a slow scroll, the day's summary picked out. */
export const ParentScene: React.FC<SceneProps> = ({ lang, line, seconds }) => {
  const frame = useCurrentFrame()
  const total = seconds * 30 + 20
  const card = onScreen(0, 0.535)
  return (
    <AbsoluteFill>
      <Backdrop />
      <Phone
        src={`shots/${lang}-report.png`}
        scroll={interpolate(frame, [0, total], [0, 60], clamp)}
      >
        <Spotlight
          x={PHONE.x + 16}
          y={card.y - interpolate(frame, [0, total], [0, 60], clamp)}
          w={PHONE.w - 32}
          h={PHONE.h * 0.137}
          at={16}
          color={C.teal}
        />
      </Phone>
      <Caption text={line} seconds={seconds} />
    </AbsoluteFill>
  )
}

export const CtaScene: React.FC<SceneProps> = ({ lang }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame, fps, config: { damping: 12 } })
  const word = spring({ frame: frame - 8, fps, config: { damping: 14 } })
  const button = spring({ frame: frame - 26, fps, config: { damping: 11 } })
  const hint = interpolate(frame, [36, 46], [0, 1], clamp)
  return (
    <AbsoluteFill>
      <Backdrop />
      <Img
        src={staticFile('symbol.svg')}
        style={{
          position: 'absolute',
          left: 540 - 220,
          top: 330,
          width: 440,
          height: 440,
          scale: pop,
          filter: 'drop-shadow(0 30px 50px rgba(29,71,204,0.30))',
        }}
      />
      <Img
        src={staticFile('wordmark.svg')}
        style={{
          position: 'absolute',
          left: 540 - 300,
          top: 800,
          width: 600,
          opacity: word,
          translate: `0px ${(1 - word) * 40}px`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          top: 1110,
          textAlign: 'center',
          fontFamily: BODY,
          fontWeight: 800,
          fontSize: 54,
          color: C.inkSoft,
          opacity: word,
        }}
      >
        {CTA[lang].age}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 540 - 330,
          width: 660,
          top: 1260,
          height: 150,
          borderRadius: 44,
          background: C.blue,
          boxShadow: `0 14px 0 ${C.blueDeep}, 0 30px 50px rgba(47,95,224,0.35)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 64,
          color: '#fff',
          scale: button * (1 + 0.03 * Math.sin(Math.max(0, frame - 50) / 5)),
        }}
      >
        {CTA[lang].button}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1490,
          display: 'flex',
          justifyContent: 'center',
          gap: 22,
          opacity: hint,
        }}
      >
        {(['UZ', 'RU', 'EN'] as const).map((l) => (
          <div
            key={l}
            style={{
              width: 120,
              height: 76,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: DISPLAY,
              fontWeight: 800,
              fontSize: 38,
              color: l.toLowerCase() === lang ? '#fff' : C.ink,
              background: l.toLowerCase() === lang ? C.blue : '#fff',
              border: '3px solid rgba(29,37,80,0.12)',
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
