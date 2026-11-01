import type { RewardReason } from '@/domain/rewards'
import type { ResourceId } from './types'

/*
 * One currency for children (Phase 39): yong‘oq (nuts). The coins of the
 * reward ledger are the nuts; crystals, parts and scrolls are no longer paid
 * or spent — what used to pay them pays nuts at this rate, buildings cost
 * nuts at the same rate, and what a child already holds is converted once.
 * Stars stay a measure (1–3 per run, never spent); seeds and keys stay items.
 */

export const NUT_VALUE = { crystal: 10, part: 5, scroll: 5 } as const
export type LegacyResource = keyof typeof NUT_VALUE
export const LEGACY_RESOURCES = Object.keys(NUT_VALUE) as LegacyResource[]

export function isLegacyResource(resource: ResourceId): resource is LegacyResource {
  return resource in NUT_VALUE
}

/** The nuts a cost (or a balance) of legacy resources is worth; other resources are ignored. */
export function nutValue(amounts: Partial<Record<ResourceId, number>>): number {
  let total = 0
  for (const resource of LEGACY_RESOURCES) {
    const amount = Math.max(0, Math.round(amounts[resource] ?? 0))
    total += amount * NUT_VALUE[resource]
  }
  return total
}

/** The reward-ledger reason a former resource grant pays nuts under (the server caps these daily). */
export function nutReason(reason: string): RewardReason {
  // a grown-up's grant stays the grown-up's (never synced as play)
  if (reason === 'admin') return 'admin'
  return reason === 'quest' || reason === 'journey' ? 'quest' : 'learn'
}

/** The reward-ledger ref of a former resource grant: unique per (resource, reason, ref). */
export function nutRef(resource: LegacyResource, reason: string, refId: string): string {
  return `${resource}|${reason}|${refId}`.slice(0, 128)
}

/** The one-time conversion of what a child held (resource spends and the nut grant share it). */
export const CONVERSION_REASON = 'conversion'
export const CONVERSION_REF = 'conversion|v1'
