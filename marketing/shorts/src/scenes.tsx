import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { C, TITLES, W, type Lang, type ShortId } from './data'
import { DISPLAY } from './fonts'
import {
  Art,
  BigText,
  Card,
  clamp,
  Emoji,
  Ground,
  outEase,
  Robot,
  Sea,
  Sky,
  usePop,
  useProgress,
} from './parts'

export interface SceneProps {
  short: ShortId
  lang: Lang
  /** This scene's length in frames. */
  frames: number
}

type Scene = React.FC<SceneProps>

// ---------------------------------------------------------------------------
// shared scenes
// ---------------------------------------------------------------------------

const HERO: Record<ShortId, string> = {
  water: 'rain-cloud',
  magnet: 'key',
  float: 'boat',
  dayNight: 'crescent-moon',
  planets: 'ringed-planet',
  seed: 'seedling',
}

/** The cartoon's title card. */
export const TitleCard: Scene = ({ short, lang }) => {
  const pop = usePop(2, 12)
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <div
        style={{
          position: 'absolute',
          left: 50,
          right: 50,
          top: 470,
          padding: '34px 30px',
          borderRadius: 48,
          background: 'rgba(255,255,255,0.95)',
          boxShadow: `0 12px 0 ${C.line}`,
          textAlign: 'center',
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 62,
          lineHeight: 1.1,
          color: C.ink,
          scale: String(0.5 + pop * 0.5),
          opacity: pop,
          rotate: `${interpolate(frame, [0, 30], [-4, 0], clamp)}deg`,
        }}
      >
        {TITLES[short][lang]}
      </div>
      <Art name={HERO[short]} x={360} y={290} size={250} delay={6} />
      <Art name="sparkles" x={120} y={420} size={110} delay={10} />
      <Art name="glowing-star" x={610} y={430} size={90} delay={14} />
      <Robot talking={frame > 10 && frame < 30} x={360} y={900} size={330} />
    </AbsoluteFill>
  )
}

const PLAY_TARGET: Record<ShortId, { art: string; label: Record<Lang, string> }> = {
  water: {
    art: 'droplet',
    label: { uz: 'Tomchi sayohati', ru: 'Путешествие капельки', en: 'A droplet’s trip' },
  },
  magnet: { art: 'key', label: { uz: 'Magnit sehri', ru: 'Волшебный магнит', en: 'Magic magnet' } },
  float: {
    art: 'duck',
    label: { uz: 'Suzadimi, cho‘kadimi?', ru: 'Плавает или тонет?', en: 'Float or sink?' },
  },
  dayNight: {
    art: 'crescent-moon',
    label: { uz: 'Osmonga qara!', ru: 'Посмотри на небо!', en: 'Look at the sky!' },
  },
  planets: { art: 'rocket', label: { uz: 'Kosmos', ru: 'Космос', en: 'Space' } },
  seed: {
    art: 'seedling',
    label: { uz: 'Fan laboratoriyasi', ru: 'Научная лаборатория', en: 'Science Lab' },
  },
}

/** The last scene: the game (or the thing to do) it leads to, on a big card. */
export const PlayScene: Scene = ({ short, lang }) => {
  const frame = useCurrentFrame()
  const target = PLAY_TARGET[short]
  const pulse = 1 + Math.sin(frame / 7) * 0.03
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Card x={110} y={250} w={500} h={520} delay={2}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 50,
            textAlign: 'center',
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 46,
            lineHeight: 1.1,
            color: C.ink,
            padding: '0 24px',
          }}
        >
          {target.label[lang]}
        </div>
      </Card>
      <Art name={target.art} x={360} y={430} size={250} delay={8} />
      <div
        style={{
          position: 'absolute',
          left: 220,
          top: 800,
          width: 280,
          height: 96,
          borderRadius: 999,
          background: C.primary,
          boxShadow: '0 10px 0 #0c6b5d',
          color: 'white',
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 54,
          lineHeight: '96px',
          textAlign: 'center',
          scale: String(usePop(16) * pulse),
        }}
      >
        ▶
      </div>
    </AbsoluteFill>
  )
}

/** A rule to remember in big letters, with two pictures beside it. */
const RuleScene: React.FC<
  SceneProps & { text: Record<Lang, string>; left: string; right: string }
> = ({ short, lang, text, left, right }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Card x={50} y={330} w={620} h={340} delay={2}>
      <div />
    </Card>
    <BigText text={text[lang]} y={400} size={58} delay={6} />
    <Art name={left} x={170} y={250} size={170} delay={12} />
    <Art name={right} x={550} y={250} size={170} delay={16} />
  </AbsoluteFill>
)

// ---------------------------------------------------------------------------
// water
// ---------------------------------------------------------------------------

const RainDrops: React.FC<{
  x: number
  y: number
  width: number
  height: number
  count?: number
}> = ({ x, y, width, height, count = 9 }) => {
  const frame = useCurrentFrame()
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const phase = ((frame * 9 + i * 53) % height) / height
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + ((i * 97) % width),
              top: y + phase * height,
              width: 12,
              height: 30,
              borderRadius: 999,
              background: 'linear-gradient(180deg, #bfe6ff, #3b93d6)',
              opacity: 1 - phase * 0.6,
            }}
          />
        )
      })}
    </>
  )
}

const WaterHook: Scene = (props) => (
  <AbsoluteFill>
    <Sky short={props.short} />
    <Art name="rain-cloud" x={360} y={360} size={330} delay={2} />
    <RainDrops x={230} y={480} width={260} height={360} />
    <Ground top={860} />
    <Art name="umbrella" x={200} y={790} size={150} delay={14} />
  </AbsoluteFill>
)

const WaterSunSea: Scene = (props) => {
  const glow = useProgress(10, 60)
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Art name="sun" x={360} y={300} size={260} delay={2} />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 640,
          height: 260,
          background: `radial-gradient(ellipse at 50% 0%, rgba(255,201,60,${0.55 * glow}), transparent 70%)`,
        }}
      />
      <Sea top={700} />
    </AbsoluteFill>
  )
}

const WaterSteam: Scene = (props) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Art name="sun" x={130} y={220} size={170} delay={0} />
      {Array.from({ length: 7 }, (_, i) => {
        const t = ((frame + i * 14) % 90) / 90
        return (
          <Art
            key={i}
            name="droplet"
            x={140 + i * 75}
            y={800 - t * 560}
            size={80}
            delay={i * 4}
            style={{ opacity: Math.sin(t * Math.PI) }}
          />
        )
      })}
      <Sea top={760} />
    </AbsoluteFill>
  )
}

const WaterCloud: Scene = (props) => {
  const grow = useProgress(4, 70)
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      {[0, 1, 2, 3].map((i) => (
        <Art
          key={i}
          name="droplet"
          x={interpolate(grow, [0, 1], [120 + i * 160, 360], clamp)}
          y={interpolate(grow, [0, 1], [760, 400], clamp)}
          size={70}
          delay={i * 3}
          style={{ opacity: 1 - grow }}
        />
      ))}
      <Art name="cloud" x={360} y={380} size={140 + grow * 240} delay={6} />
      <Sea top={860} />
    </AbsoluteFill>
  )
}

const WaterRain: Scene = (props) => {
  const heavy = useProgress(0, 30)
  return (
    <AbsoluteFill>
      <Sky short={props.short} night={0.25 * heavy} />
      <Art name="rain-cloud" x={360} y={320} size={380} delay={0} />
      <RainDrops x={180} y={440} width={380} height={460} count={14} />
      <Ground top={860} />
      <Art name="tulip" x={360} y={800} size={140 + heavy * 40} delay={10} />
    </AbsoluteFill>
  )
}

const CycleArrow: React.FC<{ progress: number }> = ({ progress }) => {
  const r = 230
  const length = 2 * Math.PI * r
  return (
    <svg
      style={{ position: 'absolute', left: 130, top: 230 }}
      width={460}
      height={460}
      viewBox="-240 -240 480 480"
    >
      <circle
        r={r}
        fill="none"
        stroke="rgba(47,127,196,0.85)"
        strokeWidth={16}
        strokeLinecap="round"
        strokeDasharray={`${length * progress} ${length}`}
        transform="rotate(-90)"
      />
    </svg>
  )
}

const WaterCycle: Scene = (props) => {
  const p = useProgress(6, Math.max(30, props.frames - 30))
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <CycleArrow progress={p} />
      <Art name="sun" x={360} y={460} size={150} delay={0} />
      <Art name="cloud" x={360} y={225} size={150} delay={6} />
      <Art name="rain-cloud" x={590} y={460} size={140} delay={12} />
      <Art name="mountain" x={360} y={700} size={150} delay={18} />
      <Art name="wave" x={130} y={460} size={140} delay={24} />
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// magnet
// ---------------------------------------------------------------------------

const MagnetHook: Scene = (props) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Emoji
        char="🧲"
        x={360}
        y={430}
        size={330}
        delay={2}
        style={{ rotate: `${Math.sin(frame / 10) * 8}deg` }}
      />
      <Art name="sparkles" x={170} y={260} size={130} delay={10} />
      <Art name="sparkles" x={560} y={620} size={110} delay={16} />
    </AbsoluteFill>
  )
}

const MagnetKey: Scene = (props) => {
  const fly = useProgress(24, 44)
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Emoji char="🧲" x={360} y={260} size={240} delay={0} style={{ rotate: '180deg' }} />
      <Art
        name="key"
        x={360}
        y={interpolate(fly, [0, 1], [760, 420], clamp)}
        size={170}
        delay={4}
        float={fly > 0.98 ? 0 : 8}
        rotate={fly * 30}
      />
      {fly > 0.95 && <Art name="sparkles" x={470} y={380} size={110} delay={44} />}
    </AbsoluteFill>
  )
}

const MagnetApple: Scene = (props) => {
  const frame = useCurrentFrame()
  const wobble = frame > 24 && frame < 54 ? Math.sin(frame) * 8 : 0
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Emoji
        char="🧲"
        x={360}
        y={260}
        size={240}
        delay={0}
        style={{ rotate: '180deg', translate: `${wobble}px 0px` }}
      />
      <Art name="apple" x={360} y={760} size={190} delay={4} float={2} />
      <Emoji char="✖️" x={520} y={640} size={110} delay={40} />
    </AbsoluteFill>
  )
}

const MagnetSort: Scene = (props) => {
  const yes = ['spoon', 'key']
  const no = ['pencil', 'ball', 'maple-leaf']
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Card x={40} y={190} w={640} h={300} delay={0} color="rgba(221,244,236,0.95)" />
      <Card x={40} y={540} w={640} h={300} delay={6} color="rgba(255,228,211,0.95)" />
      <Emoji char="✅" x={95} y={240} size={70} delay={4} />
      <Emoji char="❌" x={95} y={590} size={70} delay={10} />
      {yes.map((name, i) => (
        <Art key={name} name={name} x={190 + i * 140} y={350} size={130} delay={10 + i * 8} />
      ))}
      <Emoji char="🔩" x={470} y={350} size={120} delay={26} />
      <Emoji char="📎" x={600} y={350} size={110} delay={32} />
      {no.map((name, i) => (
        <Art key={name} name={name} x={200 + i * 160} y={700} size={140} delay={30 + i * 8} />
      ))}
    </AbsoluteFill>
  )
}

const MagnetFridge: Scene = (props) => {
  const stick = useProgress(14, 34)
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <div
        style={{
          position: 'absolute',
          left: 170,
          top: 150,
          width: 380,
          height: 760,
          borderRadius: 48,
          background: 'linear-gradient(90deg, #f3f6fa, #dfe6ee)',
          boxShadow: '0 14px 0 #c9d2dd',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 250,
            height: 8,
            background: '#c9d2dd',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 30,
            top: 120,
            width: 16,
            height: 90,
            borderRadius: 9,
            background: '#b6c0cc',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 230,
          top: interpolate(stick, [0, 1], [120, 360], clamp),
          width: 240,
          height: 260,
          borderRadius: 20,
          background: 'white',
          rotate: `${interpolate(stick, [0, 1], [-14, -4], clamp)}deg`,
          boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 16,
            borderRadius: 12,
            background: 'linear-gradient(180deg,#8fd3ff,#e6f6ff)',
          }}
        />
      </div>
      <Art name="sun-face" x={350} y={510} size={120} delay={30} float={0} />
      <Emoji
        char="🧲"
        x={350}
        y={interpolate(stick, [0, 1], [130, 370], clamp)}
        size={90}
        delay={0}
      />
    </AbsoluteFill>
  )
}

const MAGNET_RULE = {
  uz: 'Magnit temirni tortadi',
  ru: 'Магнит тянет железо',
  en: 'A magnet pulls iron',
}

// ---------------------------------------------------------------------------
// float
// ---------------------------------------------------------------------------

const Tank: React.FC = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: 420,
        height: 520,
        borderRadius: '0 0 60px 60px',
        background: 'linear-gradient(180deg, rgba(127,198,242,0.85), rgba(47,127,196,0.95))',
        borderTop: '10px solid #a8dcfa',
      }}
    />
  </>
)

const FloatHook: Scene = (props) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Art name="boat" x={240} y={600 + Math.sin(frame / 9) * 8} size={240} delay={2} float={0} />
      <Art
        name="rock"
        x={520}
        y={interpolate(frame, [20, 60], [560, 860], clamp)}
        size={150}
        delay={8}
        float={0}
      />
      <Sea top={660} />
    </AbsoluteFill>
  )
}

const Dropping: React.FC<{ name: string; floats: boolean; x: number; delay?: number }> = ({
  name,
  floats,
  x,
  delay = 0,
}) => {
  const frame = useCurrentFrame()
  const t = frame - delay
  const fall = interpolate(t, [0, 18], [200, 430], { ...clamp, easing: outEase })
  const y = floats
    ? fall + interpolate(t, [18, 30, 44], [0, 30, 12], clamp) + Math.sin(t / 8) * (t > 44 ? 6 : 0)
    : interpolate(t, [0, 18, 60], [200, 440, 830], { ...clamp, easing: outEase })
  return (
    <Art name={name} x={x} y={y} size={170} delay={delay} float={0} rotate={floats ? 0 : t * 0.4} />
  )
}

const Bubbles: React.FC<{ x: number; from: number }> = ({ x, from }) => {
  const frame = useCurrentFrame()
  if (frame < from) return null
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => {
        const t = ((frame - from + i * 9) % 40) / 40
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x + Math.sin(i * 2 + t * 6) * 30,
              top: 820 - t * 360,
              width: 18 + (i % 3) * 8,
              height: 18 + (i % 3) * 8,
              borderRadius: 999,
              border: '4px solid rgba(255,255,255,0.8)',
              opacity: 1 - t,
            }}
          />
        )
      })}
    </>
  )
}

const FloatDuck: Scene = (props) => (
  <AbsoluteFill>
    <Sky short={props.short} />
    <Tank />
    <Dropping name="duck" floats x={360} delay={8} />
  </AbsoluteFill>
)

const FloatStone: Scene = (props) => (
  <AbsoluteFill>
    <Sky short={props.short} />
    <Tank />
    <Dropping name="rock" floats={false} x={360} delay={8} />
    <Bubbles x={350} from={26} />
  </AbsoluteFill>
)

const FloatPairs: Scene = (props) => (
  <AbsoluteFill>
    <Sky short={props.short} />
    <Tank />
    <Dropping name="apple" floats x={180} delay={4} />
    <Dropping name="key" floats={false} x={540} delay={20} />
    <Dropping name="maple-leaf" floats x={300} delay={40} />
    <Emoji char="🪙" x={460} y={810} size={110} delay={56} />
  </AbsoluteFill>
)

const FloatShip: Scene = (props) => {
  const frame = useCurrentFrame()
  const inside = useProgress(20, 50)
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 330 + Math.sin(frame / 10) * 8,
          width: 480,
          height: 300,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '0 0 180px 180px',
            background: '#e2552d',
            boxShadow: '0 10px 0 #b23a1a',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            top: 30,
            bottom: 60,
            borderRadius: '0 0 140px 140px',
            background: `rgba(255,255,255,${0.15 + inside * 0.75})`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 90,
            textAlign: 'center',
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 64,
            color: C.inkSoft,
            opacity: inside,
          }}
        >
          💨 💨 💨
        </div>
      </div>
      <Sea top={560} />
    </AbsoluteFill>
  )
}

const FLOAT_RULE = {
  uz: 'Yengil suzadi, og‘ir cho‘kadi',
  ru: 'Лёгкое плавает, тяжёлое тонет',
  en: 'Light floats, heavy sinks',
}

// ---------------------------------------------------------------------------
// day and night
// ---------------------------------------------------------------------------

/** The Earth as a turning ball, half lit from the left by the Sun. */
const Earth: React.FC<{
  x: number
  y: number
  size: number
  spin: number
  lit?: 'left' | 'none'
}> = ({ x, y, size, spin, lit = 'left' }) => {
  const pop = usePop(2)
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: 999,
        overflow: 'hidden',
        scale: String(pop),
        background: '#3b8fd9',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: ([18, 46, 66][i]! * size) / 100,
            left: `${((spin * 100 + i * 37) % 140) - 40}%`,
            width: size * [0.34, 0.24, 0.3][i]!,
            height: size * [0.22, 0.3, 0.16][i]!,
            borderRadius: '45% 55% 50% 40%',
            background: '#5cb85c',
          }}
        />
      ))}
      {lit === 'left' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 48%, rgba(10,10,40,0.62) 52%, rgba(10,10,40,0.7) 100%)',
          }}
        />
      )}
    </div>
  )
}

const DayHook: Scene = (props) => {
  const frame = useCurrentFrame()
  const swap = interpolate(Math.sin(frame / 24), [-1, 1], [0, 1])
  return (
    <AbsoluteFill>
      <Sky short={props.short} night={swap * 0.75} />
      <Art
        name="sun"
        x={360}
        y={360}
        size={260}
        delay={2}
        style={{ opacity: 1 - swap }}
        float={4}
      />
      <Art
        name="crescent-moon"
        x={360}
        y={360}
        size={220}
        delay={2}
        style={{ opacity: swap }}
        float={4}
      />
      <Art name="house" x={360} y={770} size={240} delay={8} float={0} />
      <Ground top={860} />
    </AbsoluteFill>
  )
}

const DayEarth: Scene = (props) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={props.short} night={0.6} />
      <Earth x={360} y={500} size={420} spin={frame / 160} lit="none" />
      <svg style={{ position: 'absolute', left: 120, top: 230 }} width={480} height={120}>
        <path
          d="M30,90 Q240,-20 450,90"
          fill="none"
          stroke={C.coin}
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path d="M450,90 l-30,-4 l14,-26 z" fill={C.coin} />
      </svg>
    </AbsoluteFill>
  )
}

const DayDay: Scene = (props) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={props.short} night={0.7} />
      <Art name="sun" x={110} y={500} size={200} delay={0} />
      <Earth x={470} y={500} size={360} spin={frame / 200} />
      <Emoji char="🧒" x={330} y={420} size={90} delay={10} />
      <div
        style={{
          position: 'absolute',
          left: 190,
          top: 495,
          width: 120,
          height: 10,
          borderRadius: 9,
          background: 'rgba(255,201,60,0.8)',
        }}
      />
    </AbsoluteFill>
  )
}

const DayNight: Scene = (props) => {
  const frame = useCurrentFrame()
  const turn = useProgress(6, 60)
  return (
    <AbsoluteFill>
      <Sky short={props.short} night={0.8} />
      <Art name="sun" x={110} y={500} size={200} delay={0} />
      <Earth x={470} y={500} size={360} spin={frame / 200 + turn * 0.5} />
      <Emoji
        char="😴"
        x={interpolate(turn, [0, 1], [330, 610], clamp)}
        y={interpolate(turn, [0, 1], [420, 560], clamp)}
        size={90}
        delay={4}
      />
      <Art name="glowing-star" x={620} y={230} size={80} delay={30} />
      <Art name="glowing-star" x={520} y={160} size={60} delay={36} />
    </AbsoluteFill>
  )
}

const DayTurn: Scene = (props) => {
  const p = useProgress(4, Math.max(30, props.frames - 20))
  return (
    <AbsoluteFill>
      <Sky short={props.short} night={0.7} />
      <Earth x={360} y={480} size={380} spin={p} />
      <svg
        style={{ position: 'absolute', left: 110, top: 230 }}
        width={500}
        height={500}
        viewBox="-250 -250 500 500"
      >
        <circle
          r={230}
          fill="none"
          stroke="rgba(255,201,60,0.9)"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 230 * p} 2000`}
          transform="rotate(-90)"
        />
      </svg>
      <BigText text={`${Math.round(p * 24)} h`} y={760} size={70} color="#ffffff" />
    </AbsoluteFill>
  )
}

const DayStars: Scene = (props) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={props.short} night={0.85} />
      <Art name="full-moon" x={520} y={290} size={220} delay={2} />
      {Array.from({ length: 9 }, (_, i) => (
        <Art
          key={i}
          name={i % 3 === 0 ? 'glowing-star' : 'star'}
          x={80 + ((i * 173) % 560)}
          y={160 + ((i * 97) % 420)}
          size={50 + (i % 3) * 18}
          delay={6 + i * 4}
          style={{ opacity: 0.6 + 0.4 * Math.sin((frame + i * 11) / 8) }}
        />
      ))}
      <Art name="house" x={260} y={800} size={220} delay={10} float={0} />
      <Ground top={880} color="#3d5f4a" />
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// planets
// ---------------------------------------------------------------------------

const PLANETS = [
  { color: '#b7a89a', size: 22 },
  { color: '#e8c27a', size: 32 },
  { color: '#3b8fd9', size: 34 },
  { color: '#d9654b', size: 28 },
  { color: '#e0a86b', size: 70 },
  { color: '#e8d08f', size: 58 },
  { color: '#8fd8e8', size: 44 },
  { color: '#4f6fd9', size: 42 },
]

const SolarSystem: React.FC<{ highlight?: number; count?: number; speed?: number }> = ({
  highlight,
  count = 8,
  speed = 1,
}) => {
  const frame = useCurrentFrame()
  const cx = 360
  const cy = 500
  return (
    <>
      {PLANETS.slice(0, 8).map((planet, i) => {
        const r = 95 + i * 34
        return (
          <div
            key={`o${i}`}
            style={{
              position: 'absolute',
              left: cx - r,
              top: cy - r * 0.72,
              width: r * 2,
              height: r * 1.44,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.18)',
            }}
          />
        )
      })}
      <Art name="sun" x={cx} y={cy} size={140} delay={0} float={0} />
      {PLANETS.slice(0, count).map((planet, i) => {
        const r = 95 + i * 34
        const angle = (frame * speed) / (40 + i * 18) + i * 1.3
        const lit = highlight === undefined || highlight === i
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: cx + Math.cos(angle) * r - planet.size / 2,
              top: cy + Math.sin(angle) * r * 0.72 - planet.size / 2,
              width: planet.size,
              height: planet.size,
              borderRadius: 999,
              background: `radial-gradient(circle at 35% 30%, #ffffff88, ${planet.color} 45%)`,
              opacity: lit ? 1 : 0.35,
              scale: highlight === i ? '1.6' : '1',
              boxShadow: highlight === i ? '0 0 30px rgba(255,255,255,0.8)' : 'none',
            }}
          />
        )
      })}
    </>
  )
}

const PlanetsHook: Scene = (props) => (
  <AbsoluteFill>
    <Sky short={props.short} />
    <Art name="sun-face" x={360} y={480} size={360} delay={2} />
    <Art name="ringed-planet" x={140} y={250} size={130} delay={14} />
    <Art name="comet" x={580} y={760} size={140} delay={20} />
  </AbsoluteFill>
)

const PlanetsOrbits: Scene = (props) => (
  <AbsoluteFill>
    <Sky short={props.short} />
    <SolarSystem speed={3} />
  </AbsoluteFill>
)

const PlanetsEarth: Scene = (props) => (
  <AbsoluteFill>
    <Sky short={props.short} />
    <SolarSystem highlight={2} speed={1.4} />
    <Emoji char="🏠" x={360} y={190} size={100} delay={14} />
  </AbsoluteFill>
)

const PlanetsJupiter: Scene = (props) => {
  const pop = usePop(30)
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <div
        style={{
          position: 'absolute',
          left: 70,
          top: 260,
          width: 340,
          height: 340,
          borderRadius: 999,
          background:
            'repeating-linear-gradient(180deg, #e0a86b 0 34px, #c9824d 34px 52px, #f0cfa0 52px 80px)',
          boxShadow: 'inset -40px -30px 60px rgba(0,0,0,0.35)',
          scale: String(usePop(4)),
        }}
      />
      <Art name="ringed-planet" x={540} y={650} size={260} delay={30} />
      <div style={{ position: 'absolute', left: 500, top: 330, scale: String(pop) }}>
        <Emoji char="🔭" x={50} y={50} size={100} delay={30} />
      </div>
    </AbsoluteFill>
  )
}

const PlanetsCount: Scene = (props) => {
  const frame = useCurrentFrame()
  const shown = Math.min(8, Math.floor((frame / Math.max(1, props.frames - 30)) * 9))
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      {PLANETS.map((planet, i) => {
        const visible = i < shown
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 70 + (i % 4) * 150,
              top: 260 + Math.floor(i / 4) * 300,
              width: 120,
              height: 120,
              borderRadius: 999,
              background: `radial-gradient(circle at 35% 30%, #ffffff88, ${planet.color} 45%)`,
              scale: visible ? '1' : '0',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 130,
                textAlign: 'center',
                fontFamily: DISPLAY,
                fontWeight: 800,
                fontSize: 52,
                color: '#ffffff',
              }}
            >
              {i + 1}
            </div>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

const PlanetsRocket: Scene = (props) => {
  const fly = useProgress(6, Math.max(40, props.frames))
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Art name="full-moon" x={560} y={240} size={180} delay={0} />
      <Art
        name="rocket"
        x={interpolate(fly, [0, 1], [180, 520], clamp)}
        y={interpolate(fly, [0, 1], [860, 330], clamp)}
        size={230}
        delay={2}
        float={4}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <Art
          key={i}
          name="star"
          x={90 + i * 130}
          y={150 + (i % 2) * 520}
          size={50}
          delay={10 + i * 3}
        />
      ))}
    </AbsoluteFill>
  )
}

// ---------------------------------------------------------------------------
// seed
// ---------------------------------------------------------------------------

const Soil: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 640,
      bottom: 0,
      background: 'linear-gradient(180deg, #8a5a3b 0%, #6b432b 100%)',
      borderTop: '18px solid #5f9e4f',
    }}
  />
)

const SeedHook: Scene = (props) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Art name="chestnut" x={360} y={470} size={260} delay={2} rotate={Math.sin(frame / 12) * 6} />
      <Emoji char="❓" x={560} y={300} size={120} delay={20} />
    </AbsoluteFill>
  )
}

const SeedSoil: Scene = (props) => {
  const sink = useProgress(4, 30)
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Soil />
      <Art
        name="chestnut"
        x={360}
        y={interpolate(sink, [0, 1], [450, 730], clamp)}
        size={110}
        delay={0}
        float={0}
      />
      <Art name="bucket" x={560} y={420} size={170} delay={18} rotate={-30} />
      <RainDropsSmall />
    </AbsoluteFill>
  )
}

const RainDropsSmall: React.FC = () => {
  const frame = useCurrentFrame()
  if (frame < 30) return null
  return (
    <>
      {[0, 1, 2].map((i) => {
        const t = ((frame - 30 + i * 9) % 30) / 30
        return (
          <Art
            key={i}
            name="droplet"
            x={480 - i * 30}
            y={480 + t * 200}
            size={50}
            delay={30}
            float={0}
            style={{ opacity: 1 - t }}
          />
        )
      })}
    </>
  )
}

const SeedSprout: Scene = (props) => {
  const grow = useProgress(4, Math.max(30, props.frames - 10))
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Soil />
      <svg style={{ position: 'absolute', left: 0, top: 0 }} width={W} height={1280}>
        <path
          d={`M360,700 C340,${760 + grow * 60} 390,${800 + grow * 80} 350,${720 + grow * 200}`}
          fill="none"
          stroke="#f1e3c8"
          strokeWidth={10}
          strokeLinecap="round"
        />
        <path
          d={`M360,690 L360,${690 - grow * 170}`}
          stroke="#3f9a3a"
          strokeWidth={14}
          strokeLinecap="round"
        />
      </svg>
      <Art
        name="chestnut"
        x={360}
        y={700}
        size={90}
        delay={0}
        float={0}
        style={{ opacity: 1 - grow }}
      />
      <Art
        name="seedling"
        x={360}
        y={690 - grow * 210}
        size={60 + grow * 110}
        delay={0}
        float={0}
      />
    </AbsoluteFill>
  )
}

const SeedSun: Scene = (props) => {
  const open = useProgress(6, 50)
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Art name="sun" x={140} y={220} size={200} delay={0} />
      <div
        style={{
          position: 'absolute',
          left: 140,
          top: 220,
          width: 400,
          height: 12,
          borderRadius: 9,
          transformOrigin: '0 50%',
          rotate: '40deg',
          background: 'rgba(255,201,60,0.7)',
          scale: `${open} 1`,
        }}
      />
      <Soil />
      <Art name="herb" x={380} y={560} size={140 + open * 120} delay={0} float={2} />
    </AbsoluteFill>
  )
}

const SeedBloom: Scene = (props) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill>
      <Sky short={props.short} />
      <Soil />
      <Art name="sunflower" x={360} y={470} size={360} delay={2} float={3} />
      <Art
        name="bee"
        x={360 + Math.cos(frame / 14) * 210}
        y={330 + Math.sin(frame / 9) * 70}
        size={100}
        delay={20}
        float={0}
      />
    </AbsoluteFill>
  )
}

const SEED_RULE = {
  uz: 'Suv + quyosh + tuproq',
  ru: 'Вода + солнце + земля',
  en: 'Water + sun + soil',
}

// ---------------------------------------------------------------------------

export const SCENES: Record<ShortId, Record<string, Scene>> = {
  water: {
    hook: WaterHook,
    sunSea: WaterSunSea,
    steam: WaterSteam,
    cloud: WaterCloud,
    rain: WaterRain,
    cycle: WaterCycle,
    play: PlayScene,
  },
  magnet: {
    hook: MagnetHook,
    key: MagnetKey,
    apple: MagnetApple,
    sort: MagnetSort,
    fridge: MagnetFridge,
    rule: (props) => <RuleScene {...props} text={MAGNET_RULE} left="key" right="spoon" />,
    play: PlayScene,
  },
  float: {
    hook: FloatHook,
    duck: FloatDuck,
    stone: FloatStone,
    pairs: FloatPairs,
    ship: FloatShip,
    rule: (props) => <RuleScene {...props} text={FLOAT_RULE} left="duck" right="rock" />,
    play: PlayScene,
  },
  dayNight: {
    hook: DayHook,
    earth: DayEarth,
    day: DayDay,
    night: DayNight,
    turn: DayTurn,
    stars: DayStars,
    play: PlayScene,
  },
  planets: {
    hook: PlanetsHook,
    orbits: PlanetsOrbits,
    earth: PlanetsEarth,
    jupiter: PlanetsJupiter,
    count: PlanetsCount,
    rocket: PlanetsRocket,
    play: PlayScene,
  },
  seed: {
    hook: SeedHook,
    soil: SeedSoil,
    sprout: SeedSprout,
    sun: SeedSun,
    bloom: SeedBloom,
    rule: (props) => <RuleScene {...props} text={SEED_RULE} left="droplet" right="sun" />,
    play: PlayScene,
  },
}

/** Which scenes happen at night (the caption turns dark to stay readable). */
export const DARK_SCENES = new Set([
  'dayNight:earth',
  'dayNight:day',
  'dayNight:night',
  'dayNight:turn',
  'dayNight:stars',
  'planets:hook',
  'planets:orbits',
  'planets:earth',
  'planets:jupiter',
  'planets:count',
  'planets:rocket',
  'planets:play',
])
