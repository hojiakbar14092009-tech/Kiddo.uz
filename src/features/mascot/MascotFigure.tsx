import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useEffect, useState } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { onIdle } from '@/lib/onIdle'
import { Robot, type RobotProps } from './Robot'
import { canRender3D } from './webgl'
import { useContent3DActive } from '@/components/three/content3d'

const Robot3D = lazy(() => import('./three/Robot3D'))

/**
 * The mascot’s body: the articulated 3D robot when the device can render it,
 * otherwise (or while the 3D code is still loading) the animated SVG robot.
 * The 3D robot starts once the page's own content is up (onIdle): creating its
 * WebGL canvas compiles shaders, which held a lesson page back by up to a
 * second on a slow device. Until then its 5:6 box is kept empty (the 2D robot
 * is drawn larger, so showing it first made the robot shrink). A page that
 * shows a 3D model of its own keeps the 2D robot for the whole visit
 * (content3d.ts), so the robot never switches style back and forth.
 */
export function MascotFigure({ tint: useTint = true, ...input }: RobotProps & { tint?: boolean }) {
  // Red and sad after a mistake, green and happy after a right answer,
  // its own colours the rest of the time.
  const tint = !useTint
    ? undefined
    : input.mood === 'oops'
      ? 'mascot-tint-oops'
      : input.mood === 'happy' || input.mood === 'celebrate'
        ? 'mascot-tint-happy'
        : 'mascot-tint-none'
  const props = { ...input, className: clsx(input.className, tint) }
  const [failed, setFailed] = useState(false)
  const reducedMotion = useReducedMotion() ?? false
  // a page with its own 3D model keeps the robot in 2D (content3d.ts)
  const contentIn3D = useContent3DActive()
  const [besideContent, setBesideContent] = useState(false)
  if (contentIn3D && !besideContent) setBesideContent(true)
  const wants3D = !failed && !besideContent && canRender3D()
  const [pageReady, setPageReady] = useState(false)
  useEffect(() => (wants3D ? onIdle(() => setPageReady(true)) : undefined), [wants3D])
  const flat = <Robot {...props} />

  if (!wants3D) return flat
  // the box is held (same size), the 3D robot appears in it
  const waiting = <Robot {...props} className={clsx(props.className, 'invisible')} />
  if (!pageReady) return waiting

  return (
    <ErrorBoundary fallback={flat} onError={() => setFailed(true)}>
      <Suspense fallback={waiting}>
        <Robot3D
          model={props.model}
          mood={props.mood ?? 'idle'}
          reactionKey={props.reactionKey ?? 0}
          followPointer={props.followPointer ?? true}
          reducedMotion={reducedMotion}
          wearing={props.wearing}
          label={props.label}
          className={props.className}
          onFail={() => setFailed(true)}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
