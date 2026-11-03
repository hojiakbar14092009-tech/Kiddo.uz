import React from 'react'
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { C, type Lang } from './data'
import { DISPLAY } from './fonts'
import { Art, BigText, Card, clamp, Emoji, Ground, Sea, Sky, useProgress } from './parts'
import type { SceneProps } from './scenes'

/*
 * The cartoons of the seven newer games (Phase 68): the magic scale, the robot
 * programmer, the word train, the little shop, the shape builder, who lives where
 * and the healthy plate. Same pieces as the first six (parts.tsx).
 */

type Scene = React.FC<SceneProps>

// --- the magic scale -------------------------------------------------------

const Balance: React.FC<{ lean: number; left: string[]; right: React.ReactNode }> = ({
  lean,
  left,
  right,
}) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: 340,
        top: 420,
        width: 40,
        height: 380,
        borderRadius: 20,
        background: C.inkSoft,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 250,
        top: 780,
        width: 220,
        height: 60,
        borderRadius: '40px 40px 8px 8px',
        background: C.inkSoft,
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 90,
        top: 410,
        width: 540,
        height: 22,
        borderRadius: 11,
        background: C.ink,
        rotate: `${-lean}deg`,
      }}
    >
      {[0, 1].map((side) => (
        <div
          key={side}
          style={{
            position: 'absolute',
            top: 11,
            left: side === 0 ? -20 : 360,
            width: 200,
            rotate: `${lean}deg`,
            transformOrigin: '50% 0%',
          }}
        >
          <div style={{ margin: '0 auto', width: 4, height: 110, background: C.inkSoft }} />
          <div
            style={{
              height: 110,
              borderRadius: '0 0 90px 90px',
              borderTop: `10px solid ${C.inkSoft}`,
              background: 'rgba(255,255,255,0.95)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 4,
              paddingBottom: 14,
            }}
          >
            {side === 0
              ? left.map((name, i) => (
                  <Img
                    key={i}
                    src={staticFile(`art/${name}.webp`)}
                    style={{ width: 52, height: 52 }}
                  />
                ))
              : right}
          </div>
        </div>
      ))}
    </div>
    <div
      style={{
        position: 'absolute',
        left: 344,
        top: 404,
        width: 32,
        height: 32,
        borderRadius: 16,
        background: C.coin,
      }}
    />
  </>
)

const NumberBlock: React.FC<{ n: number; colour: string }> = ({ n, colour }) => (
  <div
    style={{
      width: 64,
      height: 64,
      borderRadius: 14,
      background: colour,
      color: 'white',
      fontFamily: DISPLAY,
      fontWeight: 800,
      fontSize: 40,
      lineHeight: '64px',
      textAlign: 'center',
    }}
  >
    {n}
  </div>
)

const ScaleHook: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Emoji char="⚖️" x={360} y={460} size={360} delay={2} />
    <Art name="sparkles" x={160} y={260} size={120} delay={12} />
  </AbsoluteFill>
)

const ScaleHeavy: Scene = ({ short }) => {
  const lean = interpolate(useProgress(4, 40), [0, 1], [0, 14])
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Balance lean={lean} left={['apple', 'apple', 'apple']} right={null} />
    </AbsoluteFill>
  )
}

const ScaleAdd: Scene = ({ short }) => {
  const frame = useCurrentFrame()
  const one = frame > 24
  const two = frame > 48
  const lean = two ? 0 : one ? 5 : 14
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Balance
        lean={interpolate(frame, [0, 24, 30, 48, 56], [14, 14, 5, 5, lean], clamp)}
        left={['apple', 'apple', 'apple']}
        right={
          <>
            {one && <NumberBlock n={2} colour={C.primary} />}
            {two && <NumberBlock n={1} colour={C.sky} />}
          </>
        }
      />
    </AbsoluteFill>
  )
}

const ScaleEven: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Balance
      lean={0}
      left={['apple', 'apple', 'apple']}
      right={
        <>
          <NumberBlock n={2} colour={C.primary} />
          <NumberBlock n={1} colour={C.sky} />
        </>
      }
    />
    <Art name="sparkles" x={360} y={300} size={150} delay={6} />
  </AbsoluteFill>
)

const RuleCard: React.FC<
  SceneProps & { text: Record<Lang, string>; left: string; right: string }
> = ({ short, lang, text, left, right }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Card x={50} y={330} w={620} h={340} delay={2} />
    {/* the rule wraps inside its card, centred below the two pictures (Phase 72) */}
    <BigText text={text[lang]} y={400} height={250} inset={90} size={58} delay={6} />
    <Art name={left} x={170} y={250} size={170} delay={12} />
    <Art name={right} x={550} y={250} size={170} delay={16} />
  </AbsoluteFill>
)

// --- the robot programmer ------------------------------------------------------

const GRID = { x: 120, y: 240, cell: 120 }
const Board: React.FC<{
  robot: { x: number; y: number }
  battery: { x: number; y: number }
  rocks?: { x: number; y: number }[]
}> = ({ robot, battery, rocks = [] }) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: GRID.x - 16,
        top: GRID.y - 16,
        width: GRID.cell * 4 + 32,
        height: GRID.cell * 4 + 32,
        borderRadius: 40,
        background: '#eee6fb',
      }}
    />
    {Array.from({ length: 16 }, (_, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: GRID.x + (i % 4) * GRID.cell + 6,
          top: GRID.y + Math.floor(i / 4) * GRID.cell + 6,
          width: GRID.cell - 12,
          height: GRID.cell - 12,
          borderRadius: 18,
          background: (i + Math.floor(i / 4)) % 2 ? 'rgba(255,255,255,0.7)' : 'white',
        }}
      />
    ))}
    {rocks.map((rock, i) => (
      <Img
        key={i}
        src={staticFile('art/rock.webp')}
        style={{
          position: 'absolute',
          left: GRID.x + rock.x * GRID.cell + 15,
          top: GRID.y + rock.y * GRID.cell + 15,
          width: 90,
          height: 90,
        }}
      />
    ))}
    <div
      style={{
        position: 'absolute',
        left: GRID.x + battery.x * GRID.cell,
        top: GRID.y + battery.y * GRID.cell,
        width: GRID.cell,
        height: GRID.cell,
        fontSize: 76,
        lineHeight: `${GRID.cell}px`,
        textAlign: 'center',
      }}
    >
      🔋
    </div>
    <Img
      src={staticFile('art/kidobot.webp')}
      style={{
        position: 'absolute',
        left: GRID.x + robot.x * GRID.cell + 10,
        top: GRID.y + robot.y * GRID.cell,
        width: 100,
        height: 120,
      }}
    />
  </>
)

const ArrowRow: React.FC<{ arrows: string[]; shown: number }> = ({ arrows, shown }) => (
  <div
    style={{
      position: 'absolute',
      left: 60,
      right: 60,
      top: 790,
      display: 'flex',
      justifyContent: 'center',
      gap: 12,
    }}
  >
    {arrows.map((arrow, i) => (
      <div
        key={i}
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: 'white',
          fontSize: 52,
          lineHeight: '80px',
          textAlign: 'center',
          scale: i < shown ? '1' : '0',
        }}
      >
        {arrow}
      </div>
    ))}
  </div>
)

/** Walks the robot along cells, one step every `every` frames from `from`. */
function useWalk(path: { x: number; y: number }[], from: number, every = 18) {
  const frame = useCurrentFrame()
  const t = Math.max(0, (frame - from) / every)
  const i = Math.min(path.length - 1, Math.floor(t))
  const next = path[Math.min(path.length - 1, i + 1)]!
  const f = Math.min(1, t - i)
  return { x: path[i]!.x + (next.x - path[i]!.x) * f, y: path[i]!.y + (next.y - path[i]!.y) * f }
}

const RobotHook: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Board robot={{ x: 0, y: 3 }} battery={{ x: 3, y: 0 }} />
    <Emoji char="❓" x={560} y={180} size={110} delay={14} />
  </AbsoluteFill>
)

const RobotArrows: Scene = ({ short }) => {
  const frame = useCurrentFrame()
  const shown = Math.floor(frame / 12)
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Board robot={{ x: 0, y: 3 }} battery={{ x: 3, y: 3 }} />
      <ArrowRow arrows={['➡️', '➡️', '➡️']} shown={shown} />
    </AbsoluteFill>
  )
}

const RobotPlan: Scene = ({ short }) => {
  const frame = useCurrentFrame()
  const robot = useWalk(
    [
      { x: 0, y: 3 },
      { x: 0, y: 2 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
    50,
  )
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Board robot={robot} battery={{ x: 2, y: 1 }} />
      <ArrowRow arrows={['⬆️', '⬆️', '➡️', '➡️']} shown={Math.floor(frame / 10)} />
    </AbsoluteFill>
  )
}

const RobotRock: Scene = ({ short }) => {
  const robot = useWalk(
    [
      { x: 0, y: 3 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ],
    20,
  )
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Board robot={robot} battery={{ x: 3, y: 3 }} rocks={[{ x: 1, y: 3 }]} />
    </AbsoluteFill>
  )
}

const RobotWin: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Board robot={{ x: 3, y: 0 }} battery={{ x: 3, y: 0 }} />
    <Art name="sparkles" x={540} y={250} size={160} delay={4} />
    <Emoji char="⚡" x={200} y={180} size={110} delay={10} />
  </AbsoluteFill>
)

// --- the word train ------------------------------------------------------------

const Train: React.FC<{ letters: string[]; filled: number; x: number }> = ({
  letters,
  filled,
  x,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: 640,
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
    }}
  >
    {letters.map((letter, i) => (
      <div
        key={i}
        style={{
          width: 110,
          height: 120,
          borderRadius: '22px 22px 10px 10px',
          background: C.oops,
          position: 'relative',
        }}
      >
        <div
          style={{
            margin: '12px auto 0',
            width: 80,
            height: 70,
            borderRadius: 14,
            background: 'white',
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 56,
            lineHeight: '70px',
            textAlign: 'center',
            color: C.ink,
          }}
        >
          {i < filled ? letter : ''}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: -18,
            left: 12,
            width: 30,
            height: 30,
            borderRadius: 15,
            background: C.ink,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -18,
            right: 12,
            width: 30,
            height: 30,
            borderRadius: 15,
            background: C.ink,
          }}
        />
      </div>
    ))}
    <div
      style={{
        width: 130,
        height: 150,
        borderRadius: '30px 30px 10px 10px',
        background: C.primary,
        fontSize: 70,
        textAlign: 'center',
        paddingTop: 10,
        position: 'relative',
      }}
    >
      🚂
      <div
        style={{
          position: 'absolute',
          bottom: -18,
          left: 14,
          width: 34,
          height: 34,
          borderRadius: 17,
          background: C.ink,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -18,
          right: 14,
          width: 34,
          height: 34,
          borderRadius: 17,
          background: C.ink,
        }}
      />
    </div>
  </div>
)

const WORD: Record<Lang, { word: string; art: string }> = {
  uz: { word: 'olma', art: 'apple' },
  ru: { word: 'кот', art: 'cat' },
  en: { word: 'cat', art: 'cat' },
}

const Rails: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      top: 800,
      height: 14,
      background: C.inkSoft,
      borderRadius: 7,
    }}
  />
)

const TrainHook: Scene = ({ short, lang }) => {
  const x = interpolate(useProgress(0, 50), [0, 1], [-700, 60])
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Rails />
      <Train letters={[...WORD[lang].word]} filled={0} x={x} />
    </AbsoluteFill>
  )
}

const TrainPicture: Scene = ({ short, lang }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Art name={WORD[lang].art} x={360} y={400} size={300} delay={2} />
    <Rails />
    <Train letters={[...WORD[lang].word]} filled={0} x={60} />
  </AbsoluteFill>
)

const TrainLetters: Scene = ({ short, lang, frames }) => {
  const frame = useCurrentFrame()
  const letters = [...WORD[lang].word]
  const filled = Math.min(
    letters.length,
    Math.floor((frame / Math.max(1, frames - 20)) * (letters.length + 1)),
  )
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Art name={WORD[lang].art} x={360} y={380} size={220} delay={0} />
      <Rails />
      <Train letters={letters} filled={filled} x={60} />
    </AbsoluteFill>
  )
}

const TrainGo: Scene = ({ short, lang }) => {
  const x = interpolate(useProgress(16, 70), [0, 1], [60, 800])
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Rails />
      <Train letters={[...WORD[lang].word]} filled={9} x={x} />
      <Art name="sparkles" x={200} y={420} size={140} delay={4} />
    </AbsoluteFill>
  )
}

// --- the little shop -----------------------------------------------------------

const Coin: React.FC<{ n: number; x: number; y: number; delay?: number }> = ({
  n,
  x,
  y,
  delay = 0,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame: frame - delay, fps, config: { damping: 11 } })
  const size = n === 5 ? 150 : n === 2 ? 125 : 105
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size,
        background: C.coin,
        border: `10px solid ${C.coinShadow}`,
        fontFamily: DISPLAY,
        fontWeight: 800,
        fontSize: size * 0.45,
        lineHeight: `${size - 20}px`,
        textAlign: 'center',
        color: C.ink,
        scale: String(pop),
      }}
    >
      {n}
    </div>
  )
}

const PriceTag: React.FC<{ n: number }> = ({ n }) => (
  <div
    style={{
      position: 'absolute',
      left: 430,
      top: 230,
      padding: '10px 28px',
      borderRadius: 24,
      background: C.oops,
      color: 'white',
      fontFamily: DISPLAY,
      fontWeight: 800,
      fontSize: 64,
      rotate: '8deg',
    }}
  >
    {n} 🪙
  </div>
)

const ShopHook: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Art name="teddy" x={220} y={380} size={200} delay={2} />
    <Art name="balloon" x={480} y={360} size={200} delay={8} />
    <Art name="lollipop" x={360} y={620} size={200} delay={14} />
  </AbsoluteFill>
)

const ShopCoins: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Coin n={1} x={180} y={480} delay={4} />
    <Coin n={2} x={360} y={480} delay={20} />
    <Coin n={5} x={560} y={480} delay={36} />
  </AbsoluteFill>
)

const ShopPrice: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Card x={150} y={220} w={420} h={420} delay={0} />
    <Art name="lollipop" x={360} y={430} size={260} delay={4} />
    <PriceTag n={3} />
  </AbsoluteFill>
)

const ShopPay: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Art name="lollipop" x={360} y={330} size={220} delay={0} />
    <PriceTag n={3} />
    <Coin n={2} x={290} y={640} delay={10} />
    <Coin n={1} x={440} y={640} delay={30} />
    <Emoji char="🛍️" x={560} y={480} size={120} delay={50} />
  </AbsoluteFill>
)

const ShopChange: Scene = ({ short }) => {
  const back = useProgress(30, 60)
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Art name="lollipop" x={200} y={330} size={200} delay={0} />
      <PriceTag n={3} />
      <Coin n={5} x={360} y={560} delay={6} />
      <div style={{ opacity: back }}>
        <Coin n={1} x={240} y={760} delay={30} />
        <Coin n={1} x={480} y={760} delay={36} />
      </div>
    </AbsoluteFill>
  )
}

// --- the shape builder -------------------------------------------------------

const Shape: React.FC<{
  kind: 'circle' | 'square' | 'triangle' | 'rectangle'
  x: number
  y: number
  size: number
  colour: string
  delay?: number
}> = ({ kind, x, y, size, colour, delay = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const pop = spring({ frame: frame - delay, fps, config: { damping: 11 } })
  const common: React.CSSProperties = {
    position: 'absolute',
    scale: String(pop),
    background: colour,
  }
  if (kind === 'triangle')
    return (
      <div
        style={{
          ...common,
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          clipPath: 'polygon(50% 0, 100% 100%, 0 100%)',
        }}
      />
    )
  if (kind === 'circle')
    return (
      <div
        style={{
          ...common,
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size,
        }}
      />
    )
  if (kind === 'rectangle')
    return (
      <div
        style={{
          ...common,
          left: x - size,
          top: y - size / 2,
          width: size * 2,
          height: size,
          borderRadius: 12,
        }}
      />
    )
  return (
    <div
      style={{
        ...common,
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: 12,
      }}
    />
  )
}

const ShapesHook: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Shape kind="circle" x={200} y={360} size={170} colour={C.coin} delay={2} />
    <Shape kind="square" x={510} y={360} size={160} colour={C.oops} delay={10} />
    <Shape kind="triangle" x={220} y={660} size={190} colour="#d93d78" delay={18} />
    <Shape kind="rectangle" x={500} y={660} size={90} colour="#2f7fc4" delay={26} />
  </AbsoluteFill>
)

const ShapesKinds: Scene = (props) => <ShapesHook {...props} />

/**
 * The flat plan grows into the real thing (Phase 72), as in the app's shape builder:
 * the child's shapes first, then a sparkle, and the living picture takes their place.
 */
const Becomes: React.FC<{ at: number; flat: React.ReactNode; real: React.ReactNode }> = ({
  at,
  flat,
  real,
}) => {
  const frame = useCurrentFrame()
  const turn = interpolate(frame, [at, at + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return (
    <>
      <AbsoluteFill style={{ opacity: 1 - turn, scale: String(1 + turn * 0.08) }}>
        {flat}
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: turn }}>{real}</AbsoluteFill>
      <Art name="sparkles" x={540} y={300} size={150} delay={at} />
    </>
  )
}

/** The plan turns real a little before the middle of the scene. */
const turnAt = (frames: number) => Math.max(40, Math.round(frames * 0.42))

const ShapesHouse: Scene = ({ short, frames }) => {
  const frame = useCurrentFrame()
  const at = turnAt(frames)
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Ground top={860} />
      <Becomes
        at={at}
        flat={
          <>
            <Shape kind="square" x={360} y={640} size={320} colour={C.oops} delay={2} />
            <Shape kind="triangle" x={360} y={360} size={380} colour="#d93d78" delay={14} />
            <Shape kind="rectangle" x={360} y={720} size={80} colour={C.primary} delay={26} />
          </>
        }
        real={
          <>
            <Art name="pine" x={590} y={720} size={220} delay={at + 6} />
            <Art name="house" x={340} y={640} size={470} delay={at} />
            {[0, 1, 2].map((i) => {
              const t = ((frame - at + i * 18) % 54) / 54
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 236 - t * 20,
                    top: 400 - t * 170,
                    width: 46 + t * 50,
                    height: 46 + t * 50,
                    borderRadius: 999,
                    background: 'white',
                    opacity: frame < at ? 0 : 0.75 * (1 - t),
                  }}
                />
              )
            })}
          </>
        }
      />
    </AbsoluteFill>
  )
}

const ShapesCar: Scene = ({ short, frames }) => {
  const at = turnAt(frames)
  const drive = interpolate(useProgress(at, frames), [0, 1], [0, 260])
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Ground top={820} color="#9aa6b8" />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 900,
          height: 10,
          background: 'repeating-linear-gradient(90deg, white 0 50px, transparent 50px 100px)',
          opacity: 0.8,
        }}
      />
      <Becomes
        at={at}
        flat={
          <>
            <Shape kind="rectangle" x={300} y={640} size={150} colour="#2f7fc4" delay={0} />
            <Shape kind="square" x={300} y={510} size={130} colour={C.sky} delay={8} />
            <Shape kind="circle" x={200} y={740} size={110} colour={C.ink} delay={16} />
            <Shape kind="circle" x={400} y={740} size={110} colour={C.ink} delay={22} />
          </>
        }
        real={
          <>
            <Art name="pine" x={600} y={700} size={200} delay={at + 4} />
            <div
              style={{ position: 'absolute', left: drive - 40, top: 0, width: 720, height: 1280 }}
            >
              <Art name="car" x={300} y={700} size={400} delay={at} />
            </div>
          </>
        }
      />
    </AbsoluteFill>
  )
}

const ShapesRocket: Scene = ({ short, frames }) => {
  const at = turnAt(frames)
  const frame = useCurrentFrame()
  const lift = interpolate(useProgress(at + 10, frames), [0, 1], [0, -380])
  return (
    <AbsoluteFill>
      <Sky short={short} night={0.75} />
      {[90, 210, 600, 650, 140, 520].map((x, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: 120 + ((i * 137) % 420),
            width: 8,
            height: 8,
            borderRadius: 9,
            background: 'white',
            opacity: 0.4 + 0.5 * Math.abs(Math.sin((frame + i * 9) / 12)),
          }}
        />
      ))}
      <Becomes
        at={at}
        flat={
          <>
            <Shape kind="triangle" x={360} y={330} size={170} colour="#d93d78" delay={0} />
            <div
              style={{
                position: 'absolute',
                left: 290,
                top: 410,
                width: 140,
                height: 320,
                borderRadius: 20,
                background: '#eeeeee',
              }}
            />
            <Shape kind="circle" x={360} y={520} size={80} colour={C.sky} delay={8} />
            <Shape kind="triangle" x={260} y={700} size={110} colour={C.coin} delay={14} />
            <Shape kind="triangle" x={460} y={700} size={110} colour={C.coin} delay={18} />
          </>
        }
        real={
          <>
            <Art name="ringed-planet" x={150} y={260} size={190} delay={at + 6} />
            <div style={{ position: 'absolute', left: 0, top: lift, width: 720, height: 1280 }}>
              <div
                style={{
                  position: 'absolute',
                  left: 300,
                  top: 720,
                  width: 120,
                  height: 170 + Math.sin(frame / 2) * 18,
                  borderRadius: 999,
                  background: 'radial-gradient(#fff6b0, #ff9a3c 55%, rgba(255,120,40,0) 75%)',
                }}
              />
              {/* the 3D rocket leans to the right; stood upright, its tail meets the flame */}
              <AbsoluteFill style={{ rotate: '-45deg', transformOrigin: '360px 560px' }}>
                <Art name="rocket" x={360} y={560} size={420} delay={at} />
              </AbsoluteFill>
            </div>
          </>
        }
      />
    </AbsoluteFill>
  )
}

// --- who lives where ---------------------------------------------------------

const Home: React.FC<
  SceneProps & { place: string; animals: string[]; sea?: boolean; ground?: string }
> = ({ short, place, animals, sea, ground }) => (
  <AbsoluteFill>
    <Sky short={short} />
    {sea ? <Sea top={620} /> : <Ground top={760} color={ground} />}
    <Art name={place} x={560} y={430} size={220} delay={0} />
    {animals.map((animal, i) => (
      <Art
        key={animal}
        name={animal}
        x={200 + i * 210}
        y={sea ? 760 : 680}
        size={210}
        delay={10 + i * 14}
      />
    ))}
  </AbsoluteFill>
)

const HabitatsHook: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Art name="pine" x={170} y={330} size={190} delay={2} />
    <Art name="wave" x={540} y={330} size={190} delay={8} />
    <Art name="cactus" x={170} y={660} size={190} delay={14} />
    <Art name="snowflake" x={540} y={660} size={190} delay={20} />
  </AbsoluteFill>
)

// --- the healthy plate ----------------------------------------------------------

const Plate: React.FC<{ foods: string[] }> = ({ foods }) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: 110,
        top: 360,
        width: 500,
        height: 500,
        borderRadius: 500,
        background: 'white',
        boxShadow: `0 16px 0 ${C.line}`,
      }}
    />
    {foods.map((food, i) => {
      const angle = (i / foods.length) * Math.PI * 2
      return (
        <Art
          key={food}
          name={food}
          x={360 + Math.cos(angle) * 140}
          y={610 + Math.sin(angle) * 140}
          size={150}
          delay={6 + i * 8}
        />
      )
    })}
  </>
)

const PlateHook: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Plate foods={[]} />
    <Emoji char="💪" x={360} y={610} size={220} delay={6} />
  </AbsoluteFill>
)

const PlateFruit: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Plate foods={['apple', 'carrot', 'banana', 'cucumber', 'grapes']} />
  </AbsoluteFill>
)

const PlateMilk: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Art name="milk" x={360} y={480} size={300} delay={2} />
    <Emoji char="🦴" x={540} y={700} size={140} delay={20} />
  </AbsoluteFill>
)

const PlateTreats: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Card x={110} y={300} w={500} h={460} delay={0} color="rgba(255,240,194,0.95)" />
    <Art name="candy" x={250} y={460} size={170} delay={6} />
    <Art name="doughnut" x={470} y={460} size={170} delay={14} />
    <Art name="lollipop" x={360} y={640} size={170} delay={22} />
  </AbsoluteFill>
)

const PlatePlate: Scene = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Plate foods={['apple', 'carrot', 'milk', 'cheese', 'pear', 'cucumber']} />
    <Art name="sparkles" x={590} y={330} size={130} delay={40} />
  </AbsoluteFill>
)

const SCALE_RULE = { uz: 'Teng = tekis', ru: 'Поровну = ровно', en: 'Equal = level' }

export const SCENES2: Record<string, Record<string, Scene>> = {
  scale: {
    hook: ScaleHook,
    heavy: ScaleHeavy,
    add: ScaleAdd,
    even: ScaleEven,
    rule: (props) => <RuleCard {...props} text={SCALE_RULE} left="apple" right="apple" />,
  },
  robot: { hook: RobotHook, arrows: RobotArrows, plan: RobotPlan, rock: RobotRock, win: RobotWin },
  train: {
    hook: TrainHook,
    picture: TrainPicture,
    letters: TrainLetters,
    order: TrainLetters,
    go: TrainGo,
  },
  shop: { hook: ShopHook, coins: ShopCoins, price: ShopPrice, pay: ShopPay, change: ShopChange },
  shapes: {
    hook: ShapesHook,
    kinds: ShapesKinds,
    house: ShapesHouse,
    car: ShapesCar,
    rocket: ShapesRocket,
  },
  habitats: {
    hook: HabitatsHook,
    forest: (props) => <Home {...props} place="pine" animals={['fox', 'bear']} />,
    sea: (props) => <Home {...props} place="wave" animals={['whale', 'dolphin']} sea />,
    desert: (props) => <Home {...props} place="cactus" animals={['camel']} ground="#e8c27a" />,
    ice: (props) => <Home {...props} place="snowflake" animals={['penguin']} ground="#e6f2ff" />,
  },
  plate: {
    hook: PlateHook,
    fruit: PlateFruit,
    milk: PlateMilk,
    treats: PlateTreats,
    plate: PlatePlate,
  },
}
