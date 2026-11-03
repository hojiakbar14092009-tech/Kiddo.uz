/*
 * The three short science games (Phase 59). The attention helper offers all
 * three at once when a child keeps drifting away; they are also reachable from
 * the Explore hub. Each takes about two minutes and teaches one real idea.
 */

export type SciGameId = 'water' | 'magnet' | 'float'

export interface SciGame {
  id: SciGameId
  path: `/sci/${SciGameId}`
  /** The big picture on its card (an emoji, so it reads without words). */
  emoji: string
  /** Card colour (a theme token). */
  tone: 'sky' | 'coral' | 'mint'
  /** The universe activity id. */
  activity: `sci:${SciGameId}`
}

export const SCI_GAMES: readonly SciGame[] = [
  { id: 'water', path: '/sci/water', emoji: '💧', tone: 'sky', activity: 'sci:water' },
  { id: 'magnet', path: '/sci/magnet', emoji: '🧲', tone: 'coral', activity: 'sci:magnet' },
  { id: 'float', path: '/sci/float', emoji: '🛶', tone: 'mint', activity: 'sci:float' },
]

export function sciGame(id: string | undefined): SciGame | null {
  return SCI_GAMES.find((game) => game.id === id) ?? null
}
