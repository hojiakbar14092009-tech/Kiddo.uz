import React from 'react'
import { Composition, Folder } from 'remotion'
import { Cartoon } from './Cartoon'
import { Poster } from './Poster'
import { FPS, H, LANGS, SHORT_IDS, STORY_IDS, totalFrames, W } from './data'
import { STORIES, VOICED } from './stories'
import { StoryCartoon } from './story'

const STORY_LIST = [...STORY_IDS]

export const RemotionRoot: React.FC = () => (
  <>
    <Posters />
    <Folder name="Cartoons">
      {SHORT_IDS.filter((short) => !STORY_IDS.has(short)).flatMap((short) =>
        LANGS.map((lang) => (
          <Composition
            key={`${short}-${lang}`}
            id={`${short}-${lang}`}
            component={Cartoon}
            width={W}
            height={H}
            fps={FPS}
            durationInFrames={totalFrames(short, lang)}
            defaultProps={{ short, lang, silent: true }}
          />
        )),
      )}
    </Folder>
    <Folder name="Stories">
      {STORY_LIST.filter((id) => STORIES[id]).map((id) => (
        <Composition
          key={id}
          id={`${id}-uz`}
          component={StoryCartoon}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={totalFrames(id, 'uz')}
          defaultProps={{ id, story: STORIES[id]!, lang: 'uz' as const, voiced: VOICED.has(id) }}
        />
      ))}
    </Folder>
  </>
)

/** The posters: one still per cartoon (render with `remotion still poster-<id> --frame=59`). */
export const Posters: React.FC = () => (
  <Folder name="Posters">
    {[...new Set([...SHORT_IDS, ...STORY_LIST])].map((short) => (
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
