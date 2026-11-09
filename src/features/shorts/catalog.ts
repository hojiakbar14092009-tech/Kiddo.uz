import type { Language } from '@/content/languages'
import type { Strand } from '@/domain/universe/types'
import type { SciGameId } from '@/features/sciGames/games'

/*
 * The cartoons (Phase 60): short, vertical, and only about learning – what the
 * science games teach, and a little about the world. Each one is rendered per
 * language with its own narration (marketing/shorts, Remotion) and served from
 * /video/shorts. Nothing else can appear here: no feed, no links out, no ads.
 */

export type ShortId =
  | 'water'
  | 'magnet'
  | 'float'
  | 'dayNight'
  | 'planets'
  | 'seed'
  /** Phase 68: one about each of the newer games. */
  | 'scale'
  | 'robot'
  | 'train'
  | 'shop'
  | 'shapes'
  | 'habitats'
  | 'plate'
  /** Phase 75: seven new lessons, Mini and Piku talking, each ending in a question. */
  | 'crossing'
  | 'bread'
  | 'tree'
  | 'rainbow'
  | 'dayCycle'
  | 'calm'
  | 'teeth'

export interface Short {
  id: ShortId
  /** The poster's big picture while the video loads. */
  emoji: string
  tone: 'bg-sky-soft' | 'bg-oops-soft' | 'bg-primary-soft' | 'bg-lilac-soft' | 'bg-coin-soft'
  /** Where "Play it" goes after the cartoon (the game it is about). */
  play: `/sci/${SciGameId}` | '/learn/space' | '/science-lab' | null
  /**
   * Rendered without a title or words: the app writes both (karaoke subtitles).
   * Cartoons without it still carry theirs in the picture, and the app adds none.
   */
  bare?: true
  /** One video for every language (the voice is Uzbek for now; the words are the app's). */
  single?: true
  /** The question after the cartoon: pictures to pick from, the right one, and what it counts as. */
  quiz?: { pics: readonly string[]; right: number; strand: Strand }
}

export const SHORTS: readonly Short[] = [
  { id: 'water', emoji: '🌧️', tone: 'bg-sky-soft', play: '/sci/water', bare: true, single: true },
  { id: 'magnet', emoji: '🧲', tone: 'bg-oops-soft', play: '/sci/magnet', bare: true },
  { id: 'float', emoji: '⛵', tone: 'bg-primary-soft', play: '/sci/float', bare: true },
  { id: 'dayNight', emoji: '🌍', tone: 'bg-lilac-soft', play: null, bare: true },
  { id: 'planets', emoji: '🪐', tone: 'bg-coin-soft', play: '/learn/space', bare: true },
  { id: 'seed', emoji: '🌱', tone: 'bg-primary-soft', play: '/science-lab', bare: true },
  { id: 'scale', emoji: '⚖️', tone: 'bg-coin-soft', play: '/sci/scale', bare: true },
  { id: 'robot', emoji: '🤖', tone: 'bg-lilac-soft', play: '/sci/robot', bare: true },
  { id: 'train', emoji: '🚂', tone: 'bg-sky-soft', play: '/sci/train', bare: true },
  { id: 'shop', emoji: '🛍️', tone: 'bg-primary-soft', play: '/sci/shop', bare: true },
  { id: 'shapes', emoji: '🔺', tone: 'bg-oops-soft', play: '/sci/shapes', bare: true },
  { id: 'habitats', emoji: '🦊', tone: 'bg-primary-soft', play: '/sci/habitats', bare: true },
  { id: 'plate', emoji: '🥕', tone: 'bg-coin-soft', play: '/sci/plate', bare: true },
  {
    id: 'crossing',
    emoji: '🚦',
    tone: 'bg-oops-soft',
    play: null,
    bare: true,
    single: true,
    quiz: { pics: ['✋', '🏃'], right: 0, strand: 'social' },
  },
  {
    id: 'bread',
    emoji: '🍞',
    tone: 'bg-coin-soft',
    play: null,
    bare: true,
    single: true,
    quiz: { pics: ['🌾', '🍎', '🥛'], right: 0, strand: 'science' },
  },
  {
    id: 'tree',
    emoji: '🌳',
    tone: 'bg-primary-soft',
    play: '/science-lab',
    bare: true,
    single: true,
    quiz: { pics: ['💧', '🍭', '🧸'], right: 0, strand: 'science' },
  },
  {
    id: 'rainbow',
    emoji: '🌈',
    tone: 'bg-lilac-soft',
    play: null,
    bare: true,
    single: true,
    quiz: { pics: ['5️⃣', '7️⃣'], right: 1, strand: 'science' },
  },
  {
    id: 'dayCycle',
    emoji: '🌍',
    tone: 'bg-sky-soft',
    play: null,
    bare: true,
    single: true,
    quiz: { pics: ['🌍', '☁️', '🌙'], right: 0, strand: 'space' },
  },
  {
    id: 'calm',
    emoji: '🎈',
    tone: 'bg-sky-soft',
    play: null,
    bare: true,
    single: true,
    quiz: { pics: ['🎈', '📢'], right: 0, strand: 'social' },
  },
  {
    id: 'teeth',
    emoji: '🦷',
    tone: 'bg-lilac-soft',
    play: null,
    bare: true,
    single: true,
    quiz: { pics: ['1️⃣', '2️⃣', '5️⃣'], right: 1, strand: 'social' },
  },
]

/** Different cartoons a Free child may open (and watch again) before PRO. */
export const FREE_SHORTS = 2
/** Cartoons in one sitting; then the robot suggests playing instead. */
export const PER_SITTING = 4

/** Only the cartoon in view and the one after it are videos; the rest are posters. */
export function isLive(index: number, active: number): boolean {
  return index === active || index === active + 1
}

export function videoUrl(language: Language, id: ShortId): string {
  const lang = SHORTS.find((short) => short.id === id)?.single ? 'uz' : language
  return `/video/shorts/${lang}/${id}.mp4`
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
