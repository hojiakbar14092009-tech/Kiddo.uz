import React from 'react'
import { Audio } from '@remotion/media'
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { Camera, MOVES } from './camera'
import { ENDING, OPENING, pauseFrames, sceneFrames, timing, voiceFile, voiceIn, type Lang } from './data'
import { Art, Emoji, Ground, Sea, Sky, clamp, outEase, usePop } from './parts'
import { Actor } from './rig'
import amps from './amp.json'

/*
 * Dialogue stories: Mini and Piku talk, a scene at a time. A scene is a list of pictures
 * that move (data, not code), a sky, a ground, and who is on screen. The film has no
 * words in it: the app writes the title and the subtitles. Scenes dissolve into each
 * other, the camera drifts, the sky lags behind it, and the two of them breathe, blink
 * and move their mouths with the voice.
 */

export interface Item {
  art?: string
  emoji?: string
  x: number
  y: number
  size: number
  delay?: number
  /** Moves from (x, y) to here over the scene (or once per `loop` frames). */
  to?: [number, number]
  loop?: number
  /** The size grows to this many times over the scene. */
  grow?: number
  /** The growing happens only in the silent pause at the end of the scene (breathing along). */
  inPause?: boolean
  /** Fades in and out along its loop (or at the ends of the scene). */
  fade?: boolean
  /** Starts only at this frame of the scene. */
  at?: number
  float?: number
  /** A plain rounded rectangle instead of a picture (a sack, a lamp box, a stripe). */
  rect?: { w: number; h: number; color: string; radius: number }
  opacity?: number
}

export interface SceneDef {
  /** 'sea' and 'ground' sit at `groundTop`. */
  ground?: 'sea' | 'ground' | 'none'
  groundTop?: number
  /** The sky darkens by this much over the scene. */
  dim?: number
  items: Item[]
}

export interface Story {
  /** The sky colours (also the poster's). */
  theme: { top: string; bottom: string; accent: string }
  hero: string
  /** An emoji instead of a picture for the hero (when the app has no picture of it). */
  heroEmoji?: string
  /** Plain shapes drawn instead of a picture for the hero (e.g. a round flatbread). */
  heroItems?: Item[]
  scenes: SceneDef[]
}

const FEET = 1010
const SIZE = 240
export const TR = 12
const Floor: React.FC<{ def: SceneDef }> = ({ def }) => {
  const top = def.groundTop ?? 880
  // the two of them stand on a sandy shore in front of the sea, never in it
  if (def.ground === 'sea') {
    return (
      <>
        <Sea top={top} />
        <Ground top={950} color="#f3e3b4" bottom="#e2c98a" />
      </>
    )
  }
  if (def.ground === 'ground') return <Ground top={top} />
  return null
}

const RectView: React.FC<{ item: Item; x: number; y: number; grow: number; opacity: number }> = ({
  item,
  x,
  y,
  grow,
  opacity,
}) => {
  const pop = usePop(item.delay ?? 0)
  const { w, h, color, radius } = item.rect!
  return (
    <div
      style={{
        position: 'absolute',
        left: x - (w * grow) / 2,
        top: y - (h * grow) / 2,
        width: w * grow,
        height: h * grow,
        background: color,
        borderRadius: radius,
        scale: String(pop),
        opacity,
      }}
    />
  )
}

const Hero: React.FC<{ story: Story; size: number; delay: number }> = ({ story, size, delay }) =>
  story.heroItems ? (
    <>
      {story.heroItems.map((item, i) => (
        <ItemView key={i} item={item} frames={30} />
      ))}
    </>
  ) : story.heroEmoji ? (
    <Emoji char={story.heroEmoji} x={360} y={430} size={size} delay={delay} />
  ) : (
    <Art name={story.hero} x={360} y={430} size={size} delay={delay} float={14} />
  )

const ItemView: React.FC<{ item: Item; frames: number; pause?: number }> = ({
  item,
  frames,
  pause = 0,
}) => {
  const frame = useCurrentFrame() - (item.at ?? 0)
  if (frame < 0) return null
  const cycle = item.loop
    ? (frame % item.loop) / item.loop
    : Math.min(1, frame / Math.max(1, frames - (item.at ?? 0)))
  const eased = item.loop ? cycle : Easing.inOut(Easing.sin)(cycle)
  const [tx, ty] = item.to ?? [item.x, item.y]
  const x = item.x + (tx - item.x) * eased
  const y = item.y + (ty - item.y) * eased
  // a breathing balloon moves only through the pause that closes its scene
  const breath = Easing.inOut(Easing.sin)(
    Math.min(1, Math.max(0, (frame - (frames - pause)) / Math.max(1, pause))),
  )
  const progress = item.inPause && pause ? breath : Math.min(1, frame / Math.max(1, frames))
  const size = item.size * (1 + ((item.grow ?? 1) - 1) * progress)
  const opacity =
    (item.fade ? Math.min(1, Math.sin(cycle * Math.PI) * 2.2) : 1) * (item.opacity ?? 1)
  const style = { opacity }
  if (item.rect) {
    const grow = 1 + ((item.grow ?? 1) - 1) * progress
    return <RectView item={item} x={x} y={y} grow={grow} opacity={opacity} />
  }
  return item.emoji ? (
    <Emoji char={item.emoji} x={x} y={y} size={size} delay={item.delay ?? 0} style={style} />
  ) : (
    <Art
      name={item.art!}
      x={x}
      y={y}
      size={size}
      delay={item.delay ?? 0}
      float={item.float ?? 8}
      style={style}
    />
  )
}

const SceneView: React.FC<{
  id: string
  def: SceneDef
  frames: number
  pause: number
  mini: readonly number[]
  piku: readonly number[]
  speaker: 'mini' | 'piku'
  offset: number
}> = ({ id, def, frames, pause, mini, piku, speaker, offset }) => {
  const frame = useCurrentFrame()
  const dim = (def.dim ?? 0) * Math.min(1, frame / Math.max(1, frames))
  return (
    <AbsoluteFill>
      <Sky short={id} night={dim} />
      <Floor def={def} />
      {def.items.map((item, i) => (
        <ItemView key={i} item={item} frames={frames} pause={pause} />
      ))}
      <Actor
        who="mini"
        x={215}
        y={FEET}
        size={SIZE}
        side={1}
        voice={mini.slice(offset)}
        listening={speaker === 'piku'}
        phase={offset}
      />
      <Actor
        who="piku"
        x={505}
        y={FEET}
        size={SIZE}
        side={-1}
        voice={piku.slice(offset)}
        listening={speaker === 'mini'}
        phase={offset}
      />
    </AbsoluteFill>
  )
}

/** The opening: the hero picture pops up between the two. No words (the app writes them). */
export const StoryOpening: React.FC<{ id: string; story: Story }> = ({ id, story }) => {
  return (
    <AbsoluteFill>
      <Sky short={id} />
      <Ground top={900} />
      <Hero story={story} size={380} delay={3} />
      <Art name="sparkles" x={150} y={330} size={120} delay={9} />
      <Art name="glowing-star" x={590} y={350} size={100} delay={13} />
      <Actor who="mini" x={215} y={FEET} size={SIZE} voice={[0]} delay={2} />
      <Actor who="piku" x={505} y={FEET} size={SIZE} side={-1} voice={[0]} delay={5} />
    </AbsoluteFill>
  )
}

/** The ending: both cheer under falling sparkles. */
const StoryEnding: React.FC<{ id: string; story: Story }> = ({ id, story }) => {
  const frame = useCurrentFrame()
  const cheer = Array.from({ length: ENDING }, (_, f) => 0.45 + 0.4 * Math.abs(Math.sin(f / 4)))
  return (
    <AbsoluteFill>
      <Sky short={id} />
      <Ground top={900} />
      <Hero story={story} size={340} delay={0} />
      {[0, 1, 2, 3, 4].map((i) => (
        <Art
          key={i}
          name={i % 2 ? 'glowing-star' : 'sparkles'}
          x={110 + i * 125}
          y={((frame * 6 + i * 150) % 900) + 80}
          size={70}
          style={{ opacity: 0.85 }}
        />
      ))}
      <Actor who="mini" x={215} y={FEET} size={SIZE} voice={cheer} />
      <Actor who="piku" x={505} y={FEET} size={SIZE} side={-1} voice={cheer} />
    </AbsoluteFill>
  )
}

export const StoryCartoon: React.FC<{
  id: string
  story: Story
  lang: Lang
  voiced: boolean
}> = ({ id, story, lang, voiced }) => {
  const { durationInFrames } = useVideoConfig()
  const { durations, speakers } = timing(id, lang)
  // each speaker's mouth hears only their own lines
  const { mini, piku } = React.useMemo(() => {
    const series = (amps as Record<string, number[]>)[id] ?? []
    const own = (who: 'mini' | 'piku') => {
      const out = new Array<number>(series.length).fill(0)
      let from = OPENING
      durations.forEach((_, i) => {
        const frames = sceneFrames(id, lang, i)
        if (speakers![i] === who) {
          for (let f = from; f < from + frames; f++) out[f] = series[f] ?? 0
        }
        from += frames
      })
      return out
    }
    return { mini: own('mini'), piku: own('piku') }
  }, [id, lang, durations, speakers])
  const starts: number[] = []
  let at = OPENING
  durations.forEach((_, i) => {
    starts.push(at)
    at += sceneFrames(id, lang, i)
  })
  const end = at
  return (
    <AbsoluteFill style={{ backgroundColor: '#fff8ec' }}>
      <Sequence durationInFrames={OPENING + TR} layout="none">
        <Camera frames={OPENING + TR} move="push">
          <StoryOpening id={id} story={story} />
        </Camera>
      </Sequence>
      {durations.map((_, i) => {
        const frames = sceneFrames(id, lang, i)
        return (
          <Sequence key={i} from={starts[i]} durationInFrames={frames + TR} layout="none">
            <Dissolve>
              <Camera frames={frames + TR} move={MOVES[i % MOVES.length]!}>
                <SceneView
                  id={id}
                  def={story.scenes[i]!}
                  frames={frames}
                  pause={pauseFrames(id, lang, i)}
                  mini={mini}
                  piku={piku}
                  speaker={speakers![i]!}
                  offset={starts[i]}
                />
              </Camera>
            </Dissolve>
            {voiced && (
              <Sequence from={voiceIn(id)} layout="none">
                <Audio src={staticFile(voiceFile(id, 'uz', i))} volume={1} />
              </Sequence>
            )}
          </Sequence>
        )
      })}
      <Sequence from={end} durationInFrames={ENDING} layout="none">
        <Dissolve>
          <Camera frames={ENDING} move="pull">
            <StoryEnding id={id} story={story} />
          </Camera>
        </Dissolve>
        <Sequence from={6} layout="none">
          <Audio src={staticFile('sfx/sparkle.wav')} volume={0.3} />
        </Sequence>
      </Sequence>
      <Audio
        src={staticFile('music.wav')}
        volume={(f) =>
          interpolate(
            f,
            [
              0,
              8,
              OPENING - 6,
              OPENING + 4,
              durationInFrames - ENDING,
              durationInFrames - ENDING + 10,
              durationInFrames - 10,
              durationInFrames,
            ],
            [0, 0.4, 0.4, voiced ? 0.14 : 0.3, voiced ? 0.14 : 0.3, 0.4, 0.4, 0],
            clamp,
          )
        }
      />
    </AbsoluteFill>
  )
}

/** A soft dissolve in (no flash): the scene below keeps going while this one fades up. */
export const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill
      style={{ opacity: interpolate(frame, [0, TR], [0, 1], { ...clamp, easing: outEase }) }}
    >
      {children}
    </AbsoluteFill>
  )
}
