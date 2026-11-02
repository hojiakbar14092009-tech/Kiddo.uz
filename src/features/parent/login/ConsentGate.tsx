import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useParentStore } from '@/store/parentStore'
import type { ConsentState } from '@/services/supabase/consent'

/**
 * A cloud account needs the parent's consent on record (Phase 44). Signed in, the account's
 * row is checked once: a consent given on this device before signing in (or carried by the
 * sign-up) is saved now; without any, the parent is asked here before the parent area opens.
 * When the cloud cannot be read the area opens (it is asked again next time).
 */
export function ConsentGate({ children, onLeave }: { children: ReactNode; onLeave: () => void }) {
  const { t } = useTranslation()
  const userId = useParentStore((state) =>
    state.session?.mode === 'cloud' ? state.session.userId : null,
  )
  const [state, setState] = useState<ConsentState | 'checking'>('checking')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!userId) return undefined
    let alive = true
    void (async () => {
      const [{ getSupabase }, { ensureConsent }] = await Promise.all([
        import('@/services/supabase/client'),
        import('@/services/supabase/consent'),
      ])
      const supabase = getSupabase()
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      const result = await ensureConsent(supabase, data.session?.user ?? null)
      if (alive) setState(result)
    })().catch(() => alive && setState('unknown'))
    return () => {
      alive = false
    }
  }, [userId])

  if (!userId || state !== 'needed') return <>{children}</>

  const accept = async () => {
    setBusy(true)
    setFailed(false)
    const { acceptConsent } = await import('@/services/supabase/consent')
    const saved = await acceptConsent()
    setBusy(false)
    if (saved) setState('ok')
    else setFailed(true)
  }

  return (
    <section
      aria-labelledby="consent-again"
      data-testid="consent-gate"
      className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-[28px] bg-surface p-5 shadow-[0_6px_0_var(--color-line)]"
    >
      <h1 id="consent-again" className="font-display text-2xl font-extrabold">
        {t('parent.login.againTitle')}
      </h1>
      <label className="flex min-h-11 items-start gap-3 leading-snug">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-0.5 size-6 shrink-0 accent-primary"
        />
        <span>{t('parent.login.consent')}</span>
      </label>
      <p className="text-sm text-ink-soft">{t('parent.login.consentDetails')}</p>
      {failed && (
        <p role="alert" className="rounded-2xl bg-oops-soft px-4 py-2 text-oops-ink">
          {t('parent.login.acceptFailed')}
        </p>
      )}
      <Button size="md" disabled={!agreed || busy} onClick={() => void accept()}>
        {t('parent.login.accept')}
      </Button>
      <button
        type="button"
        onClick={onLeave}
        className="min-h-12 font-semibold text-primary-ink underline"
      >
        {t('parent.signOut')}
      </button>
    </section>
  )
}
