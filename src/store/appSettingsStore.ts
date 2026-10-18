import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Settings the admin can change: the PRO price and the coins given with PRO.
 * Saved on this device; with Supabase they also come from the public
 * `app_settings` table, so every family gets the admin's values. (Promo codes
 * are not settings: they are kept private, see features/promo.)
 */
export interface AppSettings {
  /** PRO prices in so‘m. The yearly price always follows from the monthly one. */
  prices: { monthly: number; yearly: number }
  /** Coins each child gets as a thank-you when PRO is bought. */
  proGiftCoins: number
}

/** A year costs twelve months less 20 %. */
export const YEARLY_DISCOUNT = 0.2

/** The yearly price for a monthly price: 12 months − 20 %, rounded to 100 so‘m. */
export function yearlyPrice(monthly: number): number {
  return Math.round((monthly * 12 * (1 - YEARLY_DISCOUNT)) / 100) * 100
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  prices: { monthly: 29_000, yearly: yearlyPrice(29_000) },
  proGiftCoins: 50,
}

interface AppSettingsState extends AppSettings {
  update: (changes: Partial<AppSettings>) => void
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_APP_SETTINGS,
      update: (changes) =>
        set((state) => {
          const monthly = changes.prices?.monthly ?? state.prices.monthly
          return { ...changes, prices: { monthly, yearly: yearlyPrice(monthly) } }
        }),
    }),
    {
      name: 'kiddo.app-settings',
      version: 2,
      // v1 kept promo codes here (now private) and a yearly price set by hand.
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Partial<AppSettings>
        const monthly = old.prices?.monthly ?? DEFAULT_APP_SETTINGS.prices.monthly
        return {
          prices: { monthly, yearly: yearlyPrice(monthly) },
          proGiftCoins: old.proGiftCoins ?? DEFAULT_APP_SETTINGS.proGiftCoins,
        }
      },
    },
  ),
)

export function getAppSettings(): AppSettings {
  const { prices, proGiftCoins } = useAppSettingsStore.getState()
  return { prices, proGiftCoins }
}
