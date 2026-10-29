import { DEMO } from '@/config/demo'
import { lookupDemoPromo } from '@/config/demoPromoCodes'
import { useAdsStore } from '@/store/adsStore'
import { useParentStore } from '@/store/parentStore'
import { usePromoStore } from '@/store/promoStore'
import { normalizePromo, useSubscriptionStore, type PromoResult } from '@/store/subscriptionStore'
import { loadAdVideo } from './adBlobs'
import { unseal } from './vault'

/** An ad ready to play. Call `release` when done (frees a device video's memory). */
export interface PlayableAd {
  id: string
  title: string
  duration: number
  src: string
  release: () => void
}

export interface ClaimedPromo {
  code: string
  days: number
}

export type ClaimFailure = 'already' | 'notFinished' | 'noCodes' | 'emailNotConfirmed' | 'error'
export type ClaimOutcome = { ok: true; promo: ClaimedPromo } | { ok: false; reason: ClaimFailure }
export type RedeemOutcome = PromoResult | 'error'

/**
 * Where promo codes and ads come from: the family's Supabase account (codes
 * stay on the server; the server times the ad view) or, without an account,
 * this device (codes sealed, see vault.ts).
 */
export interface PromoBackend {
  kind: 'device' | 'cloud'
  /** The code this family already got, if any. */
  currentClaim: () => Promise<ClaimedPromo | null>
  /** An active ad to show, or null when the admin has not put one up yet. */
  nextAd: () => Promise<PlayableAd | null>
  /** Starts a timed view; returns a token for `claim`. */
  startView: (ad: PlayableAd) => Promise<string>
  /** After the whole ad: the family's one code. */
  claim: (token: string, ad: PlayableAd) => Promise<ClaimOutcome>
  redeem: (code: string) => Promise<RedeemOutcome>
}

const pick = <T>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)]

/* ------------------------------------------------------------------ device */

const deviceViews = new Map<string, { adId: string; startedAt: number }>()

export const deviceBackend: PromoBackend = {
  kind: 'device',

  currentClaim: async () => {
    const claim = usePromoStore.getState().claim
    return claim ? { code: unseal(claim), days: claim.days } : null
  },

  nextAd: async () => {
    const ad = pick(useAdsStore.getState().ads.filter((item) => item.active))
    if (!ad) return null
    if (ad.url) {
      return { id: ad.id, title: ad.title, duration: ad.duration, src: ad.url, release: () => {} }
    }
    const blob = await loadAdVideo(ad.id).catch(() => undefined)
    if (!blob) return null
    const src = URL.createObjectURL(blob)
    return {
      id: ad.id,
      title: ad.title,
      duration: ad.duration,
      src,
      release: () => URL.revokeObjectURL(src),
    }
  },

  startView: async (ad) => {
    const token = crypto.randomUUID()
    deviceViews.set(token, { adId: ad.id, startedAt: Date.now() })
    useAdsStore.getState().countView(ad.id, false)
    return token
  },

  claim: async (token, ad) => {
    const promo = usePromoStore.getState()
    if (promo.claim) return { ok: false, reason: 'already' }
    const view = deviceViews.get(token)
    if (!view || view.adId !== ad.id) return { ok: false, reason: 'error' }
    if (Date.now() - view.startedAt < Math.max(ad.duration - 2, 1) * 1000) {
      return { ok: false, reason: 'notFinished' }
    }
    deviceViews.delete(token)
    const code = pick(promo.codes.filter((c) => c.active && !promo.redeemed.includes(c.hash)))
    if (!code) return { ok: false, reason: 'noCodes' }
    useAdsStore.getState().countView(ad.id, true)
    promo.setClaim({
      hash: code.hash,
      sealed: code.sealed,
      nonce: code.nonce,
      days: code.days,
      at: new Date().toISOString(),
    })
    return { ok: true, promo: { code: unseal(code), days: code.days } }
  },

  redeem: async (code) => {
    // the demo build also takes its ten public demo codes (config/demoPromoCodes.ts)
    if (DEMO.demoMode) {
      const demo = lookupDemoPromo(code)
      if (demo === 'expired') return 'expired'
      if (demo) return useSubscriptionStore.getState().redeemPromo(code, demo.days)
    }
    const found = await usePromoStore.getState().lookup(code)
    const result = useSubscriptionStore.getState().redeemPromo(code, found?.days ?? null)
    if (result === 'ok' && found) usePromoStore.getState().markRedeemed(found.hash)
    return result
  },
}

/* ------------------------------------------------------------------- cloud */

async function supabase() {
  const { getSupabase } = await import('@/services/supabase/client')
  const client = getSupabase()
  if (!client) throw new Error('Supabase is not configured')
  return client
}

type ServerRedeem = { ok: true; expiresAt: string } | { ok: false; result: RedeemOutcome }

const REDEEM_ERRORS: Record<string, RedeemOutcome> = {
  invalid: 'invalid',
  used: 'used',
  lifetime: 'lifetime',
  // Too many wrong codes in 10 minutes (0005): shown like any other failure.
  rate_limited: 'error',
}

/**
 * Redeems through `redeem_promo_code` (0005: rate-limited, failures are
 * counted), or through the older `redeem_promo` when the server does not
 * have 0005 yet.
 */
async function redeemOnServer(
  client: Awaited<ReturnType<typeof supabase>>,
  key: string,
): Promise<ServerRedeem> {
  const { data, error } = await client.rpc('redeem_promo_code', { p_code: key })
  if (!error) {
    const row = data as { ok: boolean; expires_at?: string; error?: string } | null
    if (row?.ok && row.expires_at) return { ok: true, expiresAt: String(row.expires_at) }
    return { ok: false, result: REDEEM_ERRORS[row?.error ?? ''] ?? 'error' }
  }
  // PGRST202: no such function in the schema cache – a server without 0005.
  if (error.code !== 'PGRST202') return { ok: false, result: 'error' }
  const legacy = await client.rpc('redeem_promo', { p_code: key })
  if (legacy.error) {
    const { message } = legacy.error
    const name = Object.keys(REDEEM_ERRORS).find((item) => message.includes(item))
    return { ok: false, result: name ? REDEEM_ERRORS[name]! : 'error' }
  }
  return { ok: true, expiresAt: String(legacy.data) }
}

const FAILURES: Record<string, ClaimFailure> = {
  already_claimed: 'already',
  not_finished: 'notFinished',
  no_codes: 'noCodes',
  // a promo code needs a confirmed e-mail address (0010: no farming with throwaway accounts)
  email_not_confirmed: 'emailNotConfirmed',
}

export const cloudBackend: PromoBackend = {
  kind: 'cloud',

  currentClaim: async () => {
    const client = await supabase()
    const { data } = await client.rpc('my_promo_claim')
    const row = (data as { code: string; days: number }[] | null)?.[0]
    return row ? { code: row.code, days: row.days } : null
  },

  nextAd: async () => {
    const client = await supabase()
    const { data, error } = await client
      .from('ads')
      .select('id, title, video_url, duration_s')
      .eq('active', true)
    if (error) throw new Error(error.message)
    const ad = pick(data ?? [])
    if (!ad) return null
    return {
      id: String(ad.id),
      title: String(ad.title),
      duration: Number(ad.duration_s),
      src: String(ad.video_url),
      release: () => {},
    }
  },

  startView: async (ad) => {
    const client = await supabase()
    const { data, error } = await client.rpc('start_ad_view', { p_ad: ad.id })
    if (error) throw new Error(error.message)
    return String(data)
  },

  claim: async (token) => {
    const client = await supabase()
    const { data, error } = await client.rpc('claim_promo', { p_view: token })
    if (error) {
      const key = Object.keys(FAILURES).find((name) => error.message.includes(name))
      return { ok: false, reason: key ? FAILURES[key]! : 'error' }
    }
    const row = (data as { code: string; days: number }[] | null)?.[0]
    return row
      ? { ok: true, promo: { code: row.code, days: row.days } }
      : { ok: false, reason: 'error' }
  },

  redeem: async (code) => {
    const client = await supabase()
    const key = normalizePromo(code)
    const outcome = await redeemOnServer(client, key)
    if (outcome.ok === false) return outcome.result
    useSubscriptionStore.setState((state) => ({
      plan: state.plan && state.source !== 'demo' ? state.plan : 'monthly',
      source: 'promo',
      expiresAt: outcome.expiresAt,
      usedPromoCodes: [...state.usedPromoCodes, key],
    }))
    return 'ok'
  },
}

/** The family's backend: its Supabase account when signed in, otherwise this device. */
export function promoBackend(): PromoBackend {
  return useParentStore.getState().session?.mode === 'cloud' ? cloudBackend : deviceBackend
}
