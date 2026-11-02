import React from 'react'
import { Composition, Folder } from 'remotion'
import { FPS, Hook, Lang, totalFrames } from './data'
import { KiddoAd } from './KiddoAd'

const VERSIONS: { lang: Lang; hook: Hook }[] = [
  { lang: 'uz', hook: 'a' },
  { lang: 'uz', hook: 'b' },
  { lang: 'uz', hook: 'c' },
  { lang: 'ru', hook: 'a' },
  { lang: 'en', hook: 'a' },
]

export const RemotionRoot: React.FC = () => (
  <Folder name="KiddoAd">
    {VERSIONS.map(({ lang, hook }) => (
      <Composition
        key={`${lang}-${hook}`}
        id={`KiddoAd-${lang}-${hook}`}
        component={KiddoAd}
        width={1080}
        height={1920}
        fps={FPS}
        durationInFrames={totalFrames(lang, hook)}
        defaultProps={{ lang, hook }}
      />
    ))}
  </Folder>
)
