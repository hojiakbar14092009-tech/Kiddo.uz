import { useCallback, useEffect, useState } from 'react'
import { deleteAdVideo, loadAdVideo, saveAdVideo, videoDuration } from '@/features/promo/adBlobs'
import { unseal } from '@/features/promo/vault'
import { useAdsStore } from '@/store/adsStore'
import { usePromoStore } from '@/store/promoStore'

export interface AdminPromoCode {
  code: string
  days: number
  active: boolean
  /** How many families got this code from an ad. */
  claims: number
  /** Families that used it (claimed or redeemed; 0019 `admin_promo_usage`). */
  used: number
  /** At most this many families (null: no limit). */
  maxUses: number | null
  /** Works until this moment (ISO; null: no end). */
  expiresAt: string | null
  note: string | null
}

/** Limits of a code (Phase 45; enforced by the server, so a cloud admin only). */
export interface CodeLimits {
  maxUses: number | null
  expiresAt: string | null
  note: string | null
}

export const NO_LIMITS: CodeLimits = { maxUses: null, expiresAt: null, note: null }

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * `count` new codes `PREFIX` + random letters (no 0/O, 1/I), distinct from `taken` and from
 * each other; each 3–20 characters as the server requires.
 */
export function bulkCodes(
  prefix: string,
  count: number,
  taken: ReadonlySet<string> = new Set(),
  random: () => number = Math.random,
): string[] {
  const head = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
  const length = Math.max(4, Math.min(8, 20 - head.length))
  const made = new Set<string>()
  let tries = 0
  while (made.size < Math.min(200, Math.max(0, count)) && tries < 10_000) {
    tries += 1
    let tail = ''
    for (let i = 0; i < length; i += 1) {
      tail += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
    }
    const code = head + tail
    if (CODE_PATTERN.test(code) && !taken.has(code)) made.add(code)
  }
  return [...made]
}

export interface AdminAd {
  id: string
  title: string
  /** Shown only inside this time (ISO; null bounds are open; cloud). */
  startsAt: string | null
  endsAt: string | null
  duration: number
  /** Link to the video, or null for a video stored on this device. */
  url: string | null
  active: boolean
  views: number
  completions: number
  createdAt: string
}

export interface NewAd {
  title: string
  file?: File
  url?: string
}

/** Promo codes and ads for the admin panel, on this device or in Supabase. */
export interface AdminPromo {
  codes: AdminPromoCode[]
  ads: AdminAd[]
  loading: boolean
  error: string | null
  addCode: (code: string, days: number, limits?: CodeLimits) => Promise<void>
  /** Many codes at once with the same days and limits (cloud). */
  addCodes: (codes: string[], days: number, limits?: CodeLimits) => Promise<void>
  removeCode: (code: string) => Promise<void>
  setCodeActive: (code: string, active: boolean) => Promise<void>
  setCodeLimits: (code: string, limits: CodeLimits) => Promise<void>
  /** Limits, expiry and schedules are kept by the server: only a cloud admin has them. */
  limitsSupported: boolean
  addAd: (ad: NewAd) => Promise<void>
  removeAd: (ad: AdminAd) => Promise<void>
  setAdActive: (ad: AdminAd, active: boolean) => Promise<void>
  setAdSchedule: (ad: AdminAd, startsAt: string | null, endsAt: string | null) => Promise<void>
  /** A playable source for the admin's preview. */
  previewSrc: (ad: AdminAd) => Promise<string | null>
}

export const CODE_PATTERN = /^[A-Z0-9]{3,20}$/
const MAX_AD_SECONDS = 600
/** The server refuses shorter ads (0010: a one-second ad was a free promo code); cloud only. */
export const MIN_AD_SECONDS = 15

async function durationOf(source: NewAd): Promise<number> {
  const src = source.file ? URL.createObjectURL(source.file) : source.url!
  try {
    const seconds = await videoDuration(src)
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('duration')
    if (seconds > MAX_AD_SECONDS) throw new Error('Reklama 10 daqiqadan uzun bo‘lmasin')
    return Math.round(seconds * 10) / 10
  } finally {
    if (source.file) URL.revokeObjectURL(src)
  }
}

/* ------------------------------------------------------------------ device */

function useDevicePromo(): AdminPromo {
  const codes = usePromoStore((state) => state.codes)
  const claim = usePromoStore((state) => state.claim)
  const ads = useAdsStore((state) => state.ads)
  return {
    codes: codes.map((item) => ({
      code: unseal(item),
      days: item.days,
      active: item.active,
      claims: claim?.hash === item.hash ? 1 : 0,
      used: claim?.hash === item.hash ? 1 : 0,
      ...NO_LIMITS,
    })),
    ads: ads.map((ad) => ({ ...ad, startsAt: null, endsAt: null })),
    limitsSupported: false,
    loading: false,
    error: null,
    addCode: (code, days) => usePromoStore.getState().addCode(code, days),
    addCodes: async (codes, days) => {
      for (const code of codes) await usePromoStore.getState().addCode(code, days)
    },
    setCodeLimits: async () => {
      throw new Error('Cheklov va muddat faqat bulutli admin uchun (server tekshiradi).')
    },
    setAdSchedule: async () => {
      throw new Error('Jadval faqat bulutli admin uchun (server tekshiradi).')
    },
    removeCode: async (code) => {
      const found = usePromoStore.getState().codes.find((item) => unseal(item) === code)
      if (found) usePromoStore.getState().removeCode(found.hash)
    },
    setCodeActive: async (code, active) => {
      const found = usePromoStore.getState().codes.find((item) => unseal(item) === code)
      if (found) usePromoStore.getState().setActive(found.hash, active)
    },
    addAd: async (ad) => {
      const duration = await durationOf(ad)
      const id = crypto.randomUUID()
      if (ad.file) await saveAdVideo(id, ad.file)
      useAdsStore.getState().add({
        id,
        title: ad.title.trim(),
        duration,
        url: ad.file ? null : (ad.url ?? null),
        active: true,
        createdAt: new Date().toISOString(),
        views: 0,
        completions: 0,
      })
    },
    removeAd: async (ad) => {
      useAdsStore.getState().remove(ad.id)
      if (!ad.url) await deleteAdVideo(ad.id).catch(() => undefined)
    },
    setAdActive: async (ad, active) => useAdsStore.getState().setActive(ad.id, active),
    previewSrc: async (ad) => {
      if (ad.url) return ad.url
      const blob = await loadAdVideo(ad.id).catch(() => undefined)
      return blob ? URL.createObjectURL(blob) : null
    },
  }
}

/* ------------------------------------------------------------------- cloud */

/** A unique-key clash said in the admin's words (the code exists already). */
function duplicate(error: { message: string; code?: string } | null) {
  if (error && (error.code === '23505' || /duplicate key/i.test(error.message))) {
    return { message: 'Bu kod allaqachon bor. Uni ro‘yxatda o‘zgartiring yoki boshqa kod tanlang.' }
  }
  return error
}

function limitRow(limits: CodeLimits) {
  return {
    max_uses:
      limits.maxUses && limits.maxUses > 0 ? Math.min(100_000, Math.round(limits.maxUses)) : null,
    expires_at: limits.expiresAt,
    note: limits.note?.trim() ? limits.note.trim().slice(0, 80) : null,
  }
}

async function supabase() {
  const { getAdminSupabase } = await import('@/services/supabase/client')
  const client = getAdminSupabase()
  if (!client) throw new Error('Supabase sozlanmagan')
  return client
}

function useCloudPromo(enabled: boolean): AdminPromo {
  const [codes, setCodes] = useState<AdminPromoCode[]>([])
  const [ads, setAds] = useState<AdminAd[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    const client = await supabase()
    const [codeRows, claimRows, adRows, viewRows, usageRows] = await Promise.all([
      client
        .from('promo_codes')
        .select('code, days, active, max_uses, expires_at, note')
        .order('created_at'),
      client.from('promo_claims').select('code'),
      client
        .from('ads')
        .select('id, title, video_url, duration_s, active, created_at, starts_at, ends_at')
        .order('created_at', { ascending: false }),
      client.from('ad_views').select('ad_id, completed_at').limit(20000),
      client.rpc('admin_promo_usage'),
    ])
    const failed = [codeRows, claimRows, adRows, viewRows].find((result) => result.error)
    if (failed?.error) {
      // the columns of 0019 are missing: the owner has not applied it yet
      if (/max_uses|starts_at|column/i.test(failed.error.message))
        throw new Error(
          '0019 migratsiyasi qo‘llanmagan: Supabase’da 0019_admin.sql ni ishga tushiring.',
        )
      throw new Error(failed.error.message)
    }
    const used = new Map<string, number>()
    for (const row of (usageRows.data ?? []) as { code: string; used: number }[]) {
      used.set(row.code, Number(row.used))
    }
    const claims = new Map<string, number>()
    for (const row of claimRows.data ?? []) claims.set(row.code, (claims.get(row.code) ?? 0) + 1)
    const views = new Map<string, { views: number; completions: number }>()
    for (const row of viewRows.data ?? []) {
      const count = views.get(row.ad_id) ?? { views: 0, completions: 0 }
      count.views += 1
      if (row.completed_at) count.completions += 1
      views.set(row.ad_id, count)
    }
    return {
      codes: (codeRows.data ?? []).map((row) => ({
        code: String(row.code),
        days: Number(row.days),
        active: Boolean(row.active),
        claims: claims.get(row.code) ?? 0,
        used: used.get(row.code) ?? claims.get(row.code) ?? 0,
        maxUses: row.max_uses === null ? null : Number(row.max_uses),
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        note: row.note ? String(row.note) : null,
      })),
      ads: (adRows.data ?? []).map((row) => ({
        id: String(row.id),
        title: String(row.title),
        duration: Number(row.duration_s),
        url: String(row.video_url),
        active: Boolean(row.active),
        startsAt: row.starts_at ? String(row.starts_at) : null,
        endsAt: row.ends_at ? String(row.ends_at) : null,
        createdAt: String(row.created_at),
        views: views.get(row.id)?.views ?? 0,
        completions: views.get(row.id)?.completions ?? 0,
      })),
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    load()
      .then((data) => {
        if (!alive) return
        setCodes(data.codes)
        setAds(data.ads)
        setError(null)
      })
      .catch((reason: unknown) => alive && setError(String((reason as Error).message ?? reason)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [enabled, load, version])

  const run = async (work: () => PromiseLike<{ error: { message: string } | null }>) => {
    const { error: failure } = await work()
    if (failure) {
      setError(failure.message)
      throw new Error(failure.message)
    }
    setVersion((current) => current + 1)
  }

  return {
    codes,
    ads,
    loading,
    error,
    limitsSupported: true,
    addCode: async (code, days, limits = NO_LIMITS) => {
      const client = await supabase()
      // a new code only: re-adding an existing one must not switch it on again or drop its limits
      await run(() =>
        client
          .from('promo_codes')
          .insert({ code, days, active: true, ...limitRow(limits) })
          .then((result) => ({ error: duplicate(result.error) })),
      )
    },
    addCodes: async (list, days, limits = NO_LIMITS) => {
      if (list.length === 0) return
      const client = await supabase()
      await run(() =>
        client
          .from('promo_codes')
          .insert(list.map((code) => ({ code, days, active: true, ...limitRow(limits) })))
          .then((result) => ({ error: duplicate(result.error) })),
      )
    },
    setCodeLimits: async (code, limits) => {
      const client = await supabase()
      await run(() => client.from('promo_codes').update(limitRow(limits)).eq('code', code))
    },
    setAdSchedule: async (ad, startsAt, endsAt) => {
      if (startsAt && endsAt && endsAt <= startsAt) {
        throw new Error('Tugash vaqti boshlanishidan keyin bo‘lsin.')
      }
      const client = await supabase()
      await run(() =>
        client.from('ads').update({ starts_at: startsAt, ends_at: endsAt }).eq('id', ad.id),
      )
    },
    removeCode: async (code) => {
      const client = await supabase()
      await run(() => client.from('promo_codes').delete().eq('code', code))
    },
    setCodeActive: async (code, active) => {
      const client = await supabase()
      await run(() => client.from('promo_codes').update({ active }).eq('code', code))
    },
    addAd: async (ad) => {
      const client = await supabase()
      const duration = await durationOf(ad)
      if (duration < MIN_AD_SECONDS)
        throw new Error(`Reklama kamida ${MIN_AD_SECONDS} soniya bo‘lsin`)
      let url = ad.url ?? ''
      if (ad.file) {
        const extension = ad.file.name.split('.').pop()?.toLowerCase() || 'mp4'
        const path = `${crypto.randomUUID()}.${extension}`
        const upload = await client.storage
          .from('ads')
          .upload(path, ad.file, { contentType: ad.file.type || 'video/mp4' })
        if (upload.error) {
          setError(upload.error.message)
          throw new Error(upload.error.message)
        }
        url = client.storage.from('ads').getPublicUrl(path).data.publicUrl
      }
      await run(() =>
        client.from('ads').insert({ title: ad.title.trim(), video_url: url, duration_s: duration }),
      )
    },
    removeAd: async (ad) => {
      const client = await supabase()
      await run(() => client.from('ads').delete().eq('id', ad.id))
      const marker = '/storage/v1/object/public/ads/'
      if (ad.url?.includes(marker)) {
        await client.storage.from('ads').remove([ad.url.split(marker)[1]!])
      }
    },
    setAdActive: async (ad, active) => {
      const client = await supabase()
      await run(() => client.from('ads').update({ active }).eq('id', ad.id))
    },
    previewSrc: async (ad) => ad.url,
  }
}

export function useAdminPromo(source: 'device' | 'cloud'): AdminPromo {
  const device = useDevicePromo()
  const cloud = useCloudPromo(source === 'cloud')
  return source === 'cloud' ? cloud : device
}
