import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode, Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { BulbIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import type { HintLevel } from '@/domain/learningMemory'
import type { TutorSource } from '@/domain/tutor'
import { useSpeakable } from '@/features/learn/speakable'

/**
 * The tutor's hint inside a learning activity (not a chat window): the
 * step of the hint ladder, the words, an optional picture and "more help".
 * The speaker button reads the hint. An AI reply is marked as such; while
 * one is on its way a small thinking sign shows next to Kiddo's own hint.
 */
export function TutorPanel({
  level,
  message,
  source,
  thinking,
  onMore,
  note,
  children,
  panelRef,
  className,
}: {
  level: HintLevel
  message: string
  source: TutorSource
  thinking: boolean
  /** One step more help; hidden at the last step. */
  onMore?: () => void
  /** A short line above the hint (e.g. "too many in the basket"). */
  note?: string | null
  children?: ReactNode
  panelRef?: Ref<HTMLElement>
  className?: string
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  useSpeakable([note, message])

  return (
    <aside
      ref={panelRef}
      data-testid="lab-help"
      data-hint-level={level}
      data-source={source}
      aria-label={t('tutor.title')}
      className={clsx(
        'mx-auto flex w-full max-w-3xl flex-col items-center gap-3 rounded-card bg-coin-soft p-4 text-center short:p-2',
        className,
      )}
    >
      <div
        className="flex items-center gap-2"
        aria-label={t('tutor.hintStep', { level })}
        role="img"
      >
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            aria-hidden="true"
            className={clsx(
              'size-2.5 rounded-full',
              step <= level ? 'bg-coin-shadow' : 'bg-white/80',
            )}
          />
        ))}
      </div>
      {note && <p className="font-display text-xl font-extrabold short:text-base">{note}</p>}
      <p
        aria-live="polite"
        data-testid="tutor-message"
        className="flex items-center gap-2 text-lg font-bold short:text-base"
      >
        <BulbIcon size={26} className="shrink-0 text-coin-shadow" />
        <span>{message}</span>
      </p>
      {source === 'ai' && (
        <span
          data-testid="tutor-ai"
          className="rounded-full bg-white/80 px-3 py-0.5 text-sm font-semibold text-ink-soft"
        >
          {t('tutor.aiLabel')}
        </span>
      )}
      {thinking && (
        <p
          role="status"
          data-testid="tutor-thinking"
          className="flex items-center gap-2 text-ink-soft"
        >
          <span aria-hidden="true" className="flex gap-1">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="size-2 rounded-full bg-ink-soft"
                animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
              />
            ))}
          </span>
          {t('tutor.thinking')}
        </p>
      )}
      {children}
      {onMore && level < 4 && (
        <Button variant="soft" size="md" onClick={onMore} data-testid="tutor-more">
          {t('tutor.more')}
        </Button>
      )}
    </aside>
  )
}
