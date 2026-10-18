import clsx from 'clsx'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { KiddoMark } from '@/components/brand/KiddoLogo'
import { isSupabaseConfigured } from '@/services/supabase/config'
import type { Payment } from '@/store/paymentStore'
import './admin.css'
import { AdminBackground } from './AdminBackground'
import { useAdminData, type AdminData } from './adminData'
import { AdminMascot, NaviFigure, type MascotNote } from './AdminMascot'
import {
  ChildrenSection,
  Overview,
  PaymentsSection,
  PromoSection,
  SettingsSection,
} from './AdminSections'
import { ADMIN_PIN, useAdminStore, type AdminSession } from './adminSession'
import { formatSom, revenueTotals } from './revenue'

type Section = 'overview' | 'children' | 'payments' | 'promo' | 'settings'

const SECTIONS: { id: Section; label: string; icon: ReactNode }[] = [
  {
    id: 'overview',
    label: 'Umumiy',
    icon: <IconPath d="M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z" />,
  },
  {
    id: 'children',
    label: 'Bolalar',
    icon: (
      <IconPath d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m7 1a3 3 0 1 0 0-6M2 21c0-4 3-7 7-7s7 3 7 7m2-7c2.5.4 4 3 4 7" />
    ),
  },
  { id: 'payments', label: 'To‘lovlar', icon: <IconPath d="M3 6h18v12H3zm0 4h18M7 15h3" /> },
  { id: 'promo', label: 'Promokodlar', icon: <IconPath d="M4 8V4h4l12 12-4 4L4 8m4-1h.01" /> },
  {
    id: 'settings',
    label: 'Sozlamalar',
    icon: (
      <IconPath d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m7.4-3 1.6-1.2-2-3.4-1.9.6a7 7 0 0 0-1.7-1l-.4-2h-4l-.4 2a7 7 0 0 0-1.7 1l-1.9-.6-2 3.4L4.6 12 3 13.2l2 3.4 1.9-.6a7 7 0 0 0 1.7 1l.4 2h4l.4-2a7 7 0 0 0 1.7-1l1.9.6 2-3.4z" />
    ),
  },
]

function IconPath({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

const PLAN_NAMES: Record<string, string> = {
  monthly: 'oylik',
  yearly: 'yillik',
  lifetime: 'umrbod',
}

/** `/admin`: the owner's control room – separate from the children's app and its design. */
export function AdminPage() {
  const session = useAdminStore((state) => state.session)
  const theme = useAdminStore((state) => state.theme)

  return (
    <div className="kd-admin relative min-h-dvh" data-theme={theme}>
      {session ? <AdminConsole session={session} /> : <AdminLogin />}
    </div>
  )
}

/* ---------------------------------------------------------------- sign in */

function AdminLogin() {
  const signIn = useAdminStore((state) => state.signIn)
  const [pin, setPin] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const device = (event: FormEvent) => {
    event.preventDefault()
    if (pin === ADMIN_PIN) signIn({ source: 'device' })
    else setError('PIN noto‘g‘ri. Qaytadan kiriting.')
  }

  const cloud = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { getSupabase } = await import('@/services/supabase/client')
      const supabase = getSupabase()
      if (!supabase) throw new Error('Supabase sozlanmagan.')
      const { error: failure } = await supabase.auth.signInWithPassword({ email, password })
      if (failure) throw new Error('E-pochta yoki parol noto‘g‘ri.')
      const { data: isAdmin } = await supabase.rpc('is_admin')
      if (!isAdmin) {
        await supabase.auth.signOut()
        throw new Error('Bu hisob administrator emas. Uni admins jadvaliga qo‘shing.')
      }
      signIn({ source: 'cloud', email })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'h-11 rounded-lg border border-[var(--a-line)] bg-[var(--a-raise)] px-3 text-[var(--a-ink)] outline-none focus:border-[var(--a-accent)]'

  return (
    <>
      <AdminBackground pulseKey={0} />
      <main className="relative flex min-h-dvh items-center justify-center p-4">
        <div className="kd-panel flex w-full max-w-md flex-col gap-6 p-7">
          <div className="flex items-center gap-4">
            <NaviFigure className="size-16" />
            <div>
              <h1 className="font-display text-2xl font-semibold">Kiddo boshqaruvi</h1>
              <p className="text-sm text-[var(--a-ink-soft)]">
                Faqat ilova egasi va administratorlar uchun
              </p>
            </div>
          </div>

          {isSupabaseConfigured && (
            <form onSubmit={cloud} className="flex flex-col gap-3">
              <h2 className="font-display font-semibold">Barcha oilalar (Supabase)</h2>
              <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
                E-pochta
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={input}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
                Parol
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={input}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="h-11 rounded-full bg-[var(--a-accent)] font-bold text-[var(--a-accent-ink)] disabled:opacity-50"
              >
                {busy ? 'Kirilmoqda…' : 'Kirish'}
              </button>
            </form>
          )}

          <form onSubmit={device} className="flex flex-col gap-3">
            <h2 className="font-display font-semibold">Shu qurilma</h2>
            <p className="text-sm text-[var(--a-ink-soft)]">
              Shu brauzerdagi bolalar, obuna va to‘lovlar. Boshqa oynada ochilgan ilovadagi to‘lov
              va o‘yinlar ham jonli ko‘rinadi.
            </p>
            <label className="flex flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
              Admin PIN
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value)
                  setError(null)
                }}
                className={clsx(input, 'kd-num tracking-[0.3em]')}
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-full border border-[var(--a-accent)] font-bold text-[var(--a-accent)]"
            >
              Ochish
            </button>
          </form>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-[var(--a-coral-soft)] px-3 py-2 text-sm font-bold text-[var(--a-coral)]"
            >
              {error}
            </p>
          )}
        </div>
      </main>
    </>
  )
}

/* ---------------------------------------------------------------- console */

function useNaviNotes(data: AdminData) {
  const [notes, setNotes] = useState<MascotNote[]>([])
  const [excited, setExcited] = useState(false)
  const [pulse, setPulse] = useState(0)
  const greeted = useRef(false)
  const seenPayment = useRef<string | null>(null)
  const seenOnline = useRef<Set<string>>(new Set())

  const add = (kind: MascotNote['kind'], text: string) =>
    setNotes((current) =>
      [
        { id: `${Date.now()}-${Math.random()}`, kind, text, at: new Date().toISOString() },
        ...current,
      ].slice(0, 20),
    )

  // A morning summary once the data is there.
  useEffect(() => {
    if (greeted.current || data.loading) return
    greeted.current = true
    const today = revenueTotals(data.payments).today
    add(
      'info',
      today.count > 0
        ? `Bugun ${today.count} kishi PRO sotib oldi – ${formatSom(today.amount)} so‘m.`
        : 'Bugun hali PRO sotib olinmadi. Yangi to‘lov bo‘lsa, darhol yozaman.',
    )
  }, [data.loading, data.payments])

  // A payment arriving while the panel is open.
  useEffect(() => {
    const payment: Payment | null = data.livePayment
    if (!payment || payment.id === seenPayment.current) return
    seenPayment.current = payment.id
    const today = revenueTotals(data.payments).today
    // The list may not have the new payment yet (it arrives a moment later from the other tab).
    const counted = data.payments.some((item) => item.id === payment.id)
    today.count += counted ? 0 : 1
    add(
      'payment',
      `Yangi to‘lov! ${payment.family || 'Bir oila'} ${PLAN_NAMES[payment.plan] ?? ''} PRO oldi: ${formatSom(payment.amount)} so‘m. Bugun jami ${today.count} ta.`,
    )
    setPulse((value) => value + 1)
    setExcited(true)
    const timer = setTimeout(() => setExcited(false), 6000)
    return () => clearTimeout(timer)
  }, [data.livePayment, data.payments])

  // Someone starts playing.
  const onlineKey = data.children
    .filter((child) => child.online)
    .map((child) => child.id)
    .join(',')
  useEffect(() => {
    const now = new Set(onlineKey ? onlineKey.split(',') : [])
    data.children
      .filter((child) => now.has(child.id) && !seenOnline.current.has(child.id))
      .forEach((child) => add('online', `${child.name} hozir o‘ynashni boshladi.`))
    seenOnline.current = now
    // children change every render; the online set is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineKey])

  return { notes, excited, pulse }
}

function AdminConsole({ session }: { session: AdminSession }) {
  const navigate = useNavigate()
  const data = useAdminData(session.source)
  const [section, setSection] = useState<Section>('overview')
  const theme = useAdminStore((state) => state.theme)
  const toggleTheme = useAdminStore((state) => state.toggleTheme)
  const signOut = useAdminStore((state) => state.signOut)
  const { notes, excited, pulse } = useNaviNotes(data)
  const online = data.children.filter((child) => child.online).length
  const title = SECTIONS.find((item) => item.id === section)?.label ?? ''

  const leave = async () => {
    if (session.source === 'cloud') {
      const { getSupabase } = await import('@/services/supabase/client')
      await getSupabase()?.auth.signOut()
    }
    signOut()
    navigate('/admin', { replace: true })
  }

  return (
    <>
      <AdminBackground pulseKey={pulse} />
      <div className="relative flex min-h-dvh flex-col lg:flex-row">
        <nav
          aria-label="Bo‘limlar"
          className="kd-panel m-3 flex shrink-0 flex-col gap-1 p-3 lg:sticky lg:top-3 lg:h-[calc(100dvh-1.5rem)] lg:w-60"
        >
          <div className="mb-3 flex items-center gap-3 px-2 pt-1">
            <KiddoMark size={36} />
            <div className="leading-tight">
              <p className="font-display font-semibold">Kiddo</p>
              <p className="text-xs text-[var(--a-ink-soft)]">Boshqaruv paneli</p>
            </div>
          </div>
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={section === item.id ? 'page' : undefined}
                  className={clsx(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-colors',
                    section === item.id
                      ? 'bg-[var(--a-accent-soft)] text-[var(--a-accent)]'
                      : 'text-[var(--a-ink-soft)] hover:bg-[var(--a-raise)] hover:text-[var(--a-ink)]',
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-auto hidden flex-col gap-2 pt-4 lg:flex">
            <p className="px-2 text-xs text-[var(--a-ink-faint)]">
              {session.source === 'cloud'
                ? `Barcha oilalar: ${session.email}`
                : 'Ma’lumot: shu qurilma'}
            </p>
          </div>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-4 p-3 pb-32 lg:p-6 lg:pb-32">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
            <span className="kd-panel inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold">
              <span
                className={
                  online > 0
                    ? 'kd-online'
                    : 'inline-block size-[9px] rounded-full bg-[var(--a-ink-faint)]'
                }
                aria-hidden="true"
              />
              {online} onlayn
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Yorug‘ rejimga o‘tish' : 'Qorong‘i rejimga o‘tish'}
                className="kd-panel flex h-10 items-center gap-2 px-3 text-sm font-bold"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  {theme === 'dark' ? (
                    <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m11.4 0 1.4 1.4M4.9 4.9l1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10" />
                  ) : (
                    <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10" />
                  )}
                </svg>
                {theme === 'dark' ? 'Yorug‘' : 'Qorong‘i'}
              </button>
              <button
                type="button"
                onClick={() => void leave()}
                className="kd-panel h-10 px-4 text-sm font-bold"
              >
                Chiqish
              </button>
            </div>
          </header>

          {data.error && (
            <p
              role="alert"
              className="rounded-lg bg-[var(--a-coral-soft)] px-4 py-3 text-sm font-bold text-[var(--a-coral)]"
            >
              Ma’lumot olinmadi: {data.error}. Supabase’da 0003_admin.sql migratsiyasi bajarilganini
              tekshiring.
              <button type="button" onClick={data.refresh} className="ml-3 underline">
                Qayta urinish
              </button>
            </p>
          )}

          {data.loading ? (
            <p className="text-[var(--a-ink-soft)]">Yuklanmoqda…</p>
          ) : (
            <>
              {section === 'overview' && <Overview data={data} />}
              {section === 'children' && <ChildrenSection data={data} />}
              {section === 'payments' && <PaymentsSection data={data} />}
              {section === 'promo' && <PromoSection data={data} />}
              {section === 'settings' && (
                <SettingsSection key={JSON.stringify(data.settings)} data={data} />
              )}
            </>
          )}
        </main>
      </div>
      <AdminMascot notes={notes} excited={excited} />
    </>
  )
}
