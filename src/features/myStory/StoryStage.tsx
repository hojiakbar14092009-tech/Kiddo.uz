import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { useContent3D } from '@/components/three/content3d'
import { canRender3D } from '@/features/mascot/webgl'
import { STORY_BACKDROPS } from '@/features/stories/backdrops'
import { StoryPicture } from '@/features/stories/StoryPicture'
import type { StoryCard } from './content'

// the 3D stage loads only when a story plays (three.js is a large download)
const Stage3D = lazy(() =>
  import('@/features/tales/three/TaleScene3D').then((module) => ({ default: module.Stage3D })),
)

/**
 * A page of the child's own story (Phase 74): a small real 3D world for the place,
 * with its weather, and the hero breathing, hopping and showing how it feels. The
 * flat picture stands in while it loads, without WebGL, or if the 3D fails.
 */
export function StoryStage({ card, label }: { card: StoryCard; label: string }) {
  const reduceMotion = useReducedMotion() ?? false
  const [failed, setFailed] = useState(false)
  const onFail = useCallback(() => setFailed(true), [])
  const live = !failed && canRender3D()
  useContent3D(live)
  const flat = <StoryPicture picture={card.picture} label={label} />
  if (!live) return flat
  return (
    <Suspense fallback={flat}>
      <div
        className="size-full"
        data-testid="my-story-stage"
        data-mood={card.mood}
        data-weather={card.weather ?? 'none'}
      >
        <Stage3D
          look={STORY_BACKDROPS[card.picture.backdrop]}
          actors={card.picture.actors}
          sceneKey={card.id}
          label={label}
          reducedMotion={reduceMotion}
          onFail={onFail}
          mood={card.mood}
          weather={card.weather}
        />
      </div>
    </Suspense>
  )
}
