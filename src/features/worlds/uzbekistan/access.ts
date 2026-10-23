import { canUse } from '@/domain/entitlements'
import type { ExploreId } from './content'
import type { GameKind } from './generators'

/*
 * Free vs PRO in "My Uzbekistan". Free: the map game, the dasturxon, two
 * landmarks (Registon, the tandir) and the tradition cards. PRO (feature
 * 'premiumWorlds'): the other landmarks and the patterns game. The check is
 * the domain's `canUse`, asked again right before a premium item opens; the
 * screens themselves also refuse to show premium content without it.
 */

export const FREE_EXPLORE: readonly ExploreId[] = ['registan', 'tandir', 'navruz', 'mehmon']
export const FREE_GAMES: readonly GameKind[] = ['map', 'table']

export type UzItem = { type: 'explore'; id: ExploreId } | { type: 'game'; id: GameKind }

export function isPremium(item: UzItem): boolean {
  return item.type === 'explore' ? !FREE_EXPLORE.includes(item.id) : !FREE_GAMES.includes(item.id)
}

/** May the one playing now open this item? (Free items always; premium ones with PRO.) */
export function canOpen(item: UzItem): boolean {
  return !isPremium(item) || canUse('premiumWorlds')
}

export function itemRoute(item: UzItem): string {
  return item.type === 'explore'
    ? `/worlds/uzbekistan/explore/${item.id}`
    : `/worlds/uzbekistan/${item.id}`
}
