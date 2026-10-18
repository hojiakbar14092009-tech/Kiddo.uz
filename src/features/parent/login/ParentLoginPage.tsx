import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { signInWithEmail, signUpWithEmail, type AuthResult } from '@/services/supabase/auth'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useParentStore } from '@/store/parentStore'
import { ParentShell } from '../ParentShell'

const MIN_PASSWORD_LENGTH = 8

type Mode = 'signIn' | 'signUp'
type FailReason = Extract<AuthResult, { ok: false }>['reason'] | 'short-password'

/** `/parent/login`: a Supabase account (when configured) or demo mode on this device. */
export function ParentLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useParentStore((state) => state.session)
  const signInDemo = useParentStore((state) => state.signInDemo)
  const setCloudSession = useParentStore((state) => state.setCloudSession)
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FailReason | null>(null)

  if (session) return <Navigate to="/parent/dashboard" replace />

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('short-password')
      return
    }
    setBusy(true)
    setError(null)
    const result =
      mode === 'signIn'
        ? await signInWithEmail(email.trim(), password)
        : await signUpWithEmail(email.trim(), password)
    setBusy(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    setCloudSession(result.email, result.userId)
    navigate('/parent/dashboard', { replace: true })
  }

  const enterDemo = () => {
    signInDemo()
    navigate('/parent/dashboard', { replace: true })
  }

  return (
    <ParentShell>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold">{t('parent.login.title')}</h1>
          <p className="text-ink-soft">{t('parent.login.text')}</p>
        </div>

        {isSupabaseConfigured ? (
          <form
            onSubmit={(event) => void submit(event)}
            className="flex flex-col gap-4 rounded-[28px] bg-surface p-5 shadow-[0_6px_0_var(--color-line)]"
          >
            <label className="flex flex-col gap-1 font-semibold">
              {t('parent.login.email')}
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal"
              />
            </label>
            <label className="flex flex-col gap-1 font-semibold">
              {t('parent.login.password')}
              <input
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal"
              />
            </label>
            {error && (
              <p role="alert" className="rounded-2xl bg-oops-soft px-4 py-2 text-oops-ink">
                {t(`parent.login.errors.${error}`)}
              </p>
            )}
            <Button type="submit" size="md" disabled={busy}>
              {mode === 'signIn' ? t('parent.login.signIn') : t('parent.login.signUp')}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signIn' ? 'signUp' : 'signIn')
                setError(null)
              }}
              className="min-h-12 font-semibold text-primary-ink underline"
            >
              {mode === 'signIn' ? t('parent.login.toSignUp') : t('parent.login.toSignIn')}
            </button>
          </form>
        ) : (
          <p className="rounded-[28px] bg-sky-soft p-5">{t('parent.login.offline')}</p>
        )}

        <div className="flex flex-col items-center gap-2 text-center">
          <Button variant="soft" size="md" onClick={enterDemo}>
            {t('parent.login.demo')}
          </Button>
          <p className="text-sm text-ink-soft">{t('parent.login.demoHint')}</p>
        </div>
      </div>
    </ParentShell>
  )
}
