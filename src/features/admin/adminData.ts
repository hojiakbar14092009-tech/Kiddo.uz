import { useCallback, useEffect, useMemo, useState } from 'react'
import { grantReward } from '@/domain/rewards'
import { useActivityStore } from '@/store/activityStore'
import { isSeasonSetting } from '@/features/seasons/seasons'
import {
  clampRestHours,
  DEFAULT_APP_SETTINGS,
  useAppSettingsStore,
  yearlyPrice,
  type AppSettings,
} from '@/store/appSettingsStore'
import { childAge, useFamilyStore } from '@/store/familyStore'
import {
  ADMIN_CHANNEL,
  usePaymentStore,
  type AdminMessage,
  type Payment,
} from '@/store/paymentStore'
import { useProgressStore } from '@/store/progressStore'
import { isProActive, useSubscriptionStore, type PlanId } from '@/store/subscriptionStore'
import type { RevenueItem } from './revenue'

/** A child as the admin sees it. */
export interface AdminChild {
  id: string
  name: string
  age: number | null
  /** The parent's e-mail (cloud) or “this device”. */
  family: string
  familyId: string
  pro: boolean
  proUntil: string | null
  coins: number
  /** ISO time of the last activity we know of. */
  lastSeen: string | null
  online: boolean
  /** The screen the child is on while online. */
  screen: string | null
}

export interface AdminActions {
  grantCoins: (child: AdminChild, amount: number) => Promise<void>
  grantPro: (child: AdminChild, days: number) => Promise<void>
  revokePro: (child: AdminChild) => Promise<void>
  saveSettings: (settings: AppSettings) => Promise<void>
}

export interface AdminData {
  source: 'device' | 'cloud'
  children: AdminChild[]
  /** The newest payments (in the cloud at most PAYMENTS_SHOWN). */
  payments: Payment[]
  /** True when there are more payments than the list holds. */
  paymentsLimited: boolean
  /** What the income figures and charts count: every payment, or per-day totals. */
  revenue: RevenueItem[]
  settings: AppSettings
  /** The newest payment that arrived while the panel was open (for live alerts). */
  livePayment: Payment | null
  loading: boolean
  error: string | null
  actions: AdminActions
  refresh: () => void
}

/** A child counts as online when it was heard from within this window. */
export const ONLINE_MS = 20_000
/** Cloud devices beat once a minute (PresenceBeacon), so the window is wider. */
export const CLOUD_ONLINE_MS = 120_000
/** How often the admin panel reads the cloud heartbeats. */
const CLOUD_PRESENCE_POLL_MS = 30_000
const DAY_MS = 86_400_000

interface Presence {
  at: number
  screen: string
  /** How long this beat counts as "online". */
  ttl: number
}

interface HeartbeatRow {
  child_id: string
  screen: string
  seen_at: string
}

/** Heartbeats seen within the cloud window (admins may read all of them, see 0005). */
export async function loadHeartbeats(now: number = Date.now()): Promise<Map<string, Presence>> {
  const { getAdminSupabase } = await import('@/services/supabase/client')
  const supabase = getAdminSupabase()
  const beats = new Map<string, Presence>()
  if (!supabase) return beats
  const { data, error } = await supabase
    .from('presence_heartbeats')
    .select('child_id, screen, seen_at')
    .gt('seen_at', new Date(now - CLOUD_ONLINE_MS).toISOString())
  if (error) return beats
  for (const row of (data ?? []) as HeartbeatRow[]) {
    beats.set(row.child_id, {
      at: Date.parse(row.seen_at),
      screen: row.screen,
      ttl: CLOUD_ONLINE_MS,
    })
  }
  return beats
}

/**
 * Children playing right now: from the browser channel (this device) and, for
 * the cloud panel, from the private `presence_heartbeats` table. Names never
 * travel with a heartbeat; the panel already has them from `children`.
 */
function usePresence(cloud: boolean): Map<string, Presence> {
  const [beats, setBeats] = useState<Map<string, Presence>>(new Map())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    const channel = new BroadcastChannel(ADMIN_CHANNEL)
    channel.onmessage = (event: MessageEvent<AdminMessage>) => {
      const message = event.data
      if (message.type === 'presence') {
        setBeats((current) =>
          new Map(current).set(message.childId, {
            at: message.at,
            screen: message.screen,
            ttl: ONLINE_MS,
          }),
        )
      } else if (message.type === 'leave') {
        setBeats((current) => {
          const next = new Map(current)
          next.delete(message.childId)
          return next
        })
      }
    }
    return () => channel.close()
  }, [])

  useEffect(() => {
    if (!cloud) return undefined
    let alive = true
    const poll = () =>
      void loadHeartbeats().then((cloudBeats) => {
        if (!alive) return
        setBeats((current) => {
          const next = new Map(current)
          cloudBeats.forEach((value, key) => {
            const known = next.get(key)
            if (!known || known.at < value.at) next.set(key, value)
          })
          return next
        })
      })
    poll()
    const timer = setInterval(poll, CLOUD_PRESENCE_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [cloud])

  return useMemo(() => {
    const live = new Map<string, Presence>()
    beats.forEach((value, key) => {
      if (now - value.at < value.ttl) live.set(key, value)
    })
    return live
  }, [beats, now])
}

/** Live payments from other tabs on this device (the parent paying in another window). */
function useDeviceLivePayment(): Payment | null {
  const [live, setLive] = useState<Payment | null>(null)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'kiddo.payments') void usePaymentStore.persist.rehydrate()
      if (event.key?.startsWith('kiddo.')) {
        void useFamilyStore.persist.rehydrate()
        void useProgressStore.persist.rehydrate()
        void useSubscriptionStore.persist.rehydrate()
      }
    }
    window.addEventListener('storage', onStorage)
    if (typeof BroadcastChannel === 'undefined')
      return () => window.removeEventListener('storage', onStorage)
    const channel = new BroadcastChannel(ADMIN_CHANNEL)
    channel.onmessage = (event: MessageEvent<AdminMessage>) => {
      if (event.data.type === 'payment') setLive(event.data.payment)
    }
    return () => {
      window.removeEventListener('storage', onStorage)
      channel.close()
    }
  }, [])
  return live
}

/** Everything on this device: its children, its PRO and its payments. */
function useDeviceData(): AdminData {
  const children = useFamilyStore((state) => state.children)
  const byChild = useProgressStore((state) => state.byChild)
  const subscription = useSubscriptionStore()
  const payments = usePaymentStore((state) => state.payments)
  const events = useActivityStore((state) => state.events)
  const settingsState = useAppSettingsStore()
  const presence = usePresence(false)
  const livePayment = useDeviceLivePayment()
  const pro = isProActive(subscription)

  const list = children.map((child): AdminChild => {
    const results = byChild[child.id]?.results ?? []
    const lastEvent = [...events].reverse().find((event) => event.childId === child.id)
    const lastResult = results[0]?.finishedAt ?? null
    const seen = [lastEvent?.at ?? null, lastResult]
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1)
    const live = presence.get(child.id)
    return {
      id: child.id,
      name: child.name,
      age: childAge(child),
      family: 'Shu qurilma',
      familyId: 'device',
      pro,
      proUntil: pro ? subscription.expiresAt : null,
      coins: byChild[child.id]?.coins ?? 0,
      lastSeen: live ? new Date(live.at).toISOString() : (seen ?? null),
      online: Boolean(live),
      screen: live?.screen ?? null,
    }
  })

  const actions: AdminActions = {
    // Through the ledger like every other coin, once per press.
    grantCoins: async (child, amount) => {
      grantReward({
        childKey: child.id,
        coins: amount,
        reason: 'admin',
        refId: crypto.randomUUID(),
      })
    },
    grantPro: async (_child, days) => useSubscriptionStore.getState().grantDays(days, 'admin'),
    revokePro: async () => useSubscriptionStore.getState().cancel(),
    saveSettings: async (settings) => useAppSettingsStore.getState().update(settings),
  }

  return {
    source: 'device',
    children: list,
    payments,
    paymentsLimited: false,
    revenue: payments,
    settings: {
      prices: settingsState.prices,
      proGiftCoins: settingsState.proGiftCoins,
      restHours: clampRestHours(settingsState.restHours),
      season: isSeasonSetting(settingsState.season) ? settingsState.season : 'auto',
    },
    livePayment,
    loading: false,
    error: null,
    actions,
    refresh: () => undefined,
  }
}

interface CloudRows {
  children: {
    id: string
    name: string
    age: number | null
    parent_id: string
    updated_at: string
  }[]
  states: { child_id: string; coins: number; updated_at: string }[]
  subscriptions: { parent_id: string; plan: PlanId; expires_at: string | null }[]
  payments: {
    id: string
    family: string
    plan: PlanId
    provider: string
    amount: number
    created_at: string
    parent_id: string
  }[]
  /** False when the server has no admin_revenue_days yet: income from `payments`. */
  serverRevenue: boolean
  /** Payments that arrived after the load (counted on top of revenueDays). */
  livePayments: CloudRows['payments']
  /** Income per Tashkent day from the server (admin_revenue_days, Phase 53). */
  revenueDays: { day: string; payments: number; amount: number }[]
  settings: AppSettings
  /** When the rows were fetched; PRO is judged against this time. */
  loadedAt: number
}

/** The newest payments the cloud list shows (one server page). */
export const PAYMENTS_SHOWN = 1000
/** Days of income the charts can show (a year and a month, so the year-to-date fits). */
const REVENUE_DAYS = 400
/** A table read in pages stops here (far above any real family count): an error, never half. */
export const MAX_ROWS = 200_000

interface Page<T> {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Every row of a read, page by page (Phase 53). The server answers at most a
 * page of rows (1000 on Supabase) to one request; a single request would
 * silently show only the first page. Pages follow the key (`after` = the last
 * key read), so a row added or removed meanwhile never shifts the others, and
 * any page size the server uses works. Past MAX_ROWS the read fails rather
 * than show part of the table as all of it.
 */
export async function fetchAllRows<T>(
  page: (after: string | null) => PromiseLike<Page<T>>,
  keyOf: (row: T) => string,
): Promise<T[]> {
  const rows: T[] = []
  let after: string | null = null
  for (;;) {
    const { data, error } = await page(after)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) return rows
    rows.push(...data)
    if (rows.length > MAX_ROWS) throw new Error(`Jadvalda ${MAX_ROWS} dan ortiq qator bor`)
    after = keyOf(data[data.length - 1]!)
  }
}

/**
 * A day's income as one revenue item, at noon in Tashkent (the same date
 * anywhere near), or now if today is not yet at noon, so that this morning's
 * sales count as today's.
 */
export function revenueOfDay(
  row: { day: string; payments: number; amount: number },
  now: number = Date.now(),
): RevenueItem {
  const noon = Date.parse(`${row.day}T12:00:00+05:00`)
  const at = noon > now ? new Date(now).toISOString() : `${row.day}T12:00:00+05:00`
  return { at, amount: row.amount, count: row.payments }
}

const PAGE_ROWS = 1000

/** Every family, from Supabase (needs an admin account, see supabase/migrations/0003_admin.sql). */
function useCloudData(enabled: boolean): AdminData {
  const [rows, setRows] = useState<CloudRows | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [livePayment, setLivePayment] = useState<Payment | null>(null)
  const [version, setVersion] = useState(0)
  const presence = usePresence(enabled)

  const load = useCallback(async () => {
    const { getAdminSupabase } = await import('@/services/supabase/client')
    const supabase = getAdminSupabase()
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const [children, states, subscriptions, payments, revenueDays, settings] = await Promise.all([
      fetchAllRows<CloudRows['children'][number]>(
        (after) => {
          const query = supabase
            .from('children')
            .select('id, name, age, parent_id, updated_at')
            .order('id')
            .limit(PAGE_ROWS)
          return after === null ? query : query.gt('id', after)
        },
        (row) => row.id,
      ),
      fetchAllRows<CloudRows['states'][number]>(
        (after) => {
          const query = supabase
            .from('child_state')
            .select('child_id, coins, updated_at')
            .order('child_id')
            .limit(PAGE_ROWS)
          return after === null ? query : query.gt('child_id', after)
        },
        (row) => row.child_id,
      ),
      fetchAllRows<CloudRows['subscriptions'][number]>(
        (after) => {
          const query = supabase
            .from('subscriptions')
            .select('parent_id, plan, expires_at')
            .order('parent_id')
            .limit(PAGE_ROWS)
          return after === null ? query : query.gt('parent_id', after)
        },
        (row) => row.parent_id,
      ),
      supabase
        .from('payments')
        .select('id, family, plan, provider, amount, created_at, parent_id')
        .order('created_at', { ascending: false })
        .limit(PAYMENTS_SHOWN),
      supabase.rpc('admin_revenue_days', { p_days: REVENUE_DAYS }),
      supabase.from('app_settings').select('key, value'),
    ])
    const failed = [payments, settings].find((result) => result.error)
    if (failed?.error) throw new Error(failed.error.message)
    // a server without 0021 yet (the app is live before the owner applies it): income is
    // counted from the newest payments, as before Phase 53
    const serverRevenue = !revenueDays.error
    const stored = Object.fromEntries((settings.data ?? []).map((row) => [row.key, row.value]))
    return {
      children,
      states,
      subscriptions,
      payments: payments.data ?? [],
      serverRevenue,
      revenueDays: ((revenueDays.data ?? []) as CloudRows['revenueDays']).map((row) => ({
        day: String(row.day),
        payments: Number(row.payments),
        amount: Number(row.amount),
      })),
      settings: {
        restHours: clampRestHours((stored as Partial<AppSettings>).restHours),
        season: isSeasonSetting((stored as Partial<AppSettings>).season)
          ? (stored as AppSettings).season
          : 'auto',
        proGiftCoins:
          (stored as Partial<AppSettings>).proGiftCoins ?? DEFAULT_APP_SETTINGS.proGiftCoins,
        prices: {
          monthly:
            (stored as Partial<AppSettings>).prices?.monthly ?? DEFAULT_APP_SETTINGS.prices.monthly,
          yearly: yearlyPrice(
            (stored as Partial<AppSettings>).prices?.monthly ?? DEFAULT_APP_SETTINGS.prices.monthly,
          ),
        },
      },
      livePayments: [],
      loadedAt: Date.now(),
    } as CloudRows
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    load()
      .then((data) => alive && (setRows(data), setError(null)))
      .catch((reason: unknown) => alive && setError(String((reason as Error).message ?? reason)))
    return () => {
      alive = false
    }
  }, [enabled, load, version])

  // New payments arrive live.
  useEffect(() => {
    if (!enabled) return undefined
    let remove = () => undefined as void
    void import('@/services/supabase/client').then(({ getAdminSupabase }) => {
      const supabase = getAdminSupabase()
      if (!supabase) return
      const channel = supabase
        .channel('admin-payments')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'payments' },
          (change) => {
            const row = change.new as CloudRows['payments'][number]
            const payment: Payment = {
              id: row.id,
              plan: row.plan,
              provider: row.provider,
              amount: row.amount,
              family: row.family,
              at: row.created_at,
            }
            setLivePayment(payment)
            setRows((current) =>
              // already read with the panel (it arrived while the panel loaded): counted once
              current && !current.payments.some((item) => item.id === row.id)
                ? {
                    ...current,
                    payments: [row, ...current.payments],
                    livePayments: [...current.livePayments, row],
                  }
                : current,
            )
          },
        )
        .subscribe()
      remove = () => void supabase.removeChannel(channel)
    })
    return () => remove()
  }, [enabled])

  const now = rows?.loadedAt ?? 0
  const subs = new Map(rows?.subscriptions.map((sub) => [sub.parent_id, sub]))
  const coins = new Map(rows?.states.map((state) => [state.child_id, state]))
  const emails = new Map<string, string>()
  rows?.payments.forEach((payment) => {
    if (payment.family && !emails.has(payment.parent_id))
      emails.set(payment.parent_id, payment.family)
  })

  const children = (rows?.children ?? []).map((child): AdminChild => {
    const sub = subs.get(child.parent_id)
    const pro = Boolean(sub && (!sub.expires_at || Date.parse(sub.expires_at) > now))
    const live = presence.get(child.id)
    const state = coins.get(child.id)
    return {
      id: child.id,
      name: child.name,
      age: child.age,
      family: emails.get(child.parent_id) ?? child.parent_id.slice(0, 8),
      familyId: child.parent_id,
      pro,
      proUntil: pro ? (sub?.expires_at ?? null) : null,
      coins: state?.coins ?? 0,
      lastSeen: live ? new Date(live.at).toISOString() : (state?.updated_at ?? child.updated_at),
      online: Boolean(live),
      screen: live?.screen ?? null,
    }
  })

  const supabaseCall = async (
    work: (
      client: NonNullable<ReturnType<typeof import('@/services/supabase/client').getAdminSupabase>>,
    ) => PromiseLike<{ error: { message: string } | null }>,
  ) => {
    const { getAdminSupabase } = await import('@/services/supabase/client')
    const supabase = getAdminSupabase()
    if (!supabase) throw new Error('Supabase sozlanmagan')
    const { error: failure } = await work(supabase)
    setVersion((current) => current + 1)
    if (failure) {
      setError(failure.message)
      // the screen must not say "saved" for something the server refused
      throw new Error(failure.message)
    }
  }

  const actions: AdminActions = {
    grantCoins: async (child, amount) => {
      // The balance is the ledger (0009): an admin grant is one ledger row, which
      // only an admin account may write (reason 'admin'); the stored balance follows.
      await supabaseCall((client) =>
        client.rpc('record_reward', {
          p_child: child.id,
          p_coins: amount,
          p_reason: 'admin',
          p_ref: crypto.randomUUID(),
        }),
      )
    },
    grantPro: (child, days) => {
      const base = child.proUntil ? Math.max(Date.parse(child.proUntil), now) : now
      return supabaseCall((client) =>
        client.from('subscriptions').upsert(
          {
            parent_id: child.familyId,
            plan: 'monthly',
            source: 'admin',
            expires_at: new Date(base + days * DAY_MS).toISOString(),
          },
          { onConflict: 'parent_id' },
        ),
      )
    },
    revokePro: (child) =>
      supabaseCall((client) =>
        client.from('subscriptions').delete().eq('parent_id', child.familyId),
      ),
    saveSettings: (settings) =>
      supabaseCall((client) =>
        client.from('app_settings').upsert(
          [
            {
              key: 'prices',
              value: {
                monthly: settings.prices.monthly,
                yearly: yearlyPrice(settings.prices.monthly),
              },
            },
            { key: 'proGiftCoins', value: settings.proGiftCoins },
            { key: 'restHours', value: clampRestHours(settings.restHours) },
            { key: 'season', value: settings.season },
          ],
          { onConflict: 'key' },
        ),
      ),
  }

  return {
    source: 'cloud',
    children,
    payments: (rows?.payments ?? []).map((row) => ({
      id: row.id,
      plan: row.plan,
      provider: row.provider,
      amount: row.amount,
      family: row.family,
      at: row.created_at,
    })),
    paymentsLimited:
      (rows?.payments.length ?? 0) - (rows?.livePayments.length ?? 0) >= PAYMENTS_SHOWN,
    revenue:
      rows && !rows.serverRevenue
        ? rows.payments.map((row) => ({ at: row.created_at, amount: row.amount }))
        : [
            ...(rows?.revenueDays ?? []).map((row) => revenueOfDay(row)),
            ...(rows?.livePayments ?? []).map((row) => ({
              at: row.created_at,
              amount: row.amount,
            })),
          ],
    settings: rows?.settings ?? DEFAULT_APP_SETTINGS,
    livePayment,
    loading: enabled && rows === null && error === null,
    error,
    actions,
    refresh: () => setVersion((current) => current + 1),
  }
}

/** The admin panel's data: this device, or every family through Supabase. */
export function useAdminData(source: 'device' | 'cloud'): AdminData {
  const device = useDeviceData()
  const cloud = useCloudData(source === 'cloud')
  return source === 'cloud' ? cloud : device
}
