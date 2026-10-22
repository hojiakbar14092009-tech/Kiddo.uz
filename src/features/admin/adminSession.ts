import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AdminSession = { source: 'device' } | { source: 'cloud'; email: string }

/** The PIN everyone could read in the old README; only ever accepted in development. */
const DEV_PIN = '2026'

/**
 * PIN for the device admin view, from VITE_ADMIN_PIN at build time. A
 * production build without it has no device admin at all (`null`): a default
 * PIN that ships with the app is no PIN. Development and tests fall back to
 * the old one so local work stays easy.
 */
export function adminPin(): string | null {
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
