import { isSupabaseConfigured } from '@/services/supabase/config'

/*
 * The demo switches of the build, in one place (Phase 20). Components never
 * read environment variables for this: they read `DEMO`.
 *
 * - demoMode: the public browser demo. By default a build without a cloud
 *   backend is a demo (everything lives on the device, there is no real
 *   account or payment to protect); `VITE_DEMO_MODE=false` turns it off. A
 *   build with a cloud backend is never a demo.
 * - publicProUIEnabled: purchase screens, prices and upgrade prompts. Hidden in
 *   the demo; the PRO architecture (plans, entitlements, payments) stays.
 * - demoAdminEnabled: `/admin` offers a demo entry. A demo admin session is its
 *   own kind (`source: 'demo'`), works only on this device's data and is never
 *   accepted by a build that is not a demo: it is not a production login.
 */

export interface DemoConfig {
  demoMode: boolean
  publicProUIEnabled: boolean
  demoAdminEnabled: boolean
}

interface DemoEnv {
  VITE_DEMO_MODE?: string
  VITE_PUBLIC_PRO_UI?: string
}

function flag(value: string | undefined): boolean | null {
  const v = value?.trim().toLowerCase()
  if (v === 'true' || v === '1') return true
  if (v === 'false' || v === '0') return false
  return null
}

export function resolveDemoConfig(env: DemoEnv, cloudBackend: boolean): DemoConfig {
  // never a demo next to real accounts: with a cloud backend the demo admin,
  // demo PRO and the public demo codes would be an open door, whatever the env says
  const demoMode = !cloudBackend && (flag(env.VITE_DEMO_MODE) ?? true)
  return {
    demoMode,
    publicProUIEnabled: flag(env.VITE_PUBLIC_PRO_UI) ?? !demoMode,
    demoAdminEnabled: demoMode,
  }
}

// Each flag is read by name (Phase 52): passing the env object whole makes
// the bundler inline every VITE_ variable of the build into the app, any
// value meant only for tests (VITE_ADMIN_PIN) included.
export const DEMO: DemoConfig = resolveDemoConfig(
  {
    VITE_DEMO_MODE: import.meta.env.VITE_DEMO_MODE as string | undefined,
    VITE_PUBLIC_PRO_UI: import.meta.env.VITE_PUBLIC_PRO_UI as string | undefined,
  },
  isSupabaseConfigured,
)
