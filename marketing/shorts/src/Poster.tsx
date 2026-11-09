import React from 'react'
import { AbsoluteFill } from 'remotion'
import type { ShortId } from './data'
import { Robot } from './parts'
import { PlayScene, SCENES } from './scenes'
import { STORIES } from './stories'
import { StoryOpening } from './story'

/**
 * A cartoon's poster (Phase 69): its opening scene, settled, with the storytellers –
 * no words, so one picture serves every language (the app writes the title).
 */
export const Poster: React.FC<{ short: string }> = ({ short }) => {
  const story = STORIES[short]
  if (story) return <StoryOpening id={short} story={story} />
  const Scene = SCENES[short as ShortId].hook ?? PlayScene
  return (
    <AbsoluteFill>
      <Scene short={short as ShortId} lang="uz" frames={90} />
      <Robot talking={false} x={560} y={960} size={250} />
    </AbsoluteFill>
  )
}
