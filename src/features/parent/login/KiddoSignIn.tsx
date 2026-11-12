import clsx from 'clsx'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { useSingleFlight } from '@/lib/useSingleFlight'
import { api, ApiError } from '@/services/cloud/api'
import { useParentStore } from '@/store/parentStore'
import { useLanguage } from '@/store/settingsStore'
import { qrOf, RESEND_AFTER_MS, secondsUntil, SIGN_IN_TEXT, type SignInText } from './signInText'

/*
 * The MVP parent sign-in (Kiddo's own API, Turso): Google, a code by e-mail, a code by Telegram.
 * One screen, three ways; a way the server has not set up is not offered.
 */
const FIELD =
  'min-h-12 w-full rounded-2xl border-2 border-line bg-cream px-4 text-lg outline-none focus-visible:border-primary'
const POLL_MS = 3_000

type Methods = { google: boolean; email: boolean; telegram: boolean }

const errorOf = (error: unknown) => (error instanceof ApiError ? error.code : 'offline')

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])
  return now
}

/** After a code was accepted: the account becomes this device's parent session. */
async function finish(setCloudSession: (email: string, userId: string) => void) {
  const { user } = await api<{ user: { id: string; email: string | null; phone: string | null } }>(
    'me',
  )
  setCloudSession(user.email ?? user.phone ?? '', user.id)
}

export function KiddoSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const language = useLanguage() ?? 'uz'
  const text = SIGN_IN_TEXT[language]
  const setCloudSession = useParentStore((state) => state.setCloudSession)
  const [methods, setMethods] = useState<Methods | null>(null)
  const [tab, setTab] = useState<'telegram' | 'email'>('telegram')

  useEffect(() => {
    api<Methods>('auth/methods')
      .then((found) => {
        setMethods(found)
        if (!found.telegram && found.email) setTab('email')
      })
      .catch(() => setMethods({ google: false, email: false, telegram: false }))
  }, [])

  const done = async () => {
    await finish(setCloudSession)
    onSignedIn()
  }

  if (!methods)
    return (
      <p className="text-ink-soft" aria-busy="true">
        …
      </p>
    )
  if (!methods.google && !methods.email && !methods.telegram)
    return <p className="rounded-[28px] bg-sky-soft p-5">{text.noMethods}</p>

  const tabs = (['telegram', 'email'] as const).filter((name) => methods[name])
  return (
    <div
      className="flex flex-col gap-4 rounded-[28px] bg-surface p-5 shadow-[0_6px_0_var(--color-line)]"
      data-testid="kiddo-sign-in"
    >
      {methods.google && (
        <Button
          variant="soft"
          size="md"
          onClick={() => window.location.assign('/api/auth/google/start')}
          data-testid="login-google"
        >
          {text.google}
        </Button>
      )}
      {tabs.length > 1 && (
        <div role="group" aria-label={text.tabs} className="grid grid-cols-2 gap-2">
          {tabs.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={tab === name}
              onClick={() => setTab(name)}
              className={clsx(
                'min-h-12 rounded-full px-3 font-semibold',
                tab === name ? 'bg-primary text-white' : 'bg-cream text-ink',
              )}
            >
              {text[name]}
            </button>
          ))}
        </div>
      )}
      {tab === 'telegram' && methods.telegram ? (
        <TelegramFlow
          text={text}
          language={language}
          onDone={done}
          onOtherWay={() =>
            methods.email
              ? setTab('email')
              : // no e-mail set up: the other way is the Google button above
                document.querySelector<HTMLElement>('[data-testid="login-google"]')?.focus()
          }
        />
      ) : (
        methods.email && <EmailFlow text={text} language={language} onDone={done} />
      )}
    </div>
  )
}

function CodeForm({
  text,
  onSubmit,
  error,
}: {
  text: SignInText
  onSubmit: (code: string) => Promise<void>
  error: string | null
}) {
  const [code, setCode] = useState('')
  const [run, pending] = useSingleFlight(onSubmit)
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event: FormEvent) => {
        event.preventDefault()
        void run(code)
      }}
    >
      <label className="flex flex-col gap-1 font-semibold">
        {text.code}
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className={clsx(FIELD, 'tracking-[0.4em]')}
        />
      </label>
      {error && (
        <p role="alert" className="font-semibold text-oops-ink">
          {error}
        </p>
      )}
      <Button type="submit" size="md" disabled={pending || code.length !== 6}>
        {text.signIn}
      </Button>
    </form>
  )
}

type Login = { token: string; link: string }
type Status = 'waiting' | 'code_sent' | 'used' | 'expired'

function TelegramFlow({
  text,
  language,
  onDone,
  onOtherWay,
}: {
  text: SignInText
  language: string
  onDone: () => Promise<void>
  onOtherWay: () => void
}) {
  const [phone, setPhone] = useState('')
  const [login, setLogin] = useState<Login | null>(null)
  const [status, setStatus] = useState<Status>('waiting')
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const active = !!login && status !== 'used' && status !== 'expired'
  const now = useNow(active)

  // the page asks the server how the sign-in goes; it never waits on one request (no frozen screen)
  useEffect(() => {
    if (!active || !login) return undefined
    const timer = setInterval(() => {
      api<{ status: Status; resendAt: number | null }>(
        `auth/telegram/status?token=${login.token}`,
        { retries: 0 },
      )
        .then((found) => {
          setStatus(found.status)
          if (found.resendAt) setResendAt((at) => Math.max(at ?? 0, found.resendAt!))
        })
        .catch(() => undefined) // offline for a moment: the next tick tries again
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [active, login])

  const [startRun, starting] = useSingleFlight(async () => {
    setError(null)
    try {
      const made = await api<Login>('auth/telegram/start', {
        method: 'POST',
        body: { phone: `+998${phone}`, language },
      })
      setLogin(made)
      setStatus('waiting')
      setResendAt(Date.now() + RESEND_AFTER_MS)
      window.open(made.link, '_blank', 'noopener')
      setQr(await qrOf(made.link).catch(() => null))
    } catch (failure) {
      setError(text.errors[errorOf(failure)] ?? text.errors.failed!)
    }
  })

  const [resendRun, resending] = useSingleFlight(async () => {
    if (!login) return
    setError(null)
    try {
      const sent = await api<{ resendAt: number }>('auth/telegram/resend', {
        method: 'POST',
        body: { token: login.token },
      })
      setResendAt(sent.resendAt)
    } catch (failure) {
      const code = errorOf(failure)
      if (failure instanceof ApiError && typeof failure.body.retryAfter === 'number')
        setResendAt(Date.now() + failure.body.retryAfter * 1000)
      // the bot was not started yet: opening it again is the way on
      setError(code === 'not_started' ? text.waiting : (text.errors[code] ?? text.errors.failed!))
      if (code === 'expired' || code === 'too_many_sends') setStatus('expired')
    }
  })

  const verify = async (code: string) => {
    if (!login) return
    setError(null)
    try {
      await api('auth/telegram/verify', { method: 'POST', body: { token: login.token, code } })
      await onDone()
    } catch (failure) {
      const reason = errorOf(failure)
      setError(text.errors[reason] ?? text.errors.failed!)
      if (reason === 'expired') setStatus('expired')
    }
  }

  const restart = () => {
    setLogin(null)
    setQr(null)
    setError(null)
    setStatus('waiting')
  }

  const wait = secondsUntil(resendAt, now)
  return (
    <div className="flex flex-col gap-4" data-testid="telegram-sign-in">
      <ol className="flex list-decimal flex-col gap-1 pl-6 text-ink-soft">
        {text.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {!login ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void startRun()
          }}
        >
          <label className="flex flex-col gap-1 font-semibold">
            {text.phone}
            <span className="flex items-center gap-2">
              <span className="font-display text-lg">+998</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 9))}
                className={FIELD}
                placeholder="90 123 45 67"
              />
            </span>
          </label>
          {error && (
            <p role="alert" className="font-semibold text-oops-ink">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="md"
            disabled={starting || phone.length !== 9}
            data-testid="telegram-get-code"
          >
            {text.getCode}
          </Button>
        </form>
      ) : status === 'expired' || status === 'used' ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="font-semibold">
            {text.expired}
          </p>
          <Button size="md" variant="soft" onClick={restart}>
            {text.restart}
          </Button>
        </div>
      ) : (
        <>
          <p
            role="status"
            aria-live="polite"
            data-testid="telegram-status"
            className="font-semibold"
          >
            {status === 'code_sent' ? text.codeSent : text.waiting}
          </p>
          <div className="hidden items-center gap-4 rounded-2xl bg-cream p-3 md:flex">
            {qr && (
              <img
                src={qr}
                alt={text.qr}
                className="size-36 shrink-0 rounded-xl bg-white"
                data-testid="telegram-qr"
              />
            )}
            <div className="flex flex-col gap-2">
              <p className="text-sm text-ink-soft">{text.qr}</p>
              <Button
                size="md"
                variant="soft"
                onClick={() =>
                  void navigator.clipboard?.writeText(login.link).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  )
                }
              >
                {copied ? text.copied : text.copy}
              </Button>
            </div>
          </div>
          <CodeForm text={text} onSubmit={verify} error={error} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              size="md"
              variant="soft"
              disabled={wait > 0 || resending}
              onClick={() => void resendRun()}
              data-testid="telegram-resend"
            >
              {wait > 0 ? text.resendIn(wait) : text.resend}
            </Button>
            <Button
              size="md"
              variant="soft"
              disabled={wait > 0}
              onClick={() => window.open(login.link, '_blank', 'noopener')}
              data-testid="telegram-reopen"
            >
              {text.reopen}
            </Button>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={onOtherWay}
        className="min-h-12 text-sm font-semibold text-primary-ink underline"
      >
        {text.noTelegram}
      </button>
    </div>
  )
}

function EmailFlow({
  text,
  language,
  onDone,
}: {
  text: SignInText
  language: string
  onDone: () => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [sentAt, setSentAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const now = useNow(sentAt !== null)

  const [sendRun, sending] = useSingleFlight(async () => {
    setError(null)
    try {
      await api('auth/email/start', { method: 'POST', body: { email, language } })
      setSentAt(Date.now())
    } catch (failure) {
      setError(text.errors[errorOf(failure)] ?? text.errors.failed!)
    }
  })

  const verify = async (code: string) => {
    setError(null)
    try {
      await api('auth/email/verify', { method: 'POST', body: { email, code } })
      await onDone()
    } catch (failure) {
      setError(text.errors[errorOf(failure)] ?? text.errors.failed!)
    }
  }

  const wait = secondsUntil(sentAt === null ? null : sentAt + RESEND_AFTER_MS, now)
  return (
    <div className="flex flex-col gap-3" data-testid="email-sign-in">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void sendRun()
        }}
      >
        <label className="flex flex-col gap-1 font-semibold">
          {text.emailAddress}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={FIELD}
          />
        </label>
        <Button
          type="submit"
          size="md"
          variant={sentAt ? 'soft' : 'primary'}
          disabled={sending || wait > 0}
        >
          {sentAt === null ? text.sendEmail : wait > 0 ? text.resendIn(wait) : text.resend}
        </Button>
      </form>
      {sentAt !== null && (
        <>
          <p role="status">{text.emailSent(email)}</p>
          <CodeForm text={text} onSubmit={verify} error={error} />
        </>
      )}
      {sentAt === null && error && (
        <p role="alert" className="font-semibold text-oops-ink">
          {error}
        </p>
      )}
    </div>
  )
}
