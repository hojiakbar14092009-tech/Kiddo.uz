import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AdminSession = { source: 'device' } | { source: 'cloud'; email: string }

/** PIN for the device admin view. Change it with VITE_ADMIN_PIN when building. */
export const ADMIN_PIN = (import.meta.env.VITE_ADMIN_PIN as string | undefined)?.trim() || '2026'

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
