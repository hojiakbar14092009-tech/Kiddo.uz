import type { AppIconName } from '@/features/age/AppIcon'
import type { GameType } from '@/features/tasks/games'

/*
 * The Games page (Phase 62): every game and practice in Kiddo in one place,
 * grouped by subject. Nothing is rebuilt here: a building is drawn from the
 * world (its name, picture and lock), a task game from its own meta, a page from
 * its own words. New games are added to this list once.
 */

export const SUBJECTS = ['math', 'letters', 'science', 'space', 'logic', 'health'] as const
export type Subject = (typeof SUBJECTS)[number]

export type GameEntry =
  /** A place of the child's world (universe BUILDINGS): name, picture and lock come from it. */
  | { kind: 'building'; id: string }
  /** One of the four task games (find a letter, a picture, pairs, tracing). */
  | { kind: 'task'; game: GameType }
  /** Any other page: its route, the i18n key of its name and its picture. */
  | {
      kind: 'page'
      id: string
      to: string
      labelKey: string
      picture: { img3d: string } | { icon: AppIconName } | { emoji: string }
    }

const sci = (id: 'water' | 'magnet' | 'float' | 'scale' | 'robot', emoji: string): GameEntry => ({
  kind: 'page',
  id: `sci-${id}`,
  to: `/sci/${id}`,
  labelKey: `sciGames.${id}.title`,
  picture: { emoji },
})

export const GAMES: Readonly<Record<Subject, readonly GameEntry[]>> = {
  math: [
    sci('scale', '⚖️'),
    { kind: 'building', id: 'math-land' },
    {
      kind: 'page',
      id: 'numbers',
      to: '/alphabet?tab=numbers',
      labelKey: 'home.numbers',
      picture: { icon: 'numbers' },
    },
  ],
  letters: [
    { kind: 'task', game: 'find-letter' },
    { kind: 'task', game: 'find-picture' },
    { kind: 'building', id: 'reading-house' },
    { kind: 'building', id: 'word-workshop' },
    { kind: 'building', id: 'writing-school' },
    { kind: 'building', id: 'story-library' },
    {
      kind: 'page',
      id: 'three-words',
      to: '/learn/three-words',
      labelKey: 'threeWords.title',
      picture: { img3d: 'notebook' },
    },
  ],
  science: [
    sci('water', '💧'),
    sci('magnet', '🧲'),
    sci('float', '🛶'),
    { kind: 'building', id: 'garden' },
    { kind: 'building', id: 'science-lab' },
    { kind: 'building', id: 'dino-park' },
    {
      kind: 'page',
      id: 'shadow-lab',
      to: '/shadow-lab',
      labelKey: 'shadowLab.title',
      picture: { img3d: 'lamp' },
    },
  ],
  space: [
    { kind: 'building', id: 'observatory' },
    { kind: 'building', id: 'spaceport' },
    {
      kind: 'page',
      id: 'scale-portal',
      to: '/scale-portal',
      labelKey: 'scalePortal.card',
      picture: { img3d: 'ringed-planet' },
    },
  ],
  logic: [
    sci('robot', '🤖'),
    { kind: 'task', game: 'memory' },
    { kind: 'building', id: 'robot-workshop' },
  ],
  health: [{ kind: 'building', id: 'friendship-house' }],
}

export function entryKey(entry: GameEntry): string {
  return entry.kind === 'building' ? entry.id : entry.kind === 'task' ? entry.game : entry.id
}

/**
 * The five most unusual games, offered when a child keeps drifting away (Phase 64);
 * "All games" opens the whole page. Kept here so the list changes in one place.
 */
export const TOP_GAMES: readonly {
  id: string
  to: string
  labelKey: string
  emoji: string
  tint: string
}[] = [
  {
    id: 'robot',
    to: '/sci/robot',
    labelKey: 'sciGames.robot.title',
    emoji: '🤖',
    tint: 'bg-lilac-soft',
  },
  {
    id: 'scale',
    to: '/sci/scale',
    labelKey: 'sciGames.scale.title',
    emoji: '⚖️',
    tint: 'bg-coin-soft',
  },
  {
    id: 'magnet',
    to: '/sci/magnet',
    labelKey: 'sciGames.magnet.title',
    emoji: '🧲',
    tint: 'bg-oops-soft',
  },
  {
    id: 'float',
    to: '/sci/float',
    labelKey: 'sciGames.float.title',
    emoji: '🛶',
    tint: 'bg-primary-soft',
  },
  {
    id: 'shadow',
    to: '/shadow-lab',
    labelKey: 'shadowLab.title',
    emoji: '🔦',
    tint: 'bg-coin-soft',
  },
]
