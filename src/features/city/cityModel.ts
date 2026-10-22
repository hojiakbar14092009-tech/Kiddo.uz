import {
  findBuilding,
  tryClaimDailyQuest,
  type AwardSummary,
  type BuildingView,
  type ResourceId,
} from '@/domain/universe'

/** Sky colours of the plots, in turn, so the city is varied but calm. */
export const PLOT_TINTS = [
  'bg-sky-soft',
  'bg-coin-soft',
  'bg-lilac-soft',
  'bg-primary-soft',
  'bg-girl-soft',
  'bg-oops-soft',
] as const

export interface CostRow {
  resource: ResourceId
  need: number
  have: number
  missing: number
}

/** What the next level costs, next to what the child has; stars are a threshold, not a price. */
export function costRows(
  building: BuildingView,
  balances: Readonly<Record<ResourceId, number>>,
): CostRow[] {
  if (!building.next) return []
  const rows: CostRow[] = []
  for (const [resource, need] of Object.entries(building.next.cost) as [ResourceId, number][]) {
    if (need > 0) {
      rows.push({
        resource,
        need,
        have: balances[resource] ?? 0,
        missing: building.next.missing[resource] ?? 0,
      })
    }
  }
  const starsNeeded = findBuilding(building.id)?.levels[building.level + 1]?.starsNeeded ?? 0
  if (starsNeeded > 0) {
    rows.push({
      resource: 'star',
      need: starsNeeded,
      have: balances.star ?? 0,
      missing: building.next.missing.star ?? 0,
    })
  }
  return rows
}

export type QuestClaim = { award: AwardSummary } | { reason: 'claimed' | 'not-done' | 'failed' }

/**
 * Claims the quest of `day` (the day the card shows) through the domain, which
 * owns the rules (yesterday's finished quest stays claimable until today's is
 * claimed), and says why when nothing was paid.
 */
export function claimQuest(childKey: string, day: string): QuestClaim {
  const outcome = tryClaimDailyQuest(childKey, day)
  if (outcome.award) return { award: outcome.award }
  return {
    reason:
      outcome.reason === 'claimed'
        ? 'claimed'
        : outcome.reason === 'not-complete'
          ? 'not-done'
          : 'failed',
  }
}
