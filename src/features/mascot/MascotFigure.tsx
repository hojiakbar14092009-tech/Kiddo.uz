import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useContext, useEffect, useState } from 'react'
import { UNSAFE_LocationContext } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useContent3DActive } from '@/components/three/content3d'
import { onIdle } from '@/lib/onIdle'
import {
  contextOf,
  MASCOTS,
  mascotFor,
  type MascotContext,
  type MascotId,
} from './characters/registry'
import { Robot, type RobotProps } from './Robot'
import { canRender3D, mascotQuality } from './webgl'

const Character3D = lazy(() => import('./characters/Character3D'))

/** KidoBot in the child's colours (the 2D robot uses the same ones). */
const PALETTES = {
  boy: undefined,
  girl: { accent: '#F27BA6', glow: '#FFB8DC' },
} as const

/** The page's mascot context; 'home' outside a router (splash, tests). */
function usePageContext(): MascotContext {
  const location = useContext(UNSAFE_LocationContext)?.location
  return location ? contextOf(location.pathname) : 'home'
}

export interface MascotFigureProps extends RobotProps {
  /** A specific mascot; by default the page's guide (registry.ts CONTEXT_ROUTES). */
  mascot?: MascotId
  /** Home and celebrations: spontaneous idle gestures. Lessons stay calm. */
  lively?: boolean
}

/**
 * The mascot's body. The page's 3D character (KidoBot at home, Astro in
 * space, Dinoo with the dinosaurs, ...) when the device can render it;
 * otherwise, or until it has loaded, a picture of the same character (the 2D
 * robot for KidoBot). Starts once the page's own content is up (onIdle), and
 * a page that shows a 3D model of its own keeps the picture (content3d.ts).
 */
export function MascotFigure({ mascot: chosen, lively = false, ...input }: MascotFigureProps) {
  const context = usePageContext()
  const mascot = chosen ?? mascotFor(context)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const reducedMotion = useReducedMotion() ?? false
  const contentIn3D = useContent3DActive()
  const [besideContent, setBesideContent] = useState(false)
  if (contentIn3D && !besideContent) setBesideContent(true)
  const wants3D = !failed && !besideContent && canRender3D()
  const [pageReady, setPageReady] = useState(false)
  useEffect(() => (wants3D ? onIdle(() => setPageReady(true)) : undefined), [wants3D])
  // a new character starts hidden until its model is in
  const [shownMascot, setShownMascot] = useState(mascot)
  if (shownMascot !== mascot) {
    setShownMascot(mascot)
    setReady(false)
  }

  const picture =
    mascot === 'kidobot' ? (
      <Robot
        {...input}
        className={clsx(input.className, input.mood === 'happy' && 'mascot-tint-happy')}
      />
    ) : (
      <img
        src={MASCOTS[mascot].poster}
        alt={input.label ?? ''}
        aria-hidden={input.label ? undefined : true}
        draggable={false}
        data-mascot-poster={mascot}
        className={clsx('aspect-[5/6] object-contain select-none', input.className)}
      />
    )

  if (!wants3D || !pageReady) return picture
  return (
    <div className={clsx('relative', input.className)} data-mascot-figure={mascot}>
      {!ready && <div className="pointer-events-none">{picture}</div>}
      <ErrorBoundary fallback={picture} onError={() => setFailed(true)}>
        <Suspense fallback={null}>
          <Character3D
            mascot={mascot}
            context={context}
            mood={input.mood ?? 'idle'}
            reactionKey={input.reactionKey ?? 0}
            followPointer={input.followPointer ?? true}
            reducedMotion={reducedMotion}
            lively={lively}
            quality={mascotQuality()}
            palette={mascot === 'kidobot' ? PALETTES[input.model] : undefined}
            wearing={mascot === 'kidobot' ? input.wearing : undefined}
            label={input.label}
            className={clsx('w-full', !ready && 'absolute inset-0 opacity-0')}
            onReady={() => setReady(true)}
            onFail={() => setFailed(true)}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
