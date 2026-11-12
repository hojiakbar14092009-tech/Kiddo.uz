import clsx from 'clsx'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import {
  sendSignInLink,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  type AuthResult,
} from '@/services/supabase/auth'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { rememberConsent } from '@/services/supabase/consent'
import { useParentStore } from '@/store/parentStore'
import { ParentShell } from '../ParentShell'
import { KiddoSignIn } from './KiddoSignIn'

const MIN_PASSWORD_LENGTH = 8

type Mode = 'signIn' | 'signUp'
type Method = 'password' | 'link'
type FailReason = Extract<AuthResult, { ok: false }>['reason'] | 'short-password' | 'consent'

const FIELD = 'h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal'

/**
 * `/parent/login` (Phase 44): Google, an e-mail sign-in link or e-mail and password (when a
 * Supabase account is configured), or demo mode on this device. Anything that may create an
 * account asks for the parent's consent first.
 */
export function ParentLoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useParentStore((state) => state.session)
  const signInDemo = useParentStore((state) => state.signInDemo)
  const setCloudSession = useParentStore((state) => state.setCloudSession)
  const [mode, setMode] = useState<Mode>('signIn')
  const [method, setMethod] = useState<Method>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FailReason | null>(null)
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null)

  if (session) return <Navigate to="/parent/dashboard" replace />

  /** A new account may be made: consent first (remembered for the trip to Google too). */
  const consented = () => {
    if (!consent) {
      setError('consent')
      return false
    }
    rememberConsent()
    return true
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (method === 'link') {
      if (!consented()) return
      setBusy(true)
      const sent = await sendSignInLink(email.trim())
      setBusy(false)
      if (sent.ok) setLinkSentTo(email.trim())
      else setError(sent.reason)
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('short-password')
      return
    }
    if (mode === 'signUp' && !consented()) return
    setBusy(true)
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

  const google = async () => {
    setError(null)
    if (!consented()) return
    setBusy(true)
    const failed = await signInWithGoogle()
    // on success the browser is already on its way to Google
    if (failed) {
      setBusy(false)
      setError(failed.reason)
    }
  }

  const enterDemo = () => {
    signInDemo()
    navigate('/parent/dashboard', { replace: true })
  }

  return (
    <ParentShell width="narrow">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold">{t('parent.login.title')}</h1>
          <p className="text-ink-soft">{t('parent.login.text')}</p>
        </div>

        {isSupabaseConfigured ? (
          <div className="flex flex-col gap-4 rounded-[28px] bg-surface p-5 shadow-[0_6px_0_var(--color-line)]">
            <div className="flex flex-col gap-2 rounded-2xl bg-cream p-3">
              <label className="flex min-h-11 items-start gap-3 text-sm leading-snug">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => {
                    setConsent(event.target.checked)
                    if (event.target.checked && error === 'consent') setError(null)
                  }}
                  data-testid="login-consent"
                  aria-invalid={error === 'consent'}
                  aria-describedby={error === 'consent' ? 'login-consent-error' : undefined}
                  className="mt-0.5 size-6 shrink-0 accent-primary"
                />
                <span>{t('parent.login.consent')}</span>
              </label>
              {error === 'consent' && (
                <p
                  id="login-consent-error"
                  role="alert"
                  className="rounded-2xl bg-oops-soft px-4 py-2 text-sm text-oops-ink"
                >
                  {t('parent.login.errors.consent')}
                </p>
              )}
              <details className="text-sm text-ink-soft">
                <summary className="min-h-11 cursor-pointer content-center font-semibold text-primary-ink">
                  {t('parent.login.consentMore')}
                </summary>
                <p className="pt-1">{t('parent.login.consentDetails')}</p>
              </details>
            </div>

            <Button
              variant="soft"
              size="md"
              onClick={() => void google()}
              disabled={busy}
              data-testid="login-google"
              icon={<GoogleMark />}
            >
              {t('parent.login.google')}
            </Button>

            <p className="flex items-center gap-3 text-sm text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
              {t('parent.login.orEmail')}
            </p>

            <div
              className="grid grid-cols-2 gap-2"
              role="group"
              aria-label={t('parent.login.orEmail')}
            >
              {(['password', 'link'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={method === value}
                  onClick={() => {
                    setMethod(value)
                    setError(null)
                    setLinkSentTo(null)
                  }}
                  className={clsx(
                    'min-h-11 rounded-full px-3 text-sm font-semibold transition-colors',
                    method === value ? 'bg-primary text-white' : 'bg-cream text-ink',
                  )}
                >
                  {value === 'password'
                    ? t('parent.login.withPassword')
                    : t('parent.login.withLink')}
                </button>
              ))}
            </div>

            <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1 font-semibold">
                {t('parent.login.email')}
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={FIELD}
                />
              </label>
              {method === 'password' && (
                <label className="flex flex-col gap-1 font-semibold">
                  {t('parent.login.password')}
                  <input
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={FIELD}
                  />
                </label>
              )}
              {error && error !== 'consent' && (
                <p role="alert" className="rounded-2xl bg-oops-soft px-4 py-2 text-oops-ink">
                  {t(`parent.login.errors.${error}`)}
                </p>
              )}
              {linkSentTo && (
                <p role="status" className="rounded-2xl bg-sky-soft px-4 py-2">
                  {t('parent.login.linkSent', { email: linkSentTo })}
                </p>
              )}
              <Button type="submit" size="md" disabled={busy}>
                {method === 'link'
                  ? t('parent.login.sendLink')
                  : mode === 'signIn'
                    ? t('parent.login.signIn')
                    : t('parent.login.signUp')}
              </Button>
              {method === 'password' && (
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
              )}
            </form>
          </div>
        ) : (
          // MVP: Kiddo's own sign-in (Google, e-mail code, Telegram code)
          <KiddoSignIn onSignedIn={() => navigate('/parent/dashboard', { replace: true })} />
        )}

        {/* MVP: three ways only; demo stays for development and the browser tests */}
        {(isSupabaseConfigured ||
          import.meta.env.DEV ||
          import.meta.env.MODE === 'e2e' ||
          import.meta.env.MODE === 'test') && (
          <div className="flex flex-col items-center gap-2 text-center">
            <Button variant="soft" size="md" onClick={enterDemo}>
              {t('parent.login.demo')}
            </Button>
            <p className="text-sm text-ink-soft">{t('parent.login.demoHint')}</p>
          </div>
        )}
      </div>
    </ParentShell>
  )
}

/** The four-colour G (drawn, no external image). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
