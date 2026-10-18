import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Settings the admin can change: PRO prices, the coins given with PRO, and
 * promo codes. Saved on this device; with Supabase they also come from the
 * `app_settings` table, so every family gets the admin's values.
 */
export interface AppSettings {
  /** PRO prices in so‘m. */
  prices: { monthly: number; yearly: number }
  /** Coins each child gets as a thank-you when PRO is bought. */
  proGiftCoins: number
  /** Promo code → days of PRO. Codes are upper case. */
  promoCodes: Record<string, number>
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  prices: { monthly: 29_000, yearly: 199_000 },
  proGiftCoins: 50,
  promoCodes: { KIDDO7: 7, BOLAJON30: 30 },
}

interface AppSettingsState extends AppSettings {
  update: (changes: Partial<AppSettings>) => void
  setPromo: (code: string, days: number) => void
  removePromo: (code: string) => void
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_APP_SETTINGS,
      update: (changes) => set(changes),
      setPromo: (code, days) =>
        set((state) => ({
          promoCodes: { ...state.promoCodes, [code.trim().toUpperCase()]: Math.max(1, days) },
        })),
      removePromo: (code) =>
        set((state) => {
          const promoCodes = { ...state.promoCodes }
          delete promoCodes[code]
          return { promoCodes }
        }),
    }),
    { name: 'kiddo.app-settings', version: 1 },
  ),
)

export function getAppSettings(): AppSettings {
  const { prices, proGiftCoins, promoCodes } = useAppSettingsStore.getState()
  return { prices, proGiftCoins, promoCodes }
}
