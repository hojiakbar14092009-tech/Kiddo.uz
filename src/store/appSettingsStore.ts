import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isSeasonSetting, type SeasonSetting } from '@/features/seasons/seasons'

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
  /**
   * Rest hours (Phase 45), local time: from `start` to `end` (over midnight) the robot dozes
   * and says it is time to rest. Set by the admin for every family.
   */
  restHours: RestHours
  /** A holiday greeting on Home (Phase 45): by the calendar, off, or one holiday now. */
  season: SeasonSetting
}

export interface RestHours {
  /** 18–23. */
  start: number
  /** 4–9. */
  end: number
}

export const DEFAULT_REST_HOURS: RestHours = { start: 22, end: 5 }

/** Rest hours the admin may choose: the evening start 18–23, the morning end 4–9. */
export function clampRestHours(value: Partial<RestHours> | null | undefined): RestHours {
  // a number out of range is brought to the nearest allowed hour; anything else is the default
  const hour = (raw: unknown, min: number, max: number, fallback: number) =>
    typeof raw === 'number' && Number.isFinite(raw)
      ? Math.min(max, Math.max(min, Math.round(raw)))
      : fallback
  return {
    start: hour(value?.start, 18, 23, DEFAULT_REST_HOURS.start),
    end: hour(value?.end, 4, 9, DEFAULT_REST_HOURS.end),
  }
}

/** Is `hour` (0–23) inside the rest hours? */
export function isRestHour(hour: number, rest: RestHours = DEFAULT_REST_HOURS): boolean {
  return hour >= rest.start || hour < rest.end
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
  restHours: DEFAULT_REST_HOURS,
  season: 'auto',
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
          restHours: clampRestHours(old.restHours),
          season: isSeasonSetting(old.season) ? old.season : 'auto',
        }
      },
    },
  ),
)

export function getAppSettings(): AppSettings {
  const { prices, proGiftCoins, restHours, season } = useAppSettingsStore.getState()
  return {
    prices,
    proGiftCoins,
    restHours: clampRestHours(restHours),
    season: isSeasonSetting(season) ? season : 'auto',
  }
}
