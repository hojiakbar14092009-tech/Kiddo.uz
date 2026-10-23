import { CHOICE_ART } from './choiceArt'

const GROUND = '#E8F1E4'

/** The picture of one answer (decoration: the answer's text names it). */
export function ChoicePicture({ id, className }: { id: string; className?: string }) {
  const art = CHOICE_ART[id]
  if (!art) return null
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className={className} data-choice-art={id}>
      <rect x="0" y="0" width="120" height="90" rx="12" fill="#F4F8FF" />
      <rect x="0" y="78" width="120" height="12" rx="12" fill={GROUND} />
      <rect x="0" y="78" width="120" height="6" fill={GROUND} />
      {art}
    </svg>
  )
}
