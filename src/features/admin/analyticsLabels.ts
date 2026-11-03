import type { AnalyticsEventName } from '@/domain/analytics'

/* Plain Uzbek names for the admin's analytics (Phase 37). */

export const STEP_LABELS: Record<AnalyticsEventName, string> = {
  first_opened: 'Ilovani birinchi marta ochdi',
  app_opened: 'Ilovani ochdi',
  onboarding_done: 'Bola profilini yaratdi',
  activity_opened: 'Mashqni ochdi',
  activity_finished: 'Mashqni tugatdi',
  journey_done: 'Kunlik rejani tugatdi',
  returned_day2: 'Ertasi kuni qaytdi',
  returned_day7: 'Bir haftadan keyin qaytdi',
  app_closed: 'Ilovani yopdi',
  attention_yes: 'Diqqat yordamchisiga ruxsat berdi',
  attention_no: 'Diqqat yordamchisini rad etdi',
  attention_camera: 'Kamera bilan kuzatish ishladi',
  attention_nudge: 'Robot bolani chaqirdi',
  attention_offer: 'Robot o‘yin taklif qildi',
  attention_offer_taken: 'Bola taklif qilingan o‘yinni tanladi',
}

const SCREEN_NAMES: Record<string, string> = {
  start: 'Boshlanish',
  welcome: 'Xush kelibsiz',
  'child-select': 'Bolani tanlash',
  home: 'Bosh sahifa',
  alphabet: 'Alifbo',
  tasks: 'O‘yinlar',
  learn: 'O‘rganish',
  'math-lab': 'Matematika laboratoriyasi',
  worlds: 'Dunyolar',
  stories: 'Ertaklar kutubxonasi',
  'scale-portal': 'Masshtab portali',
  'shadow-lab': 'Soya laboratoriyasi',
  'mistake-garden': 'Mashq bog‘i',
  collection: 'Kolleksiya',
  shop: 'Do‘kon',
  parent: 'Ota-ona bo‘limi',
  reward: 'Mukofot',
  exam: 'Imtihon',
  studio: 'Studiya',
  adventure: 'Sayohat',
  spaceport: 'Kosmodrom',
  'science-lab': 'Fan laboratoriyasi',
  rest: 'Dam olish',
}

/** A coarse screen in plain words, e.g. `/worlds/dino` → "Dunyolar". */
export function screenName(screen: string): string {
  const first = screen.split('/').filter(Boolean)[0] ?? 'start'
  return SCREEN_NAMES[first] ?? 'Boshqa sahifa'
}
