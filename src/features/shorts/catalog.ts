import type { Language } from '@/content/languages'
import type { SciGameId } from '@/features/sciGames/games'

/*
 * The cartoons (Phase 60): short, vertical, and only about learning – what the
 * science games teach, and a little about the world. Each one is rendered per
 * language with its own narration (marketing/shorts, Remotion) and served from
 * /video/shorts. Nothing else can appear here: no feed, no links out, no ads.
 */

export type ShortId = 'water' | 'magnet' | 'float' | 'dayNight' | 'planets' | 'seed'

export interface Short {
  id: ShortId
  /** The poster's big picture while the video loads. */
  emoji: string
  tone: 'bg-sky-soft' | 'bg-oops-soft' | 'bg-primary-soft' | 'bg-lilac-soft' | 'bg-coin-soft'
  /** Where "Play it" goes after the cartoon (the game it is about). */
  play: `/sci/${SciGameId}` | '/learn/space' | '/science-lab' | null
}

export const SHORTS: readonly Short[] = [
  { id: 'water', emoji: '🌧️', tone: 'bg-sky-soft', play: '/sci/water' },
  { id: 'magnet', emoji: '🧲', tone: 'bg-oops-soft', play: '/sci/magnet' },
  { id: 'float', emoji: '⛵', tone: 'bg-primary-soft', play: '/sci/float' },
  { id: 'dayNight', emoji: '🌍', tone: 'bg-lilac-soft', play: null },
  { id: 'planets', emoji: '🪐', tone: 'bg-coin-soft', play: '/learn/space' },
  { id: 'seed', emoji: '🌱', tone: 'bg-primary-soft', play: '/science-lab' },
]

/** Different cartoons a Free child may open (and watch again) before PRO. */
export const FREE_SHORTS = 2
/** Cartoons in one sitting; then the robot suggests playing instead. */
export const PER_SITTING = 4

export function videoUrl(language: Language, id: ShortId): string {
  return `/video/shorts/${language}/${id}.mp4`
}

export function posterUrl(id: ShortId): string {
  return `/video/shorts/posters/${id}.webp`
}

/**
 * May this cartoon be opened? PRO: always. Free: a cartoon already opened, or a
 * new one while fewer than FREE_SHORTS were opened.
 */
export function mayWatch(id: ShortId, opened: readonly ShortId[], pro: boolean): boolean {
  return pro || opened.includes(id) || opened.length < FREE_SHORTS
}

export function freeLeft(opened: readonly ShortId[]): number {
  return Math.max(0, FREE_SHORTS - opened.length)
}
