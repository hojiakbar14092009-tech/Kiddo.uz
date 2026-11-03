import React from 'react'
import { Composition, Folder } from 'remotion'
import { Cartoon } from './Cartoon'
import { FPS, H, LANGS, SHORT_IDS, totalFrames, W } from './data'

export const RemotionRoot: React.FC = () => (
  <Folder name="Cartoons">
    {SHORT_IDS.flatMap((short) =>
      LANGS.map((lang) => (
        <Composition
          key={`${short}-${lang}`}
          id={`${short}-${lang}`}
          component={Cartoon}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={totalFrames(short, lang)}
          defaultProps={{ short, lang }}
        />
      )),
    )}
  </Folder>
)
