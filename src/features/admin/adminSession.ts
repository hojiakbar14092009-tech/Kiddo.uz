import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AdminSession = { source: 'device' } | { source: 'cloud'; email: string }

/** The PIN everyone could read in the old README; only ever accepted in development. */
const DEV_PIN = '2026'

/**
 * PIN for the device admin view, or `null` when this build has no device
 * admin. A production build never has one: anything built into the app (a
 * PIN included) can be read by anyone who opens it, so admin rights come only
 * from a signed-in cloud account the server knows as an admin (is_admin()).
 * Development uses the old PIN; the browser tests build with `--mode e2e`
 * and VITE_ADMIN_PIN.
 */
export function adminPin(): string | null {
  if (import.meta.env.PROD && import.meta.env.MODE !== 'e2e') return null
  const configured = (import.meta.env.VITE_ADMIN_PIN as string | undefined)?.trim()
  if (configured) return configured
  return import.meta.env.PROD ? null : DEV_PIN
}

interface AdminState {
  session: AdminSession | null
  theme: 'light' | 'dark'
  signIn: (session: AdminSession) => void
  signOut: () => void
  toggleTheme: () => void
}

/**
 * The admin's sign-in lasts for the browser tab (sessionStorage), so a child
 * who later picks up the tablet does not find the admin panel open.
 */
export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      session: null,
      theme:
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark',
      signIn: (session) => set({ session }),
      signOut: () => set({ session: null }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'kiddo.admin',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
