import timings from './timings.json'

export const FPS = 30
export const W = 720
export const H = 1280

export type Lang = 'uz' | 'ru' | 'en'
export type ShortId = 'water' | 'magnet' | 'float' | 'dayNight' | 'planets' | 'seed'
export const SHORT_IDS: ShortId[] = ['water', 'magnet', 'float', 'dayNight', 'planets', 'seed']
export const LANGS: Lang[] = ['uz', 'ru', 'en']

/** The voice starts this long into its scene, and the scene holds this long after it. */
export const VOICE_IN = 10
export const HOLD = 22
/** The title card before the first scene and the end card after the last. */
export const OPENING = 36
export const ENDING = 45

interface Timing {
  lines: string[]
  scenes: string[]
  durations: number[]
}

export function timing(short: ShortId, lang: Lang): Timing {
  return (timings as Record<string, Record<string, Timing>>)[short]![lang]!
}

/** Frames of one scene: its line plus the breath before and after. */
export function sceneFrames(short: ShortId, lang: Lang, index: number): number {
  return VOICE_IN + Math.ceil(timing(short, lang).durations[index]! * FPS) + HOLD
}

export function totalFrames(short: ShortId, lang: Lang): number {
  const { durations } = timing(short, lang)
  return OPENING + durations.reduce((sum, _, i) => sum + sceneFrames(short, lang, i), 0) + ENDING
}

export const voiceFile = (short: ShortId, lang: Lang, index: number) =>
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
export const THEME: Record<ShortId, { top: string; bottom: string; accent: string }> = {
  water: { top: '#8fd3ff', bottom: '#e6f6ff', accent: '#2f7fc4' },
  magnet: { top: '#ffd9c7', bottom: '#fff6ef', accent: '#e2552d' },
  float: { top: '#b8ecdf', bottom: '#f0fbf7', accent: '#13917e' },
  dayNight: { top: '#3a3f8f', bottom: '#8fb6ff', accent: '#ffc93c' },
  planets: { top: '#120d2e', bottom: '#2c2465', accent: '#ffc93c' },
  seed: { top: '#c9f0b5', bottom: '#fbfff2', accent: '#3f9a3a' },
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
}
