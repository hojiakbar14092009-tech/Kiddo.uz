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
  useVideoConfig,
} from 'remotion'
import {
  Hook,
  Lang,
  lineOf,
  ORDER,
  SceneId,
  sceneFrames,
  VOICE_IN,
  voiceFile,
  voiceSeconds,
} from './data'
import { fontsReady } from './fonts'
import {
  CtaScene,
  HookScene,
  LetterScene,
  NutsScene,
  ParentScene,
  PlanScene,
  TurnScene,
} from './scenes'

export type AdProps = { lang: Lang; hook: Hook }

const SCENES: Record<
  SceneId,
  React.FC<{ lang: Lang; line: string; seconds: number; hook: Hook }>
> = {
  hook: HookScene,
  turn: TurnScene,
  letter: LetterScene,
  plan: PlanScene,
  nuts: NutsScene,
  parent: ParentScene,
  cta: CtaScene,
}

const waitForFonts = delayRender('fonts')
fontsReady.then(() => continueRender(waitForFonts))

/** Sound cues from the app itself, placed inside scenes (frames from scene start). */
const CUES: Partial<
  Record<SceneId, { src: string; at: (sec: number) => number; volume: number }[]>
> = {
  turn: [{ src: 'ui_click.mp3', at: () => 52, volume: 0.7 }],
  letter: [{ src: 'ui_success.mp3', at: (sec) => Math.round(sec * 30 * 0.42) + 22, volume: 0.6 }],
  plan: [{ src: 'ui_soft.mp3', at: () => 22, volume: 0.6 }],
  nuts: [{ src: 'ui_success.mp3', at: () => 30, volume: 0.55 }],
  cta: [{ src: 'ui_soft.mp3', at: () => 26, volume: 0.7 }],
}

export const KiddoAd: React.FC<AdProps> = ({ lang, hook }) => {
  const { durationInFrames } = useVideoConfig()
  return (
    <AbsoluteFill style={{ backgroundColor: '#fff8ec' }}>
      <Series>
        {ORDER.map((scene) => {
          const Scene = SCENES[scene]
          const seconds = voiceSeconds(lang, scene, hook)
          return (
            <Series.Sequence
              key={scene}
              name={scene}
              durationInFrames={sceneFrames(lang, scene, hook)}
            >
              <Scene lang={lang} hook={hook} line={lineOf(lang, scene, hook)} seconds={seconds} />
              <Sequence from={VOICE_IN} layout="none">
                <Audio src={staticFile(voiceFile(lang, scene, hook))} volume={1} />
              </Sequence>
              {(CUES[scene] ?? []).map((cue, i) => (
                <Sequence key={i} from={cue.at(seconds)} layout="none">
                  <Audio src={staticFile(cue.src)} volume={cue.volume} />
                </Sequence>
              ))}
            </Series.Sequence>
          )
        })}
      </Series>
      {/* music under the voice; it opens up on the end card */}
      <Audio
        src={staticFile('music.wav')}
        volume={(f) =>
          interpolate(
            f,
            [
              0,
              8,
              durationInFrames - 80,
              durationInFrames - 60,
              durationInFrames - 12,
              durationInFrames,
            ],
            [0, 0.32, 0.32, 0.55, 0.55, 0],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
          )
        }
      />
    </AbsoluteFill>
  )
}
