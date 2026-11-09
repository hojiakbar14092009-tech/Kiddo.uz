import React from 'react'
import { Audio } from '@remotion/media'
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { Camera, MOVES } from './camera'
import {
  ENDING,
  OPENING,
  sceneFrames,
  timing,
  voiceFile,
  VOICE_IN,
  type Lang,
  type ShortId,
} from './data'
import { fontsReady } from './fonts'
import { Art, Ground, Sky, clamp } from './parts'
import { Actor } from './rig'
import { HERO, PlayScene, SCENES } from './scenes'
import { Dissolve, TR } from './story'
import legacyAmp from './amp-legacy.json'

/*
 * The first thirteen cartoons, filmed the new way: no words in the picture (the app writes
 * the title and the subtitles), a dissolve between scenes, a camera that drifts while the sky
 * lags behind it, and Piku (KidoBot) who breathes, blinks and speaks the narration with his
 * mouth following the voice. The voice and music come from the old recordings, mixed in
 * afterwards (`silent`), until the cartoons are voiced again as Mini and Piku talking.
 */

export type CartoonProps = { short: ShortId; lang: Lang; silent?: boolean }

const waitForFonts = delayRender('fonts')
fontsReady.then(() => continueRender(waitForFonts))

const FEET = 1010
const SIZE = 210
const X = 530

const Opening: React.FC<{ short: ShortId }> = ({ short }) => (
  <AbsoluteFill>
    <Sky short={short} />
    <Ground top={900} />
    <Art name={HERO[short]} x={360} y={430} size={380} delay={3} float={14} />
    <Art name="sparkles" x={150} y={330} size={120} delay={9} />
    <Art name="glowing-star" x={590} y={350} size={100} delay={13} />
    <Actor who="piku" x={X} y={FEET} size={SIZE} side={-1} voice={[0]} delay={5} />
  </AbsoluteFill>
)

const Ending: React.FC<{ short: ShortId }> = ({ short }) => {
  const frame = useCurrentFrame()
  const cheer = Array.from({ length: ENDING }, (_, f) => 0.45 + 0.4 * Math.abs(Math.sin(f / 4)))
  return (
    <AbsoluteFill>
      <Sky short={short} />
      <Ground top={900} />
      <Art name={HERO[short]} x={360} y={430} size={340} float={14} />
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
      <Actor who="piku" x={X} y={FEET} size={SIZE} side={-1} voice={cheer} />
    </AbsoluteFill>
  )
}

export const Cartoon: React.FC<CartoonProps> = ({ short, lang, silent = false }) => {
  const { durationInFrames } = useVideoConfig()
  const { scenes } = timing(short, lang)
  const amp = (legacyAmp as Record<string, number[]>)[`${short}-${lang}`] ?? []
  const starts: number[] = []
  let at = OPENING
  scenes.forEach((_, i) => {
    starts.push(at)
    at += sceneFrames(short, lang, i)
  })
  return (
    <AbsoluteFill style={{ backgroundColor: '#fff8ec' }}>
      <Sequence durationInFrames={OPENING + TR} layout="none">
        <Camera frames={OPENING + TR} move="push">
          <Opening short={short} />
        </Camera>
      </Sequence>
      {scenes.map((scene, index) => {
        const frames = sceneFrames(short, lang, index)
        const Scene = SCENES[short][scene] ?? PlayScene
        return (
          <Sequence key={index} from={starts[index]} durationInFrames={frames + TR} layout="none">
            <Dissolve>
              <Camera frames={frames + TR} move={MOVES[index % MOVES.length]!}>
                <Scene short={short} lang={lang} frames={frames} />
                <Actor
                  who="piku"
                  x={X}
                  y={FEET}
                  size={SIZE}
                  side={-1}
                  voice={amp.slice(starts[index])}
                  phase={starts[index]}
                />
              </Camera>
            </Dissolve>
            {!silent && (
              <Sequence from={VOICE_IN} layout="none">
                <Audio src={staticFile(voiceFile(short, lang, index))} volume={1} />
              </Sequence>
            )}
          </Sequence>
        )
      })}
      <Sequence from={at} durationInFrames={ENDING} layout="none">
        <Dissolve>
          <Camera frames={ENDING} move="pull">
            <Ending short={short} />
          </Camera>
        </Dissolve>
      </Sequence>
      {!silent && (
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
              clamp,
            )
          }
        />
      )}
    </AbsoluteFill>
  )
}
