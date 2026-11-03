import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShortId } from '@/features/shorts/catalog'

/** The cartoons each child (or the guest) has opened, for Free's two free ones (Phase 60). */
interface ShortsState {
  opened: Record<string, ShortId[]>
  open: (childKey: string, id: ShortId) => void
  forgetChild: (childKey: string) => void
}

export const useShortsStore = create<ShortsState>()(
  persist(
    (set) => ({
      opened: {},
      open: (childKey, id) =>
        set((state) => {
          const list = state.opened[childKey] ?? []
          return list.includes(id)
            ? state
            : { opened: { ...state.opened, [childKey]: [...list, id] } }
        }),
      forgetChild: (childKey) =>
        set((state) => {
          const opened = { ...state.opened }
          delete opened[childKey]
          return { opened }
        }),
    }),
    { name: 'kiddo.shorts', version: 1 },
  ),
)
