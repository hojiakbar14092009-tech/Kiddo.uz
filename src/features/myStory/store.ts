import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GUEST_KEY } from '@/domain/childKey'
import { isStoryChoices, type StoryChoices } from './content'

/*
 * The child's last own stories (Phase 49): at most three per child, kept
 * under the child's id, so one child never sees another's. Like progress, a
 * guest's stories are not kept on the device. Removing a profile forgets them
 * (familyStore.removeChild loads this module on demand).
 */

export const MAX_SAVED_STORIES = 3

export interface SavedStory extends StoryChoices {
  /** When it was made (ISO). */
  at: string
}

interface MyStoryState {
  byChild: Record<string, readonly SavedStory[]>
  /** Keeps a made story (now) at the front of the child's list. */
  save: (childKey: string, story: StoryChoices) => void
  removeChild: (childKey: string) => void
}

const same = (a: StoryChoices, b: StoryChoices) =>
  a.hero === b.hero && a.place === b.place && a.helper === b.helper && a.ending === b.ending

export const useMyStoryStore = create<MyStoryState>()(
  persist(
    (set) => ({
      byChild: {},
      save: (childKey, choices) =>
        set((state) => {
          if (!childKey || !isStoryChoices(choices)) return state
          const story: SavedStory = {
            hero: choices.hero,
            place: choices.place,
            helper: choices.helper,
            ending: choices.ending,
            at: new Date().toISOString(),
          }
          // the same story made again moves to the front instead of filling the list
          const rest = (state.byChild[childKey] ?? []).filter((item) => !same(item, story))
          return {
            byChild: {
              ...state.byChild,
              [childKey]: [story, ...rest].slice(0, MAX_SAVED_STORIES),
            },
          }
        }),
      removeChild: (childKey) =>
        set((state) => {
          if (!state.byChild[childKey]) return state
          const byChild = { ...state.byChild }
          delete byChild[childKey]
          return { byChild }
        }),
    }),
    {
      name: 'kiddo.myStories',
      version: 1,
      partialize: (state) => {
        const byChild = { ...state.byChild }
        delete byChild[GUEST_KEY]
        return { byChild }
      },
      // anything stored that is not a valid story is dropped
      merge: (persisted, current) => {
        const raw = (persisted as { byChild?: Record<string, unknown> } | undefined)?.byChild ?? {}
        const byChild: Record<string, SavedStory[]> = {}
        for (const [key, list] of Object.entries(raw)) {
          if (!Array.isArray(list)) continue
          const valid = list.filter(
            (item): item is SavedStory =>
              isStoryChoices(item) && typeof (item as SavedStory).at === 'string',
          )
          if (valid.length > 0) byChild[key] = valid.slice(0, MAX_SAVED_STORIES)
        }
        return { ...current, byChild }
      },
    },
  ),
)
