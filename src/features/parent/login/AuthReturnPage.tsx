import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '@/services/cloud/api'
import { completeSignIn, type AuthResult } from '@/services/supabase/auth'
import { useParentStore } from '@/store/parentStore'
import { ParentShell } from '../ParentShell'

type Failure = Extract<AuthResult, { ok: false }>['reason']

/**
 * `/parent/auth` (Phase 44): back from Google or the e-mail link. The one-time code becomes the
 * parent's session (once, even if React runs the effect twice) and the parent goes on to the
 * dashboard (where ConsentGate saves the consent given before, or asks for it). The address loses the code at once.
 */
export function AuthReturnPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { search } = useLocation()
  const setCloudSession = useParentStore((state) => state.setCloudSession)
  const [failure, setFailure] = useState<Failure | null>(null)
  const started = useRef(false)
  // Kiddo's own Google return that failed: shown at once, nothing to wait for
  const ownFailed = /[?&]signin=(?!google)/.test(search)

  useEffect(() => {
    if (started.current) return
    started.current = true
    // the code is used once: it does not stay in the address or the history
    window.history.replaceState(window.history.state, '', window.location.pathname)
    // MVP: back from Google through Kiddo's own API (the session cookie is already set)
    const own = new URLSearchParams(search).get('signin')
    if (own) {
      if (own !== 'google') return
      void api<{ user: { id: string; email: string | null; phone: string | null } }>('me')
        .then(({ user }) => {
          setCloudSession(user.email ?? user.phone ?? '', user.id)
          navigate('/parent/dashboard', { replace: true })
        })
        .catch(() => setFailure('network'))
      return
    }
    void completeSignIn(search).then((result) => {
      if (!result.ok) {
        setFailure(result.reason)
        return
      }
      setCloudSession(result.email, result.userId)
      navigate('/parent/dashboard', { replace: true })
    })
  }, [search, navigate, setCloudSession])

  return (
    <ParentShell width="narrow">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
        {(failure ?? (ownFailed ? 'cancelled' : null)) ? (
          <>
            <p role="alert" className="rounded-2xl bg-oops-soft px-4 py-3 text-oops-ink">
              {t(`parent.login.errors.${failure ?? 'cancelled'}`)}
            </p>
            <Link
              to="/parent/login"
              replace
              className="flex min-h-12 items-center font-semibold text-primary-ink underline"
            >
              {t('parent.login.backToLogin')}
            </Link>
          </>
        ) : (
          <p role="status" className="font-semibold">
            {t('parent.login.finishing')}
          </p>
        )}
      </div>
    </ParentShell>
  )
}
