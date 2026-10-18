import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useState } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Robot, type RobotProps } from './Robot'
import { canRender3D } from './webgl'

const Robot3D = lazy(() => import('./three/Robot3D'))

/**
 * The mascot’s body: the articulated 3D robot when the device can render it,
 * otherwise (or while the 3D code is still loading) the animated SVG robot.
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
  const flat = <Robot {...props} />

  if (failed || !canRender3D()) return flat

  return (
    <ErrorBoundary fallback={flat} onError={() => setFailed(true)}>
      <Suspense fallback={flat}>
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
