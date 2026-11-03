import React from 'react'
import { Audio } from '@remotion/media'
import {
  AbsoluteFill,
  continueRender,
  delayRender,
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

/** A short pop when a scene begins. */
const Swoosh: React.FC = () => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        opacity: interpolate(frame, [0, 6], [0.35, 0], { extrapolateRight: 'clamp' }),
        pointerEvents: 'none',
      }}
    />
  )
}

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
              <Scene short={short} lang={lang} frames={frames} />
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
