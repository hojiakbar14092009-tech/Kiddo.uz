import React from 'react'
import { AbsoluteFill } from 'remotion'
import type { ShortId } from './data'
import { Robot } from './parts'
import { PlayScene, SCENES } from './scenes'

/**
 * A cartoon's poster (Phase 69): its opening scene, settled, with the robot –
 * no words, so one picture serves every language (the app writes the title).
 */
export const Poster: React.FC<{ short: ShortId }> = ({ short }) => {
  const Scene = SCENES[short].hook ?? PlayScene
  return (
    <AbsoluteFill>
      <Scene short={short} lang="uz" frames={90} />
      <Robot talking={false} x={560} y={960} size={250} />
    </AbsoluteFill>
  )
}
