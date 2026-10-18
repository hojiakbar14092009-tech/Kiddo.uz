import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import { KiddoWordmark } from '@/components/brand/KiddoLogo'
import { Flag } from '@/components/flags/Flag'
import { Robot } from '@/features/mascot/Robot'
import type { MascotModel, MascotMood } from '@/features/mascot/types'
import type { Wearing } from '@/features/shop/outfits'
import { BEAT, COPY, SCENES, type PromoCopy, type PromoLang } from './copy'
import {
  clamp,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeOutQuint,
  hop,
  lerp,
  prog,
  rand,
  spring,
} from './motion'

/* ------------------------------------------------------------------ stage */

interface StageInfo {
  t: number
  u: number
  w: number
  h: number
  portrait: boolean
  copy: PromoCopy
  lang: PromoLang
}

const Stage = createContext<StageInfo>(null as unknown as StageInfo)
const useStage = () => useContext(Stage)

const INK = '#3A2E4D'
const TEAL = '#13917E'
const TEAL_DEEP = '#0B6F62'
const GOLD = '#FFC93C'
const PINK = '#F27BA6'
const SKY = '#5BB4F0'
const CREAM = '#FFF8EC'
const ORANGE = '#FF8A4C'
const VIOLET = '#8E6CEF'

const sceneStart = (id: (typeof SCENES)[number]['id']) => SCENES.find((s) => s.id === id)!.start
const sceneEnd = (id: (typeof SCENES)[number]['id']) => {
  const index = SCENES.findIndex((s) => s.id === id)
  return SCENES[index + 1]?.start ?? 30
}

const WIPE = 0.62

export function Promo({ t, lang, portrait }: { t: number; lang: PromoLang; portrait: boolean }) {
  const w = portrait ? 1080 : 1920
  const h = portrait ? 1920 : 1080
  const u = 1
  const info: StageInfo = { t, u, w, h, portrait, copy: COPY[lang], lang }
  return (
    <Stage.Provider value={info}>
      <div
        lang={lang}
        style={{
          position: 'relative',
          width: w,
          height: h,
          overflow: 'hidden',
          fontFamily: 'Rubik, sans-serif',
          color: INK,
          background: CREAM,
        }}
      >
        <LogoScene />
        <LettersScene />
        <AgesScene />
        <CheerScene />
        <ShopScene />
        <ParentsScene />
        <CtaScene />
        <Vignette />
      </div>
    </Stage.Provider>
  )
}

/**
 * One scene: mounted shortly before it starts and kept until the next scene's
 * wipe has covered it. It arrives behind a two-colour circular wipe.
 */
function Scene({
  id,
  bg,
  ring,
  from,
  children,
}: {
  id: (typeof SCENES)[number]['id']
  bg: string
  ring: string
  from: [number, number]
  children: (local: number) => ReactNode
}) {
  const { t, w, h } = useStage()
  const start = sceneStart(id)
  const end = sceneEnd(id)
  if (t < start - 0.001 || t > end + WIPE + 0.05) return null
  const local = t - start
  const diag = Math.hypot(w, h) * 1.05
  const first = start === 0
  const ringR = first ? diag : easeInOutCubic(prog(local, 0, WIPE * 0.85)) * diag
  const bodyR = first ? diag : easeInOutCubic(prog(local, 0.1, WIPE)) * diag
  const cx = from[0] * w
  const cy = from[1] * h
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: ring,
        clipPath: `circle(${ringR}px at ${cx}px ${cy}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: bg,
          overflow: 'hidden',
          clipPath: `circle(${bodyR}px at ${cx}px ${cy}px)`,
        }}
      >
        {children(local)}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- primitives */

function Abs({
  x,
  y,
  children,
  style,
}: {
  x: number
  y: number
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** A headline that arrives word by word with a springy overshoot and leaves upwards. */
function Kinetic({
  text,
  at,
  out,
  size,
  color = INK,
  x,
  y,
  maxWidth,
  align = 'center',
}: {
  text: string
  at: number
  out?: number
  size: number
  color?: string
  x: number
  y: number
  maxWidth: number
  align?: 'center' | 'left'
}) {
  const { t } = useStage()
  const words = text.split(' ').reduce<string[]>((acc, word) => {
    const prev = acc[acc.length - 1]
    if (prev !== undefined && prev.length <= 2 && !prev.endsWith('\u00a0'))
      acc[acc.length - 1] = `${prev}\u00a0${word}`
    else acc.push(word)
    return acc
  }, [])
  return (
    <div
      style={{
        position: 'absolute',
        left: align === 'center' ? x - maxWidth / 2 : x,
        top: y,
        width: maxWidth,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        columnGap: size * 0.26,
        rowGap: size * 0.02,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.08,
        letterSpacing: '-0.01em',
        color,
      }}
    >
      {words.map((word, i) => {
        const k = prog(t, at + i * 0.075, at + i * 0.075 + 0.55)
        const e = easeOutBack(k, 2.2)
        const o =
          out === undefined ? 0 : easeInCubic(prog(t, out + i * 0.03, out + i * 0.03 + 0.35))
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: 'inline-block',
              opacity: clamp(k * 3) * (1 - o),
              transform: `translateY(${(1 - e) * size * 0.9 - o * size * 0.8}px) rotate(${(1 - e) * (i % 2 ? -9 : 9)}deg) scale(${0.6 + 0.4 * e})`,
              transformOrigin: '50% 100%',
            }}
          >
            {word}
          </span>
        )
      })}
    </div>
  )
}

/** Drifting brand glyphs behind a scene. */
function Pattern({ color, glyphs, speed = 40 }: { color: string; glyphs: string; speed?: number }) {
  const { t, w, h } = useStage()
  const cell = 150
  const cols = Math.ceil(w / cell) + 2
  const rows = Math.ceil(h / cell) + 2
  const shift = (t * speed) % cell
  const items: ReactNode[] = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const seed = r * 31 + c * 7
      const ch = glyphs[Math.floor(rand(seed) * glyphs.length)]
      items.push(
        <span
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left: (c - 1) * cell + shift + (r % 2) * (cell / 2),
            top: (r - 1) * cell + shift * 0.6,
            fontSize: 46,
            fontWeight: 800,
            color,
            transform: `rotate(${(rand(seed + 3) - 0.5) * 40 + t * 12 * (rand(seed + 5) - 0.5)}deg)`,
          }}
        >
          {ch}
        </span>,
      )
    }
  }
  return <div style={{ position: 'absolute', inset: 0 }}>{items}</div>
}

/** Slow rotating sunburst rays. */
function Rays({ color, t, size }: { color: string; t: number; size: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '46%',
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderRadius: '50%',
        background: `repeating-conic-gradient(from ${t * 14}deg, ${color} 0deg 9deg, transparent 9deg 22.5deg)`,
        WebkitMaskImage: 'radial-gradient(circle, #000 18%, transparent 68%)',
        maskImage: 'radial-gradient(circle, #000 18%, transparent 68%)',
      }}
    />
  )
}

function Picture({ name, size, style }: { name: string; size: number; style?: CSSProperties }) {
  return (
    <img
      src={`/pictures/${name}.svg`}
      alt=""
      width={size}
      height={size}
      style={{ display: 'block', ...style }}
    />
  )
}

function Pet({
  pet,
  emotion = 'happy',
  size,
  t,
  phase = 0,
}: {
  pet: string
  emotion?: string
  size: number
  t: number
  phase?: number
}) {
  const cycle = ((t + phase) % 1.1) / 1.1
  const squash = Math.sin(cycle * Math.PI * 2)
  const jump = Math.max(0, Math.sin(cycle * Math.PI * 2 - 0.6)) * 10
  return (
    <img
      src={`/pets/${pet}/${emotion}.webp`}
      alt=""
      width={size}
      height={size}
      style={{
        display: 'block',
        transformOrigin: '50% 100%',
        transform: `translateY(${-jump}px) scale(${1 + squash * 0.035}, ${1 - squash * 0.035})`,
      }}
    />
  )
}

function Bot({
  model,
  mood,
  size,
  wearing,
  tint = 0,
}: {
  model: MascotModel
  mood: MascotMood
  size: number
  wearing?: Wearing
  tint?: number
}) {
  const filter =
    tint > 0
      ? `sepia(${0.6 * tint}) saturate(${1 + 2.2 * tint}) hue-rotate(${70 * tint}deg) brightness(${1 + 0.03 * tint}) drop-shadow(0 0 ${16 * tint}px rgb(34 197 94 / ${0.6 * tint}))`
      : 'drop-shadow(0 18px 18px rgba(30, 20, 50, 0.18))'
  return (
    <div style={{ filter }}>
      <Robot model={model} mood={mood} size={size} followPointer={false} wearing={wearing} />
    </div>
  )
}

function Burst({
  t,
  at,
  x,
  y,
  colors,
  count = 14,
  radius = 220,
  seed = 1,
}: {
  t: number
  at: number
  x: number
  y: number
  colors: string[]
  count?: number
  radius?: number
  seed?: number
}) {
  const k = prog(t, at, at + 0.9)
  if (k <= 0 || k >= 1) return null
  const e = easeOutQuint(k)
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + rand(seed + i) * 0.4
        const dist = radius * (0.6 + rand(seed + i * 3) * 0.6) * e
        const s = (1 - k) * (14 + rand(seed + i * 5) * 14)
        const shape = i % 3
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.cos(angle) * dist - s / 2,
              top: y + Math.sin(angle) * dist - s / 2 + k * k * 60,
              width: s,
              height: shape === 2 ? s * 0.45 : s,
              borderRadius: shape === 0 ? '50%' : 4,
              background: colors[i % colors.length],
              transform: `rotate(${k * 360 * (rand(seed + i) - 0.5)}deg)`,
            }}
          />
        )
      })}
    </>
  )
}

function Confetti({ t, at, seed, w }: { t: number; at: number; seed: number; w: number }) {
  const local = t - at
  if (local < 0 || local > 3.2) return null
  const colors = [GOLD, PINK, SKY, TEAL, ORANGE, VIOLET, '#FFFFFF']
  return (
    <>
      {Array.from({ length: 70 }, (_, i) => {
        const x0 = rand(seed + i) * w
        const delay = rand(seed + i * 2) * 0.5
        const l = local - delay
        if (l < 0) return null
        const y = -40 + l * (420 + rand(seed + i * 3) * 380) + l * l * 120
        const sway = Math.sin(l * 5 + i) * 30
        const s = 14 + rand(seed + i * 4) * 14
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x0 + sway,
              top: y,
              width: s,
              height: s * 0.55,
              borderRadius: 3,
              background: colors[i % colors.length],
              transform: `rotate(${l * 400 * (rand(seed + i) - 0.5)}deg) scaleX(${Math.cos(l * 9 + i)})`,
            }}
          />
        )
      })}
    </>
  )
}

function Vignette() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at center, transparent 62%, rgba(20, 12, 40, 0.16) 100%)',
      }}
    />
  )
}

/* ------------------------------------------------------------ 1. the logo */

const GLYPHS = [
  { ch: 'A', color: TEAL },
  { ch: '1', color: '#FFB020' },
  { ch: 'Б', color: PINK },
  { ch: '2', color: '#4FA8E8' },
  { ch: 'Oʻ', color: VIOLET },
  { ch: '3', color: ORANGE },
  { ch: 'Ж', color: TEAL },
  { ch: '5', color: PINK },
  { ch: 'B', color: '#FFB020' },
  { ch: 'Я', color: '#4FA8E8' },
  { ch: 'Gʻ', color: VIOLET },
  { ch: '7', color: ORANGE },
]

function LogoScene() {
  const { w, h, portrait, copy } = useStage()
  return (
    <Scene
      id="logo"
      bg={`radial-gradient(circle at 50% 44%, #FFFFFF 0%, #F3FBF8 45%, #CFEDE4 100%)`}
      ring={CREAM}
      from={[0.5, 0.5]}
    >
      {(t) => {
        const logoW = portrait ? 900 : 1040
        const cx = w / 2
        const cy = h * (portrait ? 0.42 : 0.43)
        const zoom = 1 + easeInCubic(prog(t, 3.7, 4.6)) * 0.5
        return (
          <>
            <Rays color="rgba(19,145,126,0.08)" t={t} size={Math.max(w, h) * 1.5} />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: `scale(${zoom})`,
                transformOrigin: `${cx}px ${cy}px`,
              }}
            >
              {/* glow ring */}
              <Abs x={cx} y={cy}>
                <div
                  style={{
                    width: logoW * 1.15,
                    height: logoW * 1.15,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(34,195,166,0.25), transparent 65%)',
                    transform: `scale(${0.2 + 0.8 * easeOutCubic(prog(t, 0, 1.2))})`,
                  }}
                />
              </Abs>

              {/* glyphs fly in from far away and orbit */}
              {GLYPHS.map(({ ch, color }, i) => {
                const angle = (i / GLYPHS.length) * Math.PI * 2 - Math.PI / 2 + t * 0.12
                const rx = logoW * 0.66
                const ry = logoW * (portrait ? 0.5 : 0.3)
                const k = easeOutBack(prog(t, 0.7 + i * 0.05, 1.7 + i * 0.05), 1.4)
                const fx = Math.cos(angle) * w * 0.9
                const fy = Math.sin(angle) * h * 0.9
                const bob = Math.sin(t * 2.4 + i) * 10
                return (
                  <Abs
                    key={ch}
                    x={cx + lerp(fx, Math.cos(angle) * rx, k)}
                    y={cy + lerp(fy, Math.sin(angle) * ry, k) + bob}
                    style={{
                      fontSize: portrait ? 84 : 76,
                      fontWeight: 800,
                      color,
                      opacity: clamp(k * 2),
                      transform: `translate(-50%, -50%) rotate(${(1 - k) * (i % 2 ? 220 : -220)}deg) scale(${lerp(2.6, 1, clamp(k))})`,
                      textShadow: '0 6px 0 rgba(58,46,77,0.08)',
                    }}
                  >
                    {ch}
                  </Abs>
                )
              })}

              {/* the robots jump up from behind the name */}
              {(['girl', 'boy'] as const).map((model, i) => {
                const s = spring(t, 1.25 + i * 0.15, 13, 5)
                const side = i === 0 ? -1 : 1
                return (
                  <Abs
                    key={model}
                    x={cx + side * logoW * 0.5}
                    y={cy - logoW * 0.12 + (1 - s) * 260}
                    style={{
                      opacity: clamp(s * 3),
                      transform: `translate(-50%, -50%) rotate(${side * 9}deg)`,
                    }}
                  >
                    <Bot
                      model={model}
                      mood={t > 2.2 ? 'celebrate' : 'wave'}
                      size={portrait ? 230 : 210}
                    />
                  </Abs>
                )
              })}

              <Abs x={cx} y={cy}>
                <div className="logo-1">
                  <KiddoWordmark animate delay={0.15} />
                </div>
              </Abs>
              <style>{`.logo-1 svg{width:${logoW}px;height:auto;filter:drop-shadow(0 14px 22px rgba(11,111,98,.22))}`}</style>

              <Kinetic
                text={copy.meet}
                at={1.35}
                size={portrait ? 104 : 92}
                x={cx}
                y={cy + logoW * (portrait ? 0.68 : 0.44)}
                maxWidth={w * 0.9}
                color={TEAL_DEEP}
              />
            </div>

            {/* pets peek in at the bottom */}
            {[
              { pet: 'cat', x: 0.1, at: 1.9 },
              { pet: 'bunny', x: 0.27, at: 2.05 },
              { pet: 'parrot', x: 0.73, at: 2.0 },
              { pet: 'hamster', x: 0.9, at: 2.15 },
            ].map(({ pet, x, at }, i) => {
              const s = spring(t, at, 12, 6)
              const size = portrait ? 220 : 190
              return (
                <div
                  key={pet}
                  style={{
                    position: 'absolute',
                    left: x * w - size / 2,
                    top: h - size * 0.78 + (1 - s) * size,
                    transform: `scaleX(${x > 0.5 ? -1 : 1})`,
                  }}
                >
                  <Pet pet={pet} size={size} t={t} phase={i * 0.3} />
                </div>
              )
            })}
          </>
        )
      }}
    </Scene>
  )
}

/* -------------------------------------------------------- 2. the letters */

function LettersScene() {
  const { w, h, portrait, copy } = useStage()
  const start = sceneStart('letters')
  return (
    <Scene
      id="letters"
      bg={`linear-gradient(160deg, #1DB89E 0%, ${TEAL} 55%, ${TEAL_DEEP} 100%)`}
      ring={GOLD}
      from={[0.5, 0.45]}
    >
      {(t) => {
        const T = t + start
        void T
        const cardW = portrait ? 300 : 360
        const cardH = cardW * 1.3
        const gap = portrait ? 36 : 70
        const rowY = h * (portrait ? 0.4 : 0.53)
        const colors = [ORANGE, PINK, VIOLET]
        return (
          <>
            <Pattern color="rgba(255,255,255,0.07)" glyphs="AБOʻ123ЖBЯ" />
            <Kinetic
              text={copy.letters}
              at={0.25}
              size={portrait ? 96 : 92}
              x={w / 2}
              y={h * (portrait ? 0.17 : 0.15)}
              maxWidth={w * (portrait ? 0.9 : 0.86)}
              color="#FFFFFF"
            />
            {copy.cards.map((card, i) => {
              const at = 0.6 + i * 0.28
              const k = prog(t, at, at + 0.7)
              const flip = (1 - easeOutBack(k, 1.6)) * 100
              const x = w / 2 + (i - 1) * (cardW + gap)
              const wobble = Math.sin((t - 2.2) * 2.6 + i) * 10 * prog(t, 2.2, 2.6)
              const spin = easeInOutCubic(prog(t, at + 0.5, at + 1.6)) * 360
              const floatY = Math.sin(t * 2 + i * 1.3) * 10
              return (
                <Abs key={card.letter} x={x} y={rowY + floatY} style={{ perspective: 1400 }}>
                  <div
                    style={{
                      width: cardW,
                      height: cardH,
                      borderRadius: 56,
                      background: '#FFFFFF',
                      boxShadow: '0 22px 0 rgba(8,70,62,0.35), 0 40px 60px rgba(0,0,0,0.18)',
                      opacity: clamp(k * 4),
                      transform: `rotateY(${flip + wobble}deg) translateY(${(1 - easeOutCubic(k)) * 160}px)`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: `${cardW * 0.08}px 0 ${cardW * 0.1}px`,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        fontSize: cardW * 0.36,
                        fontWeight: 800,
                        lineHeight: 1,
                        color: colors[i],
                      }}
                    >
                      {card.letter}
                    </div>
                    <div style={{ perspective: 600 }}>
                      <Picture
                        name={card.picture}
                        size={cardW * 0.46}
                        style={{ transform: `rotateY(${spin}deg)` }}
                      />
                    </div>
                    <div style={{ fontSize: cardW * 0.13, fontWeight: 800, color: INK }}>
                      {card.word}
                    </div>
                  </div>
                </Abs>
              )
            })}
            {portrait && (
              <Abs x={w * 0.5} y={h * 0.8 + (1 - spring(t, 0.9, 12, 6)) * 600}>
                <Bot model="girl" mood={t > 2.4 ? 'happy' : 'talk'} size={380} />
              </Abs>
            )}
            {/* numbers bounce in underneath */}
            {[1, 2, 3, 4, 5].map((n, i) => {
              const at = 2.0 + i * 0.12
              const s = spring(t, at, 16, 6)
              const size = portrait ? 120 : 104
              const x = w / 2 + (i - 2) * size * 1.35
              const y = rowY + cardH / 2 + (portrait ? 170 : 115)
              const beat = Math.max(0, Math.sin(((t - at) / BEAT) * Math.PI)) * 12
              return (
                <Abs key={n} x={x} y={y - beat}>
                  <div
                    style={{
                      width: size,
                      height: size,
                      borderRadius: '50%',
                      background: [GOLD, '#FFFFFF', PINK, SKY, ORANGE][i],
                      color: INK,
                      fontSize: size * 0.56,
                      fontWeight: 800,
                      display: 'grid',
                      placeItems: 'center',
                      transform: `scale(${s})`,
                      boxShadow: '0 8px 0 rgba(0,0,0,0.15)',
                    }}
                  >
                    {n}
                  </div>
                </Abs>
              )
            })}
          </>
        )
      }}
    </Scene>
  )
}

/* ------------------------------------------------------------ 3. the ages */

function AgesScene() {
  const { w, h, portrait, copy } = useStage()
  return (
    <Scene
      id="ages"
      bg={`linear-gradient(180deg, #FFD95E 0%, ${GOLD} 60%, #FFB020 100%)`}
      ring={PINK}
      from={[0.85, 0.2]}
    >
      {(t) => {
        const stepW = portrait ? 300 : 360
        const heights = portrait ? [300, 470, 640] : [210, 330, 450]
        const baseY = h * (portrait ? 0.86 : 0.95)
        const pics = ['teddy-bear', 'kite', 'rocket']
        const colors = [PINK, SKY, VIOLET]
        const xs = [-1, 0, 1].map((d) => w / 2 + d * (stepW + 20))
        const tops = heights.map((hh) => baseY - hh)
        const lands = [0.95, 1.85, 2.75]
        const botSize = portrait ? 200 : 170
        // robot position along the stairs
        let bx = xs[0]! - stepW * 1.25
        let by = tops[0]!
        if (t < lands[0]!) {
          const k = easeOutCubic(prog(t, 0.4, lands[0]!))
          ;[bx, by] = hop(k, [xs[0]! - stepW * 1.2, baseY], [xs[0]!, tops[0]!], 160)
        } else if (t < lands[1]!) {
          ;[bx, by] = hop(
            easeInOutCubic(prog(t, lands[0]! + 0.3, lands[1]!)),
            [xs[0]!, tops[0]!],
            [xs[1]!, tops[1]!],
            130,
          )
        } else if (t < lands[2]!) {
          ;[bx, by] = hop(
            easeInOutCubic(prog(t, lands[1]! + 0.3, lands[2]!)),
            [xs[1]!, tops[1]!],
            [xs[2]!, tops[2]!],
            130,
          )
        } else {
          ;[bx, by] = [xs[2]!, tops[2]!]
        }
        const mood: MascotMood = t > lands[2]! ? 'celebrate' : 'happy'
        return (
          <>
            <Pattern color="rgba(58,46,77,0.06)" glyphs="456★" speed={30} />
            <Kinetic
              text={copy.grows}
              at={0.2}
              size={portrait ? 98 : 92}
              x={w / 2}
              y={h * (portrait ? 0.14 : 0.14)}
              maxWidth={w * 0.9}
            />
            {heights.map((hh, i) => {
              const s = easeOutBack(prog(t, 0.2 + i * 0.12, 0.8 + i * 0.12), 1.4)
              const unlocked = t > lands[i]!
              const lockK = prog(t, lands[i]!, lands[i]! + 0.5)
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: xs[i]! - stepW / 2,
                    top: baseY - hh * s,
                    width: stepW,
                    height: hh * s + 40,
                    borderRadius: '40px 40px 0 0',
                    background: colors[i],
                    boxShadow:
                      'inset 0 -14px 0 rgba(0,0,0,0.12), inset 0 10px 0 rgba(255,255,255,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    paddingTop: 34,
                    boxSizing: 'border-box',
                    color: '#FFFFFF',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ fontSize: 110, fontWeight: 800, lineHeight: 0.9 }}>{i + 4}</div>
                  <div style={{ fontSize: 40, fontWeight: 700, opacity: 0.95 }}>
                    {copy.ageLabel(i + 4)}
                  </div>
                  {hh > 260 && (
                    <div
                      style={{
                        marginTop: 18,
                        transform: `scale(${unlocked ? 1 + 0.25 * Math.sin(lockK * Math.PI) : 0.9})`,
                        opacity: unlocked ? 1 : 0.45,
                        filter: unlocked ? 'none' : 'grayscale(1)',
                      }}
                    >
                      <Picture name={pics[i]!} size={portrait ? 150 : 110} />
                    </div>
                  )}
                  {/* lock that pops off */}
                  <div
                    style={{
                      position: 'absolute',
                      right: 22,
                      top: 22,
                      fontSize: 54,
                      transform: `translate(${lockK * 120}px, ${-Math.sin(lockK * Math.PI) * 120 + lockK * 200}px) rotate(${lockK * 140}deg)`,
                      opacity: 1 - lockK,
                    }}
                  >
                    <LockGlyph />
                  </div>
                </div>
              )
            })}
            {lands.map((at, i) => (
              <Burst
                key={at}
                t={t}
                at={at}
                x={xs[i]!}
                y={tops[i]!}
                colors={['#FFFFFF', TEAL, PINK, SKY]}
                seed={i * 17 + 3}
                radius={200}
              />
            ))}
            <div
              style={{
                position: 'absolute',
                left: bx - botSize / 2,
                top: by - botSize * 1.2 + 14,
              }}
            >
              <Bot model="boy" mood={mood} size={botSize} />
            </div>
          </>
        )
      }}
    </Scene>
  )
}

function LockGlyph() {
  return (
    <svg width="54" height="62" viewBox="0 0 54 62">
      <path
        d="M14 26 V18 a13 13 0 0 1 26 0 V26"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="4" y="24" width="46" height="36" rx="10" fill="#FFFFFF" />
      <circle cx="27" cy="40" r="5" fill={INK} />
    </svg>
  )
}

/* ------------------------------------------------- 4. robots cheer a win */

function CheerScene() {
  const { w, h, portrait, copy } = useStage()
  return (
    <Scene
      id="cheer"
      bg={`radial-gradient(circle at 50% 40%, #8FD0FA 0%, ${SKY} 55%, #3C93D6 100%)`}
      ring={TEAL}
      from={[0.15, 0.8]}
    >
      {(t) => {
        const tap = 1.75
        const right = t > tap
        const tint = prog(t, tap, tap + 0.35) * (1 - prog(t, 3.9, 4.4))
        const cardW = portrait ? 900 : 940
        const cardH = portrait ? 560 : 470
        const cx = w / 2
        const cy = h * (portrait ? 0.42 : 0.53)
        const cardIn = easeOutBack(prog(t, 0.3, 0.95), 1.5)
        const tile = portrait ? 240 : 230
        const options = ['banana', 'red-apple', 'cat']
        // the finger travels to the apple and taps
        const fk = easeInOutCubic(prog(t, 1.0, tap - 0.05))
        const fx = lerp(cx + cardW * 0.55, cx, fk)
        const fy = lerp(cy + cardH * 0.75, cy + 70, fk) + (t > tap - 0.12 && t < tap + 0.1 ? 14 : 0)
        const fingerOut = prog(t, tap + 0.4, tap + 0.8)
        const botSize = portrait ? 300 : 280
        const botY = portrait ? h * 0.8 : cy + 20
        const botDX = portrait ? w * 0.27 : cardW / 2 + botSize * 0.62
        const moodFor = (): MascotMood => (right ? 'happy' : 'talk')
        return (
          <>
            <Pattern color="rgba(255,255,255,0.09)" glyphs="✓★♥" speed={36} />
            <Kinetic
              text={copy.cheer}
              at={0.2}
              size={portrait ? 96 : 90}
              x={w / 2}
              y={h * (portrait ? 0.12 : 0.13)}
              maxWidth={w * 0.92}
              color="#FFFFFF"
            />
            {/* quiz card */}
            <Abs x={cx} y={cy}>
              <div
                style={{
                  width: cardW,
                  height: cardH,
                  borderRadius: 48,
                  background: '#FFFFFF',
                  boxShadow: '0 20px 0 rgba(20,60,110,0.3), 0 40px 70px rgba(0,0,0,0.18)',
                  transform: `scale(${cardIn})`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 34,
                }}
              >
                <div style={{ fontSize: 54, fontWeight: 800 }}>{copy.quiz}</div>
                <div style={{ display: 'flex', gap: 34 }}>
                  {options.map((name, i) => {
                    const isApple = name === 'red-apple'
                    const k = right ? prog(t, tap, tap + 0.3) : 0
                    const pop =
                      isApple && right ? 1 + 0.18 * Math.sin(prog(t, tap, tap + 0.45) * Math.PI) : 1
                    return (
                      <div
                        key={name}
                        style={{
                          position: 'relative',
                          width: tile,
                          height: tile,
                          borderRadius: 40,
                          background: isApple && right ? '#DDF7E6' : '#F5EFE4',
                          border: `8px solid ${isApple && right ? '#22C55E' : '#EADFC9'}`,
                          display: 'grid',
                          placeItems: 'center',
                          opacity: !isApple && right ? 1 - 0.5 * k : 1,
                          transform: `scale(${pop * (0.6 + 0.4 * easeOutBack(prog(t, 0.5 + i * 0.1, 1 + i * 0.1)))})`,
                          boxSizing: 'border-box',
                        }}
                      >
                        <Picture name={name} size={tile * 0.62} />
                        {isApple && right && (
                          <div
                            style={{
                              position: 'absolute',
                              right: -26,
                              top: -26,
                              width: 82,
                              height: 82,
                              borderRadius: '50%',
                              background: '#22C55E',
                              display: 'grid',
                              placeItems: 'center',
                              transform: `scale(${spring(t, tap + 0.05, 18, 6)})`,
                              boxShadow: '0 6px 0 #15803D',
                            }}
                          >
                            <svg width="44" height="44" viewBox="0 0 24 24">
                              <path
                                d="M5 12.5 l4.5 4.5 L19 7.5"
                                fill="none"
                                stroke="#FFFFFF"
                                strokeWidth="3.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </Abs>
            {/* tap ripple + finger */}
            {t > tap - 0.02 && t < tap + 0.6 && (
              <Abs x={cx} y={cy + 70}>
                <div
                  style={{
                    width: 300 * prog(t, tap, tap + 0.6),
                    height: 300 * prog(t, tap, tap + 0.6),
                    borderRadius: '50%',
                    border: '8px solid rgba(255,255,255,0.9)',
                    opacity: 1 - prog(t, tap, tap + 0.6),
                  }}
                />
              </Abs>
            )}
            <Abs x={fx + 40} y={fy + 60} style={{ opacity: clamp(prog(t, 0.9, 1.1) - fingerOut) }}>
              <Hand />
            </Abs>
            <Burst
              t={t}
              at={tap}
              x={cx}
              y={cy + 40}
              colors={['#22C55E', GOLD, '#FFFFFF', PINK]}
              count={18}
              radius={300}
              seed={9}
            />
            {/* the two robots */}
            {(['girl', 'boy'] as const).map((model, i) => {
              const side = i === 0 ? -1 : 1
              const s = spring(t, 0.35 + i * 0.12, 12, 6)
              const praise = copy.praise[i === 0 ? 0 : 1]!
              const bubbleAt = tap + 0.15 + i * 0.35
              const b = easeOutBack(prog(t, bubbleAt, bubbleAt + 0.4), 2)
              return (
                <div key={model}>
                  <Abs x={cx + side * botDX} y={botY + (1 - s) * 400}>
                    <Bot model={model} mood={moodFor()} size={botSize} tint={tint} />
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: 40,
                        fontWeight: 800,
                        color: '#FFFFFF',
                        marginTop: -6,
                        textShadow: '0 3px 0 rgba(0,0,0,0.15)',
                      }}
                    >
                      {model === 'girl' ? 'Pixi' : 'Bipbot'}
                    </div>
                  </Abs>
                  <Abs
                    x={cx + side * botDX + side * (portrait ? -20 : 40)}
                    y={botY - botSize * 0.95}
                    style={{
                      opacity: clamp(b * 2),
                      transform: `translate(-50%, -50%) scale(${b})`,
                    }}
                  >
                    <div
                      style={{
                        background: '#FFFFFF',
                        color: '#16A34A',
                        fontSize: 52,
                        fontWeight: 800,
                        padding: '18px 34px',
                        borderRadius: 40,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 8px 0 rgba(0,0,0,0.12)',
                      }}
                    >
                      {praise}
                    </div>
                  </Abs>
                </div>
              )
            })}
            <Confetti t={t} at={tap} seed={41} w={w} />
          </>
        )
      }}
    </Scene>
  )
}

function Hand() {
  return (
    <svg
      width="120"
      height="140"
      viewBox="0 0 120 140"
      style={{ filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.25))' }}
    >
      <path
        d="M38 12 a12 12 0 0 1 24 0 V62 l6 -2 a11 11 0 0 1 13 7 l1 3 a11 11 0 0 1 14 4 l1 3 a11 11 0 0 1 15 8 V104 a34 34 0 0 1 -34 34 H62 a34 34 0 0 1 -27 -14 L12 92 a11 11 0 0 1 17 -14 l9 10 Z"
        fill="#FFE0C2"
        stroke={INK}
        strokeWidth="6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ---------------------------------------------------------- 5. the shop */

function ShopScene() {
  const { w, h, portrait, copy } = useStage()
  return (
    <Scene
      id="shop"
      bg={`linear-gradient(170deg, #FF9CC1 0%, ${PINK} 50%, #D9578A 100%)`}
      ring={GOLD}
      from={[0.5, 1]}
    >
      {(t) => {
        const coins = Math.round(75 * easeOutCubic(prog(t, 0.6, 1.9)))
        const cx = w / 2
        const botSize = portrait ? 420 : 360
        const botX = portrait ? cx : cx - 40
        const botY = h * (portrait ? 0.63 : 0.6)
        const items = [
          { id: 'cap', at: 2.0, slot: 'head', label: '🧢' },
          { id: 'glasses', at: 2.45, slot: 'face', label: '👓' },
          { id: 'bowtie', at: 2.9, slot: 'neck', label: '🎀' },
        ] as const
        const wearing: Wearing = {}
        for (const item of items) {
          if (t > item.at + 0.45) (wearing as Record<string, string>)[item.slot] = item.id
        }
        const petAt = 3.35
        const petS = spring(t, petAt, 13, 5.5)
        const pillX = portrait ? cx : w * 0.2
        const pillY = portrait ? h * 0.23 : h * 0.42
        return (
          <>
            <Pattern color="rgba(255,255,255,0.1)" glyphs="★♥●" speed={34} />
            <Kinetic
              text={copy.shop}
              at={0.2}
              size={portrait ? 96 : 90}
              x={w / 2}
              y={h * (portrait ? 0.12 : 0.13)}
              maxWidth={w * 0.92}
              color="#FFFFFF"
            />
            {/* coin counter */}
            <Abs
              x={pillX}
              y={pillY}
              style={{ transform: `translate(-50%,-50%) scale(${easeOutBack(prog(t, 0.3, 0.8))})` }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                  background: '#FFFFFF',
                  borderRadius: 999,
                  padding: '18px 46px 18px 22px',
                  boxShadow: '0 10px 0 rgba(150,40,90,0.3)',
                  transform: `scale(${1 + 0.06 * Math.sin(t * 22) * prog(t, 0.6, 0.7) * (1 - prog(t, 1.8, 1.9))})`,
                }}
              >
                <CoinGlyph size={96} spin={t * 3} />
                <span
                  style={{
                    fontSize: 92,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 110,
                  }}
                >
                  {coins}
                </span>
              </div>
            </Abs>
            {/* coins flying into the counter */}
            {Array.from({ length: 12 }, (_, i) => {
              const at = 0.55 + i * 0.1
              const k = easeInOutCubic(prog(t, at, at + 0.55))
              if (k <= 0 || k >= 1) return null
              const sx = rand(i + 4) * w
              const sy = h + 80
              return (
                <Abs
                  key={i}
                  x={lerp(sx, pillX - 90, k)}
                  y={lerp(sy, pillY, k) - Math.sin(k * Math.PI) * 200}
                >
                  <CoinGlyph size={64} spin={t * 6 + i} />
                </Abs>
              )
            })}
            {/* outfit tiles fly onto the robot */}
            {items.map((item, i) => {
              const tileX = portrait ? cx + (i - 1) * 230 : w * 0.8
              const tileY = portrait ? h * 0.33 : h * (0.3 + i * 0.2)
              const appear = easeOutBack(prog(t, 0.9 + i * 0.12, 1.4 + i * 0.12))
              const fly = easeInOutCubic(prog(t, item.at, item.at + 0.45))
              const target = {
                x: botX,
                y:
                  botY - botSize * (item.slot === 'head' ? 0.75 : item.slot === 'face' ? 0.5 : 0.1),
              }
              return (
                <Abs
                  key={item.id}
                  x={lerp(tileX, target.x, fly)}
                  y={lerp(tileY, target.y, fly) - Math.sin(fly * Math.PI) * 120}
                  style={{
                    opacity: 1 - prog(t, item.at + 0.38, item.at + 0.46),
                    transform: `translate(-50%,-50%) scale(${appear * (1 - fly * 0.6)})`,
                  }}
                >
                  <div
                    style={{
                      width: 170,
                      height: 170,
                      borderRadius: 44,
                      background: '#FFFFFF',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 96,
                      boxShadow: '0 10px 0 rgba(150,40,90,0.3)',
                    }}
                  >
                    {item.label}
                  </div>
                </Abs>
              )
            })}
            {items.map((item, i) => (
              <Burst
                key={item.id}
                t={t}
                at={item.at + 0.45}
                x={botX}
                y={
                  botY - botSize * (item.slot === 'head' ? 0.75 : item.slot === 'face' ? 0.5 : 0.1)
                }
                colors={[GOLD, '#FFFFFF', SKY]}
                count={10}
                radius={150}
                seed={i * 11 + 5}
              />
            ))}
            {/* robot */}
            <div
              style={{ position: 'absolute', left: botX - botSize / 2, top: botY - botSize * 0.9 }}
            >
              <Bot
                model="girl"
                mood={t > petAt ? 'celebrate' : t > 2.0 ? 'happy' : 'wave'}
                size={botSize}
                wearing={wearing}
              />
            </div>
            {/* the pet at the robot's feet */}
            <div
              style={{
                position: 'absolute',
                left: botX + botSize * 0.32,
                top: botY + botSize * 0.3 - 180 * petS + 180,
                opacity: clamp(petS * 3),
                transform: `scale(${0.4 + 0.6 * petS})`,
                transformOrigin: '50% 100%',
              }}
            >
              <Pet pet="cat" size={portrait ? 230 : 200} t={t} />
            </div>
            {[0, 1, 2, 3].map((i) => {
              const k = prog(t, petAt + 0.1 + i * 0.12, petAt + 1.2 + i * 0.12)
              if (k <= 0 || k >= 1) return null
              return (
                <Abs
                  key={i}
                  x={botX + botSize * 0.45 + (i - 1.5) * 60 + Math.sin(k * 8 + i) * 20}
                  y={botY + botSize * 0.2 - k * 260}
                  style={{ opacity: 1 - k, fontSize: 60, color: '#FFFFFF' }}
                >
                  ♥
                </Abs>
              )
            })}
            {/* other pets peek from the corners */}
            {[
              { pet: 'bunny', left: true, at: 3.6 },
              { pet: 'parrot', left: false, at: 3.75 },
            ].map(({ pet, left, at }) => {
              const s = spring(t, at, 12, 6)
              const size = portrait ? 220 : 190
              return (
                <div
                  key={pet}
                  style={{
                    position: 'absolute',
                    left: left ? 30 : w - size - 30,
                    top: h - size * 0.8 + (1 - s) * size,
                    transform: `scaleX(${left ? 1 : -1})`,
                  }}
                >
                  <Pet pet={pet} size={size} t={t} phase={0.4} />
                </div>
              )
            })}
          </>
        )
      }}
    </Scene>
  )
}

function CoinGlyph({ size, spin }: { size: number; spin: number }) {
  const sx = Math.abs(Math.cos(spin)) * 0.75 + 0.25
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={{ transform: `scaleX(${sx})`, display: 'block' }}
    >
      <circle cx="24" cy="24" r="21" fill={GOLD} stroke="#E09A12" strokeWidth="4" />
      <path
        d="m24 12 3.6 7.3 8 1.2-5.8 5.6 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.8-5.6 8-1.2z"
        fill="#FFF6CF"
      />
    </svg>
  )
}

/* -------------------------------------------------------- 6. for parents */

function ParentsScene() {
  const { w, h, portrait, copy } = useStage()
  return (
    <Scene
      id="parents"
      bg={`linear-gradient(180deg, ${CREAM} 0%, #F3FBF8 100%)`}
      ring={TEAL}
      from={[0.5, 0.5]}
    >
      {(t) => {
        const panelW = portrait ? 900 : 1240
        const panelH = portrait ? 1180 : 700
        const cx = w / 2
        const cy = h * (portrait ? 0.56 : 0.6)
        const inK = easeOutBack(prog(t, 0.25, 0.9), 1.3)
        const values = [0.82, 0.64, 0.47]
        const barColors = [TEAL, GOLD, PINK]
        const week = [0.35, 0.55, 0.4, 0.7, 0.62, 0.9, 0.78]
        const toastK = easeOutBack(prog(t, 2.4, 2.9), 1.5)
        return (
          <>
            <Pattern color="rgba(19,145,126,0.06)" glyphs="★✓●" speed={22} />
            <Kinetic
              text={copy.parents}
              at={0.2}
              size={portrait ? 96 : 88}
              x={w / 2}
              y={h * (portrait ? 0.12 : 0.13)}
              maxWidth={w * 0.92}
              color={TEAL_DEEP}
            />
            <Abs
              x={cx}
              y={cy}
              style={{
                transform: `translate(-50%,-50%) translateY(${(1 - inK) * 120}px) scale(${0.85 + 0.15 * inK})`,
                opacity: clamp(inK * 2),
              }}
            >
              <div
                style={{
                  width: panelW,
                  height: panelH,
                  borderRadius: 56,
                  background: '#FFFFFF',
                  border: '3px solid #F1E3C8',
                  boxShadow: '0 16px 0 #EADFC9, 0 40px 80px rgba(58,46,77,0.14)',
                  padding: 56,
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: portrait ? 'column' : 'row',
                  gap: 56,
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 30 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                    <div
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: '50%',
                        background: '#DDF4EC',
                        display: 'grid',
                        placeItems: 'center',
                        fontFamily: 'Rubik, sans-serif',
                        fontSize: 52,
                        fontWeight: 800,
                        color: TEAL_DEEP,
                      }}
                    >
                      {copy.child[0]}
                    </div>
                    <div style={{ fontFamily: 'Rubik, sans-serif', fontSize: 56, fontWeight: 800 }}>
                      {copy.child}
                    </div>
                    <div
                      style={{
                        marginLeft: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: '#FFF0C2',
                        borderRadius: 999,
                        padding: '10px 22px',
                        fontSize: 36,
                        fontWeight: 800,
                      }}
                    >
                      <CoinGlyph size={44} spin={0} />
                      75
                    </div>
                  </div>
                  {copy.subjects.map((label, i) => {
                    const k = easeOutCubic(prog(t, 0.7 + i * 0.18, 1.7 + i * 0.18))
                    return (
                      <div key={label}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 36,
                            fontWeight: 800,
                            marginBottom: 10,
                          }}
                        >
                          <span>{label}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums', color: '#5E5470' }}>
                            {Math.round(values[i]! * 100 * k)}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 30,
                            borderRadius: 999,
                            background: '#F5EFE4',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${values[i]! * 100 * k}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: barColors[i],
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontFamily: 'Rubik, sans-serif', fontSize: 40, fontWeight: 800 }}>
                    {copy.week}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 18,
                      borderBottom: '3px solid #F1E3C8',
                      paddingBottom: 6,
                    }}
                  >
                    {week.map((v, i) => {
                      const k = easeOutBack(prog(t, 1.0 + i * 0.09, 1.6 + i * 0.09), 1.3)
                      return (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${v * 100 * k}%`,
                            borderRadius: '16px 16px 6px 6px',
                            background: i === 5 ? TEAL : '#9BE8D6',
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </Abs>
            {/* exit alert toast */}
            <Abs
              x={cx}
              y={cy - panelH / 2 - (portrait ? 40 : 10) + (1 - toastK) * -180}
              style={{
                opacity: clamp(toastK * 2),
                transform: `translate(-50%,-50%) scale(${0.8 + 0.2 * toastK})`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 22,
                  background: INK,
                  color: '#FFFFFF',
                  borderRadius: 32,
                  padding: '22px 40px 22px 26px',
                  fontSize: 40,
                  fontWeight: 800,
                  fontFamily: 'Nunito, sans-serif',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 20px 40px rgba(58,46,77,0.3)',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    background: ORANGE,
                    display: 'grid',
                    placeItems: 'center',
                    transform: `rotate(${Math.sin((t - 2.4) * 18) * 14 * (1 - prog(t, 2.6, 3.4))}deg)`,
                  }}
                >
                  <svg width="38" height="38" viewBox="0 0 24 24">
                    <path
                      d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zm-2.5 15a2.5 2.5 0 0 0 5 0"
                      fill="#FFFFFF"
                    />
                  </svg>
                </div>
                {copy.left}
              </div>
            </Abs>
          </>
        )
      }}
    </Scene>
  )
}

/* ---------------------------------------------------------------- 7. CTA */

function CtaScene() {
  const { w, h, portrait, copy } = useStage()
  return (
    <Scene
      id="cta"
      bg={`radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F3FBF8 50%, #CFEDE4 100%)`}
      ring={GOLD}
      from={[0.5, 0.5]}
    >
      {(t) => {
        const cx = w / 2
        const logoW = portrait ? 860 : 880
        const cy = h * (portrait ? 0.32 : 0.3)
        const pill = easeOutBack(prog(t, 1.6, 2.1), 2)
        const pulse = 1 + 0.04 * Math.sin((Math.max(0, t - 2.1) * Math.PI * 2) / (BEAT * 2))
        const botSize = portrait ? 260 : 250
        return (
          <>
            <Rays color="rgba(255,201,60,0.18)" t={t} size={Math.max(w, h) * 1.6} />
            <Abs x={cx} y={cy}>
              <div className="cta-logo">
                <KiddoWordmark animate delay={0.05} />
              </div>
            </Abs>
            <style>{`.cta-logo svg{width:${logoW}px;height:auto;filter:drop-shadow(0 14px 22px rgba(11,111,98,.22))}`}</style>
            <Kinetic
              text={copy.tagline}
              at={1.0}
              size={portrait ? 92 : 84}
              x={cx}
              y={cy + logoW * 0.36}
              maxWidth={w * 0.9}
              color={TEAL_DEEP}
            />
            <Abs
              x={cx}
              y={h * (portrait ? 0.62 : 0.72)}
              style={{
                transform: `translate(-50%,-50%) scale(${pill * pulse})`,
                opacity: clamp(pill * 2),
              }}
            >
              <div
                style={{
                  background: GOLD,
                  color: INK,
                  fontSize: portrait ? 72 : 64,
                  fontWeight: 800,
                  padding: portrait ? '34px 80px' : '28px 72px',
                  borderRadius: 999,
                  boxShadow: '0 12px 0 #E0A419, 0 30px 50px rgba(224,164,25,0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                {copy.cta}
              </div>
            </Abs>
            <Abs x={cx} y={h * (portrait ? 0.7 : 0.84)} style={{ opacity: prog(t, 2.0, 2.4) }}>
              <div
                style={{
                  fontSize: portrait ? 54 : 46,
                  fontWeight: 800,
                  color: INK,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                kiddo-uz.vercel.app
              </div>
            </Abs>
            <Abs x={cx} y={h * (portrait ? 0.77 : 0.93)} style={{ display: 'flex', gap: 22 }}>
              {(['uz', 'ru', 'en'] as const).map((lang, i) => {
                const s = spring(t, 2.2 + i * 0.1, 14, 6)
                return (
                  <div
                    key={lang}
                    style={{
                      transform: `scale(${s})`,
                      boxShadow: '0 6px 0 rgba(0,0,0,0.12)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      lineHeight: 0,
                    }}
                  >
                    <Flag language={lang} width={portrait ? 120 : 96} />
                  </div>
                )
              })}
            </Abs>
            {(['girl', 'boy'] as const).map((model, i) => {
              const side = i === 0 ? -1 : 1
              const s = spring(t, 0.6 + i * 0.15, 12, 5)
              const x = portrait ? cx + side * w * 0.3 : cx + side * w * 0.39
              const y = portrait ? h * 0.9 : h * 0.7
              return (
                <Abs key={model} x={x} y={y + (1 - s) * 500}>
                  <Bot
                    model={model}
                    mood={t > 2.2 ? 'celebrate' : 'wave'}
                    size={botSize}
                    wearing={model === 'girl' ? { head: 'crown' } : { face: 'glasses' }}
                  />
                </Abs>
              )
            })}
            {[
              { pet: 'cat', x: portrait ? 0.5 : 0.25 },
              { pet: 'guinea-pig', x: portrait ? 0.82 : 0.75 },
            ].map(({ pet, x }, i) => {
              if (portrait && i === 1) return null
              const s = spring(t, 1.2 + i * 0.15, 12, 6)
              const size = portrait ? 200 : 170
              return (
                <div
                  key={pet}
                  style={{
                    position: 'absolute',
                    left: x * w - size / 2,
                    top: h - size * 0.82 + (1 - s) * size,
                  }}
                >
                  <Pet pet={pet} size={size} t={t} phase={i * 0.5} />
                </div>
              )
            })}
            <Confetti t={t} at={1.6} seed={77} w={w} />
          </>
        )
      }}
    </Scene>
  )
}
