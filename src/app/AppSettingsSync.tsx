import { useEffect } from 'react'
import { isSupabaseConfigured } from '@/services/supabase/config'
import {
  DEFAULT_APP_SETTINGS,
  useAppSettingsStore,
  type AppSettings,
} from '@/store/appSettingsStore'

/**
 * With Supabase, the PRO price and gift come from the admin's
 * `app_settings`, so every family sees what the admin set. Offline, the last
 * known values (or the defaults) stay.
 */
export function AppSettingsSync() {
  useEffect(() => {
    if (!isSupabaseConfigured) return
    let alive = true
    void import('@/services/supabase/client').then(async ({ getSupabase }) => {
      const supabase = getSupabase()
      if (!supabase) return
      const { data, error } = await supabase.from('app_settings').select('key, value')
      if (!alive || error || !data || data.length === 0) return
      const stored = Object.fromEntries(
        data.map((row) => [row.key, row.value]),
      ) as Partial<AppSettings>
      // update() works the yearly price out of the monthly one (−20 %).
      useAppSettingsStore.getState().update({
        prices: { ...DEFAULT_APP_SETTINGS.prices, ...stored.prices },
        proGiftCoins: stored.proGiftCoins ?? DEFAULT_APP_SETTINGS.proGiftCoins,
      })
    })
    return () => {
      alive = false
    }
  }, [])
  return null
}
