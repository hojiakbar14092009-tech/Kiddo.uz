import type { Strand } from '@/domain/universe/types'

/*
 * Kiddo's mini-games (Phases 59 and 65–67): short games that each teach one real
 * idea in a couple of minutes, with their rules and a try first. They live on the
 * Games page by subject; the attention helper offers the most unusual ones.
 */

export type SciGameId =
  | 'water'
  | 'magnet'
  | 'float'
  /** Phase 65: a balance to even out (adding), and a robot to program (sequences). */
  | 'scale'
  | 'robot'
  /** Phase 66: letters into a word's wagons; paying and change in a shop. */
  | 'train'
  | 'shop'

export interface SciGame {
  id: SciGameId
  path: `/sci/${SciGameId}`
  /** The big picture on its card (an emoji, so it reads without words). */
  emoji: string
  /** Card colour (a theme token). */
  tone: 'sky' | 'coral' | 'mint' | 'coin' | 'lilac'
  /** The universe activity id. */
  activity: `sci:${SciGameId}`
  /** What it practises (the universe strand). */
  strand: Strand
}

const game = (id: SciGameId, emoji: string, tone: SciGame['tone'], strand: Strand): SciGame => ({
  id,
  path: `/sci/${id}`,
  emoji,
  tone,
  activity: `sci:${id}`,
  strand,
})

export const SCI_GAMES: readonly SciGame[] = [
  game('water', '💧', 'sky', 'science'),
  game('magnet', '🧲', 'coral', 'science'),
  game('float', '🛶', 'mint', 'science'),
  game('scale', '⚖️', 'coin', 'number'),
  game('robot', '🤖', 'lilac', 'logic'),
  game('train', '🚂', 'coral', 'letters'),
  game('shop', '🛍️', 'mint', 'number'),
]

export function sciGame(id: string | undefined): SciGame | null {
  return SCI_GAMES.find((item) => item.id === id) ?? null
}
