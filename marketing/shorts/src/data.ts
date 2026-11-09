import timings from './timings.json'

export const FPS = 30
export const W = 720
export const H = 1280

export type Lang = 'uz' | 'ru' | 'en'
export type ShortId =
  | 'water'
  | 'magnet'
  | 'float'
  | 'dayNight'
  | 'planets'
  | 'seed'
  | 'scale'
  | 'robot'
  | 'train'
  | 'shop'
  | 'shapes'
  | 'habitats'
  | 'plate'
export const SHORT_IDS: ShortId[] = [
  'water',
  'magnet',
  'float',
  'dayNight',
  'planets',
  'seed',
  'scale',
  'robot',
  'train',
  'shop',
  'shapes',
  'habitats',
  'plate',
]
export const LANGS: Lang[] = ['uz', 'ru', 'en']

/** The voice starts this long into its scene, and the scene holds this long after it. */
export const VOICE_IN = 10
export const HOLD = 22
/** Dialogue stories (two storytellers) breathe faster: a short pause, not a long hold. */
export const STORY_IDS: ReadonlySet<string> = new Set([
  'water',
  'crossing',
  'bread',
  'tree',
  'rainbow',
  'dayCycle',
  'calm',
  'teeth',
])
export const voiceIn = (short: string) => (STORY_IDS.has(short) ? 8 : VOICE_IN)
export const hold = (short: string) => (STORY_IDS.has(short) ? 12 : HOLD)
/** The title card before the first scene and the end card after the last. */
export const OPENING = 36
export const ENDING = 45

export interface Timing {
  lines: string[]
  scenes: string[]
  durations: number[]
  /** Dialogue stories: who says each line. */
  speakers?: ('mini' | 'piku')[]
  /** Seconds of silence after each line (the child breathes along); 0 when absent. */
  pauses?: number[]
}

export function timing(short: string, lang: Lang): Timing {
  return (timings as Record<string, Record<string, Timing>>)[short]![lang]!
}

/** Frames of one scene: its line plus the breath before and after. */
export const pauseFrames = (short: string, lang: Lang, index: number): number =>
  Math.round((timing(short, lang).pauses?.[index] ?? 0) * FPS)

export function sceneFrames(short: string, lang: Lang, index: number): number {
  return (
    voiceIn(short) +
    Math.ceil(timing(short, lang).durations[index]! * FPS) +
    hold(short) +
    pauseFrames(short, lang, index)
  )
}

export function totalFrames(short: string, lang: Lang): number {
  const { durations } = timing(short, lang)
  return OPENING + durations.reduce((sum, _, i) => sum + sceneFrames(short, lang, i), 0) + ENDING
}

export const voiceFile = (short: string, lang: Lang, index: number) =>
  `vo/${short}/${lang}-${index}.wav`

/** The app's colours. */
export const C = {
  cream: '#fff8ec',
  ink: '#3a2e4d',
  inkSoft: '#5e5470',
  primary: '#13917e',
  primarySoft: '#ddf4ec',
  coin: '#ffc93c',
  coinShadow: '#e0a419',
  sky: '#7cc4f5',
  skySoft: '#ddeefc',
  oops: '#ff8a4c',
  lilac: '#eee6fb',
  night: '#120d1d',
  line: '#f1e3c8',
}

/** Each cartoon's own sky and accent. */
export const THEME: Record<string, { top: string; bottom: string; accent: string }> = {
  water: { top: '#8fd3ff', bottom: '#e6f6ff', accent: '#2f7fc4' },
  magnet: { top: '#ffd9c7', bottom: '#fff6ef', accent: '#e2552d' },
  float: { top: '#b8ecdf', bottom: '#f0fbf7', accent: '#13917e' },
  dayNight: { top: '#3a3f8f', bottom: '#8fb6ff', accent: '#ffc93c' },
  planets: { top: '#120d2e', bottom: '#2c2465', accent: '#ffc93c' },
  seed: { top: '#c9f0b5', bottom: '#fbfff2', accent: '#3f9a3a' },
  scale: { top: '#ffe9a8', bottom: '#fffaf0', accent: '#e0a419' },
  robot: { top: '#ddd2fb', bottom: '#f7f3ff', accent: '#6a4fd9' },
  train: { top: '#bfe6ff', bottom: '#f3fbff', accent: '#e2552d' },
  shop: { top: '#c9f2e2', bottom: '#f4fffa', accent: '#13917e' },
  shapes: { top: '#cfe6ff', bottom: '#f6faff', accent: '#2f7fc4' },
  habitats: { top: '#bfe9c9', bottom: '#f3fff5', accent: '#3f9a3a' },
  plate: { top: '#ffe3cf', bottom: '#fff9f3', accent: '#ff8a4c' },
  crossing: { top: '#cfe8ff', bottom: '#f3fbff', accent: '#e2552d' },
  bread: { top: '#ffe9b8', bottom: '#fff8e8', accent: '#c97a1e' },
  tree: { top: '#c9f0b5', bottom: '#fbfff2', accent: '#3f9a3a' },
  rainbow: { top: '#bfe6ff', bottom: '#f6fbff', accent: '#9b5de5' },
  dayCycle: { top: '#3a3f8f', bottom: '#8fb6ff', accent: '#ffc93c' },
  calm: { top: '#d9f0ff', bottom: '#f5fbff', accent: '#2f7fc4' },
  teeth: { top: '#d4f5ee', bottom: '#f6fffc', accent: '#13917e' },
}

/** The title of each cartoon, per language (the app's own wording). */
export const TITLES: Record<ShortId, Record<Lang, string>> = {
  water: {
    uz: 'Yomg‘ir qayerdan keladi?',
    ru: 'Откуда берётся дождь?',
    en: 'Where does rain come from?',
  },
  magnet: { uz: 'Magnit sirlari', ru: 'Секреты магнита', en: 'Magnet secrets' },
  float: { uz: 'Nega kema suzadi?', ru: 'Почему корабль плавает?', en: 'Why do boats float?' },
  dayNight: { uz: 'Kun va tun', ru: 'День и ночь', en: 'Day and night' },
  planets: { uz: 'Quyosh oilasi', ru: 'Семья Солнца', en: 'The Sun’s family' },
  seed: { uz: 'Urug‘dan gulgacha', ru: 'Из семечка в цветок', en: 'From seed to flower' },
  scale: { uz: 'Tarozi siri', ru: 'Секрет весов', en: 'The scale’s secret' },
  robot: { uz: 'Robotga yo‘l ko‘rsat', ru: 'Покажи роботу путь', en: 'Show the robot the way' },
  train: { uz: 'So‘z poyezdi', ru: 'Поезд слов', en: 'The word train' },
  shop: { uz: 'Do‘konda tangalar', ru: 'Монетки в магазине', en: 'Coins at the shop' },
  shapes: { uz: 'Shakllar olami', ru: 'Мир фигур', en: 'A world of shapes' },
  habitats: { uz: 'Kim qayerda yashaydi?', ru: 'Кто где живёт?', en: 'Who lives where?' },
  plate: { uz: 'Sog‘lom likopcha', ru: 'Полезная тарелка', en: 'A healthy plate' },
}
