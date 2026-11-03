import React from 'react'
import { Composition, Folder } from 'remotion'
import { Cartoon } from './Cartoon'
import { Poster } from './Poster'
import { FPS, H, LANGS, SHORT_IDS, totalFrames, W } from './data'

export const RemotionRoot: React.FC = () => (
  <>
    <Posters />
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
  </>
)

/** The posters: one still per cartoon (render with `remotion still poster-<id> --frame=59`). */
export const Posters: React.FC = () => (
  <Folder name="Posters">
    {SHORT_IDS.map((short) => (
      <Composition
        key={short}
        id={`poster-${short}`}
        component={Poster}
        width={W}
        height={H}
        fps={FPS}
        durationInFrames={60}
        defaultProps={{ short }}
      />
    ))}
  </Folder>
)
