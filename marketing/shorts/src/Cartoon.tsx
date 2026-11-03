import React from 'react'
import { Audio } from '@remotion/media'
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  Sequence,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import {
  ENDING,
  FPS,
  OPENING,
  sceneFrames,
  timing,
  VOICE_IN,
  voiceFile,
  type Lang,
  type ShortId,
} from './data'
import { fontsReady } from './fonts'
import { Caption, Robot } from './parts'
import { DARK_SCENES, PlayScene, SCENES, TitleCard } from './scenes'

export type CartoonProps = { short: ShortId; lang: Lang }

const waitForFonts = delayRender('fonts')
fontsReady.then(() => continueRender(waitForFonts))

/** Talks while its line plays: the robot bounces. */
const TalkingRobot: React.FC<{ seconds: number }> = ({ seconds }) => {
  const frame = useCurrentFrame()
  const talking = frame >= VOICE_IN && frame < VOICE_IN + seconds * FPS
  return <Robot talking={talking} />
}

/**
 * A new scene breathes in (Phase 72): it opens from a soft light instead of a flash
 * and a quiet whoosh of air carries it in.
 */
const Swoosh: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(255,250,235,0.55), rgba(255,250,235,0))',
          opacity: interpolate(frame, [0, 10], [1, 0], {
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.quad),
          }),
          pointerEvents: 'none',
        }}
      />
      <Audio src={staticFile('sfx/whoosh.wav')} volume={0.22} />
    </>
  )
}

/**
 * A slow camera (Phase 72): every scene is filmed, not pinned – a gentle push in,
 * drifting a little to one side, so even a still moment feels alive.
 */
const Camera: React.FC<{ frames: number; side: 1 | -1; children: React.ReactNode }> = ({
  frames,
  side,
  children,
}) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [0, frames], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.sin),
  })
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${side * p * 14}px, ${-p * 10}px) scale(${1.02 + p * 0.05})`,
        transformOrigin: '50% 45%',
      }}
    >
      {children}
    </AbsoluteFill>
  )
}

/** Soft dark corners and a warm light from above: the look of a filmed picture. */
const Lens: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        'radial-gradient(ellipse at 50% 18%, rgba(255,236,190,0.16), rgba(255,236,190,0) 55%),' +
        'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 62%, rgba(40,20,60,0.22) 100%)',
      pointerEvents: 'none',
    }}
  />
)

export const Cartoon: React.FC<CartoonProps> = ({ short, lang }) => {
  const { durationInFrames } = useVideoConfig()
  const { lines, scenes, durations } = timing(short, lang)
  return (
    <AbsoluteFill style={{ backgroundColor: '#fff8ec' }}>
      <Series>
        <Series.Sequence durationInFrames={OPENING} name="title">
          <TitleCard short={short} lang={lang} frames={OPENING} />
        </Series.Sequence>
        {scenes.map((scene, index) => {
          const frames = sceneFrames(short, lang, index)
          const Scene = SCENES[short][scene] ?? PlayScene
          const dark = DARK_SCENES.has(`${short}:${scene}`)
          return (
            <Series.Sequence key={index} durationInFrames={frames} name={scene}>
              <Camera frames={frames} side={index % 2 === 0 ? 1 : -1}>
                <Scene short={short} lang={lang} frames={frames} />
              </Camera>
              <Lens />
              <Swoosh />
              <TalkingRobot seconds={durations[index]!} />
              <Sequence from={VOICE_IN - 4} layout="none">
                <Caption text={lines[index]!} seconds={durations[index]!} dark={dark} />
              </Sequence>
              <Sequence from={VOICE_IN} layout="none">
                <Audio src={staticFile(voiceFile(short, lang, index))} volume={1} />
              </Sequence>
            </Series.Sequence>
          )
        })}
        <Series.Sequence durationInFrames={ENDING} name="end">
          <PlayScene short={short} lang={lang} frames={ENDING} />
          <Lens />
          <Sequence from={6} layout="none">
            <Audio src={staticFile('sfx/sparkle.wav')} volume={0.3} />
          </Sequence>
        </Series.Sequence>
      </Series>
      {/* the music under the voice, a little louder on the title and the end */}
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
            [0, 0.42, 0.42, 0.16, 0.16, 0.4, 0.4, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
        }
      />
    </AbsoluteFill>
  )
}
