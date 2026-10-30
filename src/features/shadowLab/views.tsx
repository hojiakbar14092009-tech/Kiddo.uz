import { useId } from 'react'
import { WALL_HALF, WALL_Z, placePoints, type Polygon } from './geometry'
import type { Scene } from './puzzles'

/*
 * Pictures of the Shadow Lab, all computed from the scene: the wall with the
 * target and the live shadow, and a map from above with the light, the
 * object and the rays that make the shadow.
 */

const points = (polygon: Polygon) =>
  polygon.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ')

export function WallView({
  shadows,
  target,
  marks,
  soft,
  label,
  className,
  testId,
}: {
  shadows: readonly Polygon[]
  target?: readonly Polygon[]
  /** Faint outlines of the places pieces can go (build). */
  marks?: readonly Polygon[]
  /** A soft shadow edge (strong devices only). */
  soft: boolean
  label: string
  className?: string
  testId?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const pad = WALL_HALF + 0.4
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${pad * 2} ${pad * 2}`}
      role="img"
      aria-label={label}
      className={className}
      data-testid={testId}
      data-soft={soft || undefined}
    >
      <defs>
        {soft && (
          <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.08" />
          </filter>
        )}
        <clipPath id={`${id}-clip`}>
          <rect
            x={-WALL_HALF}
            y={-WALL_HALF}
            width={WALL_HALF * 2}
            height={WALL_HALF * 2}
            rx="0.4"
          />
        </clipPath>
        <radialGradient id={`${id}-wall`} cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#FFF8E6" />
          <stop offset="1" stopColor="#F1E2C2" />
        </radialGradient>
      </defs>
      <rect
        x={-WALL_HALF}
        y={-WALL_HALF}
        width={WALL_HALF * 2}
        height={WALL_HALF * 2}
        rx="0.4"
        fill={`url(#${id}-wall)`}
      />
      {/* y grows upwards on the wall; nothing is drawn past its edges */}
      <g transform="scale(1 -1)" clipPath={`url(#${id}-clip)`}>
        {marks?.map((polygon, index) => (
          <polygon
            key={`m${index}`}
            points={points(polygon)}
            fill="none"
            stroke="#B7A57E"
            strokeWidth="0.05"
            strokeDasharray="0.12 0.12"
            data-mark=""
          />
        ))}
        {shadows.map((polygon, index) => (
          <polygon
            key={index}
            points={points(polygon)}
            fill="#3B2F5C"
            fillOpacity="0.82"
            filter={soft ? `url(#${id}-soft)` : undefined}
            data-shadow=""
          />
        ))}
        {target?.map((polygon, index) => (
          <polygon
            key={index}
            points={points(polygon)}
            fill="none"
            stroke="#E2574C"
            strokeWidth="0.09"
            strokeDasharray="0.25 0.18"
            strokeLinejoin="round"
            data-target=""
          />
        ))}
      </g>
    </svg>
  )
}

/**
 * From above: depth runs left (the light) to right (the wall). Standing at
 * the lamp and facing the wall, your right hand points down the picture, so
 * the scene's right (+x, right on the wall view) is drawn downwards — a true
 * view from above, not a mirror. The rays past the object's ends show where
 * the shadow falls; `rays={false}` hides them (and the shadow on the wall)
 * when the learner has to work that out (the detective).
 */
export function SideMap({
  scene,
  shape,
  label,
  className,
  rays = true,
}: {
  scene: Scene
  shape: Polygon
  label: string
  className?: string
  rays?: boolean
}) {
  const lz = scene.light.z ?? 0
  const corners = placePoints(shape, scene.at)
  // the object's outermost points left and right, as seen from above
  const left = corners.reduce((a, b) => (b[0] < a[0] ? b : a))
  const right = corners.reduce((a, b) => (b[0] > a[0] ? b : a))
  const onWall = (p: readonly [number, number, number]) =>
    scene.light.x + (p[0] - scene.light.x) * ((WALL_Z - lz) / Math.max(0.05, p[2] - lz))
  const lx = scene.light.x
  return (
    <svg
      viewBox="-0.8 -6 11.6 12"
      role="img"
      aria-label={label}
      className={className}
      data-testid="shadow-map"
    >
      <rect x="-0.8" y="-6" width="11.6" height="12" rx="0.6" fill="#1D2A52" />
      {rays && (
        <>
          {/* the light's rays past both ends of the object to the wall */}
          <polygon
            points={`${lz},${lx} ${WALL_Z},${onWall(left)} ${WALL_Z},${onWall(right)}`}
            fill="#FFE7A0"
            fillOpacity="0.16"
          />
          <line x1={lz} y1={lx} x2={WALL_Z} y2={onWall(left)} stroke="#FFD467" strokeWidth="0.06" />
          <line
            x1={lz}
            y1={lx}
            x2={WALL_Z}
            y2={onWall(right)}
            stroke="#FFD467"
            strokeWidth="0.06"
          />
        </>
      )}
      {/* the wall and the shadow on it */}
      <line x1={WALL_Z} y1={-5.5} x2={WALL_Z} y2={5.5} stroke="#F1E2C2" strokeWidth="0.3" />
      {rays && (
        <line
          x1={WALL_Z}
          y1={onWall(left)}
          x2={WALL_Z}
          y2={onWall(right)}
          stroke="#3B2F5C"
          strokeWidth="0.32"
        />
      )}
      {/* the object (its outline from above) */}
      <line
        x1={left[2]}
        y1={left[0]}
        x2={right[2]}
        y2={right[0]}
        stroke="#7FD6F0"
        strokeWidth="0.32"
        strokeLinecap="round"
        data-map-object=""
      />
      {/* the light */}
      <circle cx={lz} cy={lx} r="0.45" fill="#FFD467" data-map-light="" />
      <circle cx={lz} cy={lx} r="0.8" fill="#FFD467" opacity="0.25" />
    </svg>
  )
}
