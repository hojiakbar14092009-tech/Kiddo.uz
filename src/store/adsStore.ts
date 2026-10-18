import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** An ad on this device (no Supabase). Uploaded videos are kept in IndexedDB. */
export interface DeviceAd {
  id: string
  title: string
  /** Seconds. */
  duration: number
  /** A link to a video, or `null` when the video file is stored on the device. */
  url: string | null
  active: boolean
  createdAt: string
  views: number
  completions: number
}

interface AdsState {
  ads: DeviceAd[]
  add: (ad: DeviceAd) => void
  remove: (id: string) => void
  setActive: (id: string, active: boolean) => void
  countView: (id: string, completed: boolean) => void
}

export const useAdsStore = create<AdsState>()(
  persist(
    (set) => ({
      ads: [],
      add: (ad) => set((state) => ({ ads: [ad, ...state.ads] })),
      remove: (id) => set((state) => ({ ads: state.ads.filter((ad) => ad.id !== id) })),
      setActive: (id, active) =>
        set((state) => ({ ads: state.ads.map((ad) => (ad.id === id ? { ...ad, active } : ad)) })),
      countView: (id, completed) =>
        set((state) => ({
          ads: state.ads.map((ad) =>
            ad.id === id
              ? {
                  ...ad,
                  views: completed ? ad.views : ad.views + 1,
                  completions: completed ? ad.completions + 1 : ad.completions,
                }
              : ad,
          ),
        })),
    }),
    { name: 'kiddo.ads', version: 1 },
  ),
)
