import { useRewardStore } from '@/domain/rewards/rewardStore'
import { useUniverseStore } from '@/domain/universe/store'
import { useLearnStore } from '@/features/learn/learnStore'
import { useActivityStore } from '@/store/activityStore'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { CloudSync, type SyncedStore, type SyncKey } from './cloudSync'
import type { Saved } from './merge'
import { pullServerPro } from './serverPro'

interface PersistedStore {
  subscribe(listener: () => void): () => void
  persist: { getOptions(): { name?: string }; rehydrate(): Promise<void> | void }
}

/** A zustand `persist` store as the sync engine sees it: its saved JSON on the device. */
export function persistedStore(store: PersistedStore): SyncedStore {
  const name = store.persist.getOptions().name!
  return {
    read: () => {
      try {
        return JSON.parse(localStorage.getItem(name) ?? 'null') as Saved | null
      } catch {
        return null
      }
    },
    write: (saved) => {
      localStorage.setItem(name, JSON.stringify(saved))
      // runs the store's own version migration on the account's copy (synchronous for localStorage)
      void store.persist.rehydrate()
    },
    subscribe: (listener) => store.subscribe(listener),
  }
}

const stores = (): Record<SyncKey, SyncedStore> => ({
  family: persistedStore(useFamilyStore),
  progress: persistedStore(useProgressStore),
  learn: persistedStore(useLearnStore),
  rewards: persistedStore(useRewardStore),
  universe: persistedStore(useUniverseStore),
  activity: persistedStore(useActivityStore),
})

/** Starts following the account; returns the stop (sends what is unsent first). Loaded only once signed in. */
export function startCloudSync(userId: string): () => void {
  const sync = new CloudSync(userId, stores())
  void sync.start()
  // Pro is the server's word (a paid plan never comes from the device's storage)
  void pullServerPro().catch(() => undefined)
  return () => {
    void sync.flush(true)
    sync.stop()
  }
}
