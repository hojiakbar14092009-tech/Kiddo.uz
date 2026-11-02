import { useCallback, useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/content/languages'
import { childPhrases } from '@/services/audio/childPhrases'
import { phraseKey } from '@/services/audio/phrases'
import voiceManifest from '@/services/audio/voiceManifest.json'

/*
 * Voices in the admin panel (Phase 45): every sentence a child hears, whether it is recorded
 * (the build's voice manifest), and the admin's review of a recording (approved / rejected,
 * with a note). Reviews are kept in `voice_reviews` (0019) for a cloud admin, on this device
 * otherwise. Nothing here is a child's data.
 */

export const VOICE_LANGUAGES: readonly Language[] = ['uz', 'ru', 'en']

export type ReviewStatus = 'approved' | 'rejected'

export interface VoiceReview {
  status: ReviewStatus
  note: string | null
  at: string
}

export interface VoiceLine {
  text: string
  key: string
  recorded: boolean
  review: VoiceReview | null
}

const recordedSets: Record<Language, ReadonlySet<string>> = {
  uz: new Set((voiceManifest as Record<string, string[]>).uz ?? []),
  ru: new Set((voiceManifest as Record<string, string[]>).ru ?? []),
  en: new Set((voiceManifest as Record<string, string[]>).en ?? []),
}

let phrasesCache: Record<Language, string[]> | null = null

/** Every sentence a child hears in `language`, once, with its clip key and whether it is recorded. */
export function voiceLines(language: Language): Omit<VoiceLine, 'review'>[] {
  phrasesCache ??= childPhrases()
  const seen = new Set<string>()
  const lines: Omit<VoiceLine, 'review'>[] = []
  for (const text of phrasesCache[language] ?? []) {
    const key = phraseKey(language, text)
    if (seen.has(key)) continue
    seen.add(key)
    lines.push({ text, key, recorded: recordedSets[language].has(key) })
  }
  return lines
}

/** The waiting sentences as a plain list for the voice actor (one per line). */
export function waitingList(lines: readonly Omit<VoiceLine, 'review'>[]): string {
  return lines
    .filter((line) => !line.recorded)
    .map((line) => line.text)
    .join('\n')
}

type ReviewMap = Record<string, VoiceReview>
const reviewId = (language: Language, key: string) => `${language}/${key}`

interface DeviceReviews {
  reviews: ReviewMap
  set: (language: Language, key: string, review: VoiceReview | null) => void
}

/** A device admin's reviews (demo / no Supabase). */
export const useDeviceVoiceReviews = create<DeviceReviews>()(
  persist(
    (set) => ({
      reviews: {},
      set: (language, key, review) =>
        set((state) => {
          const reviews = { ...state.reviews }
          if (review) reviews[reviewId(language, key)] = review
          else delete reviews[reviewId(language, key)]
          return { reviews }
        }),
    }),
    { name: 'kiddo.admin.voice-reviews', version: 1 },
  ),
)

export interface AdminVoices {
  reviews: ReviewMap
  loading: boolean
  error: string | null
  review: (
    language: Language,
    key: string,
    status: ReviewStatus | null,
    note?: string,
  ) => Promise<void>
}

interface ReviewRow {
  key: string
  language: Language
  status: ReviewStatus
  note: string | null
  reviewed_at: string
}

/** The reviews, from `voice_reviews` (cloud admin) or this device. */
export function useAdminVoices(source: 'device' | 'cloud'): AdminVoices {
  const device = useDeviceVoiceReviews()
  const [cloud, setCloud] = useState<ReviewMap>({})
  const [loading, setLoading] = useState(source === 'cloud')
  const [error, setError] = useState<string | null>(null)

  const client = useCallback(async () => {
    const { getSupabase } = await import('@/services/supabase/client')
    return getSupabase()
  }, [])

  useEffect(() => {
    if (source !== 'cloud') return undefined
    let alive = true
    void (async () => {
      const supabase = await client()
      if (!supabase) return
      const { data, error: failure } = await supabase
        .from('voice_reviews')
        .select('key, language, status, note, reviewed_at')
      if (!alive) return
      setLoading(false)
      if (failure) {
        setError('Ovoz baholarini yuklab bo‘lmadi (0019 migratsiyasi qo‘llanganmi?).')
        return
      }
      setCloud(
        Object.fromEntries(
          ((data ?? []) as ReviewRow[]).map((row) => [
            reviewId(row.language, row.key),
            { status: row.status, note: row.note, at: row.reviewed_at },
          ]),
        ),
      )
    })()
    return () => {
      alive = false
    }
  }, [source, client])

  const review = useCallback(
    async (language: Language, key: string, status: ReviewStatus | null, note?: string) => {
      const value: VoiceReview | null = status
        ? {
            status,
            note: note?.trim() ? note.trim().slice(0, 200) : null,
            at: new Date().toISOString(),
          }
        : null
      if (source === 'device') {
        device.set(language, key, value)
        return
      }
      const supabase = await client()
      if (!supabase) return
      setError(null)
      const result = value
        ? await supabase
            .from('voice_reviews')
            .upsert(
              { key, language, status: value.status, note: value.note },
              { onConflict: 'language,key' },
            )
        : await supabase.from('voice_reviews').delete().eq('language', language).eq('key', key)
      if (result.error) {
        setError('Saqlab bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.')
        return
      }
      setCloud((current) => {
        const next = { ...current }
        if (value) next[reviewId(language, key)] = value
        else delete next[reviewId(language, key)]
        return next
      })
    },
    [source, client, device],
  )

  return {
    reviews: source === 'device' ? device.reviews : cloud,
    loading,
    error,
    review,
  }
}

/** The lines of a language with their reviews. */
export function useVoiceLines(language: Language, reviews: ReviewMap): VoiceLine[] {
  const base = useMemo(() => voiceLines(language), [language])
  return useMemo(
    () => base.map((line) => ({ ...line, review: reviews[reviewId(language, line.key)] ?? null })),
    [base, reviews, language],
  )
}
