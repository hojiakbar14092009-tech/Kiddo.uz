import { useFamilyStore } from '@/store/familyStore'
import { isProActive, useSubscriptionStore } from '@/store/subscriptionStore'

/*
 * One capability check for every paid feature. Components ask
 * `useCanUse(feature)` / `useEntitlement(feature)` (and code paths right
 * before use ask `canUse(feature)`); nobody reads the plan on their own.
 *
 * PRO belongs to the family's children: a guest plays the free version even
 * when the family has PRO.
 */

/** Paid capabilities. */
export type ProFeature = 'audio' | 'premiumStories' | 'aiFriend' | 'offlinePacks'

export type EntitlementReason = 'ok' | 'pro' | 'guest'

export interface Entitlement {
  allowed: boolean
  /** 'ok': allowed; 'pro': needs PRO; 'guest': PRO features need a child profile. */
  reason: EntitlementReason
}

/** Which plan each feature needs. Every paid feature is PRO for now. */
const NEEDS_PRO: Record<ProFeature, boolean> = {
  audio: true,
  premiumStories: true,
  aiFriend: true,
  offlinePacks: true,
}

export function entitlementFor(
  feature: ProFeature,
  { paid, child }: { paid: boolean; child: boolean },
): Entitlement {
  if (!NEEDS_PRO[feature]) return { allowed: true, reason: 'ok' }
  if (!child) return { allowed: false, reason: 'guest' }
  if (!paid) return { allowed: false, reason: 'pro' }
  return { allowed: true, reason: 'ok' }
}

function snapshot(now: number = Date.now()) {
  return {
    paid: isProActive(useSubscriptionStore.getState(), now),
    child: useFamilyStore.getState().activeChildId !== null,
  }
}

/** May the one playing now use this feature? Checked right before it is used. */
export function canUse(feature: ProFeature): boolean {
  return entitlementFor(feature, snapshot()).allowed
}

/** The same check with the reason, outside React. */
export function getEntitlement(feature: ProFeature): Entitlement {
  return entitlementFor(feature, snapshot())
}

function usePlaySnapshot() {
  const paid = useSubscriptionStore((state) => isProActive(state))
  const child = useFamilyStore((state) => state.activeChildId !== null)
  return { paid, child }
}

/** The check with its reason, for drawing the screen (updates when PRO or the child changes). */
export function useEntitlement(feature: ProFeature): Entitlement {
  const { allowed, reason } = entitlementFor(feature, usePlaySnapshot())
  return { allowed, reason }
}

/** The same answer as `canUse`, for drawing the screen. */
export function useCanUse(feature: ProFeature): boolean {
  return useEntitlement(feature).allowed
}

/** Which tier the one playing now is on (the top bar badge): PRO only for a family's child. */
export function useProTier(): 'pro' | 'free' {
  const { paid, child } = usePlaySnapshot()
  return paid && child ? 'pro' : 'free'
}

/** Is PRO on for the one playing now? (For code outside React; screens use `useCanUse`.) */
export function getIsPro(): boolean {
  const { paid, child } = snapshot()
  return paid && child
}
