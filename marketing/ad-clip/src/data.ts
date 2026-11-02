import script from './script.json'

export type Lang = 'uz' | 'ru' | 'en'
export type Hook = 'a' | 'b' | 'c'
export type SceneId = 'hook' | 'turn' | 'letter' | 'plan' | 'nuts' | 'parent' | 'cta'

export const FPS = 30

/** Kiddo's own colours (the app's theme), so the ad looks like the product. */
export const C = {
  cream: '#fff8ec',
  paper: '#fffdf8',
  ink: '#1d2550',
  inkSoft: '#4a5378',
  blue: '#2f5fe0',
  blueDeep: '#1d47cc',
  teal: '#13917e',
  gold: '#ffc93c',
  orange: '#ff7e29',
  night: '#121935',
}

export const ORDER: SceneId[] = ['hook', 'turn', 'letter', 'plan', 'nuts', 'parent', 'cta']

const lines = script.lines as Record<Lang, Record<string, string>>
const durations = script.durations as Record<string, number>

const voiceKey = (scene: SceneId, hook: Hook) => (scene === 'hook' ? `hook-${hook}` : scene)

export const lineOf = (lang: Lang, scene: SceneId, hook: Hook) => lines[lang][voiceKey(scene, hook)]

export const voiceFile = (lang: Lang, scene: SceneId, hook: Hook) =>
  `vo/${lang}-${voiceKey(scene, hook)}.wav`

/** The voice starts this late in every scene (a beat for the picture to land). */
export const VOICE_IN = 6

/** Seconds of voice per scene. */
export const voiceSeconds = (lang: Lang, scene: SceneId, hook: Hook) =>
  durations[`${lang}-${voiceKey(scene, hook)}`]

/** Scene length: the voice, a short breath after it, and a held end card. */
export const sceneFrames = (lang: Lang, scene: SceneId, hook: Hook) => {
  const tail = scene === 'hook' ? 0.3 : scene === 'cta' ? 2.4 : 0.5
  return VOICE_IN + Math.ceil((voiceSeconds(lang, scene, hook) + tail) * FPS)
}

export const totalFrames = (lang: Lang, hook: Hook) =>
  ORDER.reduce((sum, scene) => sum + sceneFrames(lang, scene, hook), 0)

export const CTA: Record<Lang, { button: string; age: string }> = {
  uz: { button: 'Bepul boshlang', age: '4–7 yoshli bolalar uchun' },
  ru: { button: 'Начать бесплатно', age: 'Для детей 4–7 лет' },
  en: { button: 'Start free', age: 'For children aged 4–7' },
}
