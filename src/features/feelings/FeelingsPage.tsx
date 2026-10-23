import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { SPEAK_PRIORITY, useSpeakable } from '@/features/learn/speakable'
import { CalmCorner } from './CalmCorner'
import { FeelingFace } from './FeelingFace'
import { FeelingsRun } from './FeelingsRun'
import { isFeelingsKind, type FeelingsKind } from './session'

/**
 * `/feelings`: the Friendship House of Kiddo City (Emotions & Social Skills).
 * Four doors: recognise feelings on faces, in short stories, choose a kind
 * way in everyday situations, and the calm corner. Always open; the child's
 * 'social' challenge level only chooses the content.
 */
export function FeelingsPage() {
  const { kind } = useParams()
  if (kind === undefined) return <FeelingsHub />
  if (!isFeelingsKind(kind)) return <Navigate to="/feelings" replace />
  if (kind === 'calm') return <CalmCorner />
  return <FeelingsRun key={kind} kind={kind} />
}

const TINT: Record<FeelingsKind, string> = {
  faces: 'bg-coin-soft',
  scenes: 'bg-sky-soft',
  kindness: 'bg-girl-soft',
  calm: 'bg-primary-soft',
}

const KINDS: readonly FeelingsKind[] = ['faces', 'scenes', 'kindness', 'calm']

function art(kind: FeelingsKind): ReactNode {
  if (kind === 'faces') return <FeelingFace feeling="happy" className="size-full" />
  if (kind === 'scenes') return <FeelingFace feeling="surprised" className="size-full" />
  if (kind === 'kindness') return <KindnessArt />
  return <CalmArt />
}

function FeelingsHub() {
  const { t } = useTranslation()
  useSpeakable([t('feelings.hubPrompt')], SPEAK_PRIORITY.page)
  return (
    <Screen header={<TitleTopBar title={t('feelings.title')} back="/home" />}>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-5 sm:gap-6 sm:py-8 short:gap-2 short:py-2">
        <div className="flex items-center justify-center gap-3">
          <p className="text-center font-display text-xl font-extrabold sm:text-2xl short:text-lg">
            {t('feelings.hubPrompt')}
          </p>
          <SpeakButton />
        </div>
        <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-5 lg:grid-cols-4 short:grid-cols-4 short:gap-3">
          {KINDS.map((kind) => (
            <li key={kind}>
              <Link
                to={`/feelings/${kind}`}
                data-testid={`feelings-door-${kind}`}
                className="flex h-full items-center gap-4 rounded-card bg-surface p-3 shadow-press transition-transform active:translate-y-1 min-[480px]:flex-col min-[480px]:p-4 min-[480px]:text-center short:gap-1 short:p-2"
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    'flex size-20 shrink-0 items-center justify-center rounded-tile p-2 min-[480px]:aspect-[5/4] min-[480px]:size-auto min-[480px]:w-full min-[480px]:p-3 short:aspect-auto short:h-20',
                    TINT[kind],
                  )}
                >
                  <span className="flex size-full max-h-32 items-center justify-center *:max-h-full">
                    {art(kind)}
                  </span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-display text-xl leading-tight font-extrabold sm:text-2xl short:text-base">
                    {t(`feelings.kinds.${kind}`)}
                  </span>
                  <span className="text-base leading-snug text-ink-soft sm:text-lg short:hidden">
                    {t(`feelings.kindHints.${kind}`)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Screen>
  )
}

/** Two hands holding a heart: the kind way. */
function KindnessArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full">
      <path
        d="M60 92 C30 72 22 56 30 42 C37 30 53 31 60 44 C67 31 83 30 90 42 C98 56 90 72 60 92 Z"
        fill="#F27BA6"
        stroke="#3a2e4d"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M14 84 Q28 78 40 88 L56 100 Q60 104 56 108 L34 108 Q20 106 14 98 Z"
        fill="#FFD7B5"
        stroke="#3a2e4d"
        strokeOpacity="0.35"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M106 84 Q92 78 80 88 L64 100 Q60 104 64 108 L86 108 Q100 106 106 98 Z"
        fill="#E8B48F"
        stroke="#3a2e4d"
        strokeOpacity="0.35"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Rings of a slow breath. */
function CalmArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="size-full">
      <circle cx="60" cy="60" r="54" fill="#13917e" opacity="0.12" />
      <circle cx="60" cy="60" r="40" fill="#13917e" opacity="0.18" />
      <circle cx="60" cy="60" r="26" fill="#13917e" opacity="0.3" />
      <path
        d="M48 60 Q54 66 60 60 Q66 54 72 60"
        stroke="#0f6e5f"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
