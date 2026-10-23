import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/components/ui/toast'
import {
  AI_TUTOR_ENABLED,
  pullAiConsent,
  saveAiConsent,
  useAiAvailability,
  useAiConsentStore,
} from '@/domain/tutor'
import { tDynamic } from '@/lib/tDynamic'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { Panel } from './Panel'

/**
 * The AI helper in the parent settings (Phase 10, docs/architecture/ai-tutor.md):
 * what it does, what is sent, who the provider is, and one switch per child.
 * The server keeps the switch (set_ai_consent); without a Kiddo server or a
 * cloud account the panel says so and Kiddo's own hints keep working.
 */
export function AiTutorPanel() {
  const { t } = useTranslation()
  const children = useFamilyStore((state) => state.children)

  useEffect(() => {
    void pullAiConsent().catch(() => undefined)
  }, [])

  return (
    <Panel title={t('parent.aiTutor.title')} className="lg:col-span-2" id="ai-tutor">
      <p>{t('parent.aiTutor.intro')}</p>
      <p className="text-ink-soft">{t('parent.aiTutor.local')}</p>
      {children.length > 0 && (
        <ul className="flex flex-col gap-3" data-testid="ai-tutor-children">
          {children.map((child) => (
            <ChildSwitch key={child.id} child={child} />
          ))}
        </ul>
      )}
      {/* what would be sent, and to whom: only where the AI helper can be switched on */}
      {AI_TUTOR_ENABLED && (
        <>
          <p className="text-sm text-ink-soft">{t('parent.aiTutor.sent')}</p>
          <p className="text-sm text-ink-soft">{t('parent.aiTutor.provider')}</p>
        </>
      )}
    </Panel>
  )
}

function ChildSwitch({ child }: { child: ChildProfile }) {
  const { t } = useTranslation()
  const availability = useAiAvailability(child.id)
  const granted = useAiConsentStore((state) => state.byChild[child.id]?.granted === true)
  const [busy, setBusy] = useState(false)
  // the switch only exists where the server can keep it (cloud account, PRO)
  const canSwitch = availability === 'off' || availability === 'ready' || availability === 'resting'
  const labelId = `ai-tutor-${child.id}`

  const toggle = async () => {
    setBusy(true)
    try {
      await saveAiConsent(child.id, !granted)
    } catch {
      toast(t('parent.aiTutor.saveFailed'), 'warning')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li
      className="flex items-center justify-between gap-4 rounded-2xl bg-cream p-4"
      data-testid="ai-tutor-child"
      data-availability={availability}
    >
      <span id={labelId}>
        <span className="block font-semibold">
          {t('parent.aiTutor.toggle', { name: child.name })}
        </span>
        <span className="text-sm text-ink-soft">
          {tDynamic(t, `parent.aiTutor.status.${availability}`)}
        </span>
      </span>
      {canSwitch && (
        <button
          type="button"
          role="switch"
          aria-checked={granted}
          aria-labelledby={labelId}
          disabled={busy}
          onClick={() => void toggle()}
          className={clsx(
            'flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-40',
            granted ? 'bg-primary' : 'bg-line-strong',
          )}
        >
          <span
            aria-hidden="true"
            className={clsx(
              'size-7 rounded-full bg-surface shadow transition-transform',
              granted && 'translate-x-7',
            )}
          />
        </button>
      )}
    </li>
  )
}
