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
}

export interface AdminAd {
  id: string
  title: string
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
  addCode: (code: string, days: number) => Promise<void>
  removeCode: (code: string) => Promise<void>
  setCodeActive: (code: string, active: boolean) => Promise<void>
  addAd: (ad: NewAd) => Promise<void>
  removeAd: (ad: AdminAd) => Promise<void>
  setAdActive: (ad: AdminAd, active: boolean) => Promise<void>
  /** A playable source for the admin's preview. */
  previewSrc: (ad: AdminAd) => Promise<string | null>
}

export const CODE_PATTERN = /^[A-Z0-9]{3,20}$/
const MAX_AD_SECONDS = 600

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
    })),
    ads,
    loading: false,
    error: null,
    addCode: (code, days) => usePromoStore.getState().addCode(code, days),
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

async function supabase() {
  const { getSupabase } = await import('@/services/supabase/client')
  const client = getSupabase()
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
    const [codeRows, claimRows, adRows, viewRows] = await Promise.all([
      client.from('promo_codes').select('code, days, active').order('created_at'),
      client.from('promo_claims').select('code'),
      client
        .from('ads')
        .select('id, title, video_url, duration_s, active, created_at')
        .order('created_at', { ascending: false }),
      client.from('ad_views').select('ad_id, completed_at').limit(20000),
    ])
    const failed = [codeRows, claimRows, adRows, viewRows].find((result) => result.error)
    if (failed?.error) throw new Error(failed.error.message)
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
      })),
      ads: (adRows.data ?? []).map((row) => ({
        id: String(row.id),
        title: String(row.title),
        duration: Number(row.duration_s),
        url: String(row.video_url),
        active: Boolean(row.active),
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
    addCode: async (code, days) => {
      const client = await supabase()
      await run(() =>
        client.from('promo_codes').upsert({ code, days, active: true }, { onConflict: 'code' }),
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
