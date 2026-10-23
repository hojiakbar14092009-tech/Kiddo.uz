import type { FeelingId } from './content'
import { FACE_ART, FACE_INK, NEUTRAL_FILL } from './faceArt'

/**
 * One feeling face. With `label` it is an image with that name; without,
 * decoration. `neutral` paints every face one colour (L3+), so only the face
 * itself tells the feeling.
 */
export function FeelingFace({
  feeling,
  label,
  neutral = false,
  className,
}: {
  feeling: FeelingId
  label?: string
  neutral?: boolean
  className?: string
}) {
  const art = FACE_ART[feeling]
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      data-feeling={feeling}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <circle
        cx="60"
        cy="60"
        r="52"
        fill={neutral ? NEUTRAL_FILL : art.fill}
        stroke={FACE_INK}
        strokeOpacity="0.2"
        strokeWidth="3"
      />
      {art.parts}
    </svg>
  )
}
