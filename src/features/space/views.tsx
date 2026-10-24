import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { Img3D } from '@/features/learn/Img3D'
import { canRender3D } from '@/features/mascot/webgl'
import { KIND, PLANETS, pictureOf, type SpaceId } from './content'
import { useSpaceText } from './useSpaceText'
import { useContent3D } from '@/components/three/content3d'

// three.js is loaded only when a planet is opened up close
const Planet3D = lazy(() => import('./three/Planet3D'))

/** A still picture of an object (our own planet renders, or the 3D star). */
export function SpacePicture({
  id,
  className,
  alt = '',
  eager = false,
}: {
  id: SpaceId
  className?: string
  alt?: string
  eager?: boolean
}) {
  if (id === 'stars') {
    return (
      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className={clsx('space-stars', className)}
      >
        <Img3D name="glowing-star" className="space-stars-big" eager={eager} />
        <Img3D name="star" className="space-stars-small space-stars-a" eager={eager} />
        <Img3D name="star" className="space-stars-small space-stars-b" eager={eager} />
      </span>
    )
  }
  return <Img3D name={pictureOf(id)} alt={alt} className={className} eager={eager} />
}

/**
 * The big view of an object: a real 3D model the child can turn when the
 * device can show WebGL; otherwise the still picture, with a note saying so
 * (it is never presented as something to turn).
 */
export function PlanetView({ id, className }: { id: SpaceId; className?: string }) {
  const text = useSpaceText()
  const reducedMotion = useReducedMotion() ?? false
  const [failed, setFailed] = useState(false)
  const onFail = useCallback(() => setFailed(true), [])
  const name = text.objects[id].name
  const picture = <SpacePicture id={id} alt={name} eager className="size-full" />
  const live = id !== 'stars' && !failed && canRender3D()
  useContent3D(live)

  return (
    <figure className={clsx('flex flex-col items-center gap-2', className)}>
      <div className="space-stage aspect-square w-full">
        {live ? (
          <Suspense fallback={<div className="size-full p-[8%]">{picture}</div>}>
            <Planet3D id={id} label={name} reducedMotion={reducedMotion} onFail={onFail} />
          </Suspense>
        ) : (
          <div className="size-full p-[8%]">{picture}</div>
        )}
      </div>
      {id !== 'stars' && (
        <figcaption className="space-caption text-center text-sm">
          {live ? (
            <>
              <span aria-hidden="true">👆 </span>
              {text.ui.dragHint}
              <span className="sr-only"> {text.ui.keysHint}</span>
            </>
          ) : (
            text.ui.pictureOnly
          )}
        </figcaption>
      )}
    </figure>
  )
}

export function KindChip({ id }: { id: SpaceId }) {
  const text = useSpaceText()
  const kind = KIND[id]
  return <span className={clsx('space-chip', `space-chip-${kind}`)}>{text.kind[kind]}</span>
}

/** The planets in order from the Sun, with names (help for order questions). */
export function OrderStrip() {
  const text = useSpaceText()
  return (
    <ol className="space-order-strip">
      <li>
        <SpacePicture id="sun" className="size-10" />
        <span>{text.objects.sun.name}</span>
      </li>
      {PLANETS.map((planet, index) => (
        <li key={planet}>
          <SpacePicture id={planet} className="size-10" />
          <span>
            {index + 1}. {text.objects[planet].name}
          </span>
        </li>
      ))}
    </ol>
  )
}
