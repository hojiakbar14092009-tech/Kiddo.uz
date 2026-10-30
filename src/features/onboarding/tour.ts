import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'

/*
 * Guided discovery (Phase 25, full contract): coach marks on the real screens —
 * a spotlight on the thing itself, a short word from KidoBot, Next / Back /
 * Skip. Each child has their own count per tour: the first time the full tour,
 * the second time a short reminder, after that nothing. A parent can replay.
 */

export type TourId = 'home' | 'play' | 'reward'

export interface TourStep {
  /** i18n `tour.<tour>.<id>.*` */
  id: string
  /** Where the spotlight goes: the first of these on the page that is shown. */
  anchors: readonly string[]
  /** Part of the short reminder (the second visit). */
  brief?: boolean
}

export const TOURS: Record<TourId, readonly TourStep[]> = {
  home: [
    // the button itself (the card can be taller than half a phone screen)
    { id: 'journey', anchors: ['[data-testid="journey-go"]', '[data-testid="journey-card"]'] },
    {
      id: 'plan',
      anchors: [
        'section[aria-labelledby="plan-title"] [aria-current="step"]',
        'section[aria-labelledby="plan-title"]',
      ],
      brief: true,
    },
    { id: 'homework', anchors: ['[data-tour="homework"]'], brief: true },
    { id: 'coins', anchors: ['[data-testid="coin-counter"]', '[data-bar-end]'] },
    { id: 'city', anchors: ['section[aria-labelledby="city-title"] > ul'] },
    { id: 'parent', anchors: ['a[href="/parent"]'] },
  ],
  play: [
    {
      id: 'answer',
      anchors: [
        '[data-testid="task-options"]',
        '[data-testid="memory-board"]',
        '[data-tour="answer"]',
      ],
      brief: true,
    },
    { id: 'back', anchors: ['header [data-sound="back"]'] },
  ],
  reward: [
    { id: 'earned', anchors: ['[data-tour="earned"]'], brief: true },
    { id: 'home', anchors: ['[data-tour="reward-home"]'] },
  ],
}

/**
 * Browser tests of other features switch the tours off for the whole device
 * (localStorage `kiddo.e2e.tours` = 'off', set in e2e/state/onboarded.json);
 * the onboarding tests turn them back on.
 */
export function toursOff(): boolean {
  try {
    return window.localStorage.getItem('kiddo.e2e.tours') === 'off'
  } catch {
    return false
  }
}

/** How many times a tour has been seen decides how much of it is shown. */
export function stepsFor(tour: TourId, seen: number): readonly TourStep[] {
  if (toursOff()) return []
  if (seen <= 0) return TOURS[tour]
  if (seen === 1) return TOURS[tour].filter((step) => step.brief)
  return []
}

/** Times the active child (or a guest) has seen this tour. */
export function useToursSeen(tour: TourId): number {
  const activeId = useFamilyStore((state) => state.activeChildId)
  const childSeen = useFamilyStore(
    (state) => state.children.find((child) => child.id === activeId)?.tours?.[tour],
  )
  const guestSeen = useSettingsStore((state) => state.guestTours[tour])
  return (activeId ? childSeen : guestSeen) ?? 0
}

/** The tour ended (finished or skipped): counted once for the active child only. */
export function markTourSeen(tour: TourId): void {
  const { activeChildId, children, updateChild } = useFamilyStore.getState()
  if (activeChildId) {
    const child = children.find((item) => item.id === activeChildId)
    if (!child) return
    updateChild(child.id, { tours: { ...child.tours, [tour]: (child.tours?.[tour] ?? 0) + 1 } })
    return
  }
  const { guestTours, setGuestTours } = useSettingsStore.getState()
  setGuestTours({ ...guestTours, [tour]: (guestTours[tour] ?? 0) + 1 })
}

/** A parent replays the tours for the active child (or the guest): all full again. */
export function resetTours(): void {
  const { activeChildId, updateChild } = useFamilyStore.getState()
  if (activeChildId) updateChild(activeChildId, { tours: {} })
  else useSettingsStore.getState().setGuestTours({})
}
