import type { Language } from '@/content/languages'

/** Words used only in the garden (shared ones are in learn.*). */
export interface GardenUi {
  howToPlay: string
  /** Step 1: the task again, shortly (added after the task). */
  tapOne: string
  tapEach: string
  /** Step 2: the soft hint next to a picture of the thing. */
  looksLike: string
  example: string
  /** Step 3: one wanted thing wiggles. */
  wiggling: string
  offer: string
  offerYes: string
  showMore: string
  notThis: string
  learnDone: string
  found: (found: number, total: number) => string
  board: string
}

export const GARDEN_UI: Record<Language, GardenUi> = {
  uz: {
    howToPlay: 'Qanday o‘ynaymiz?',
    tapOne: 'Uni barmog‘ing bilan bos.',
    tapEach: 'Har birini bir marta bos.',
    looksLike: 'U mana shunday ko‘rinadi. Diqqat bilan qara!',
    example: 'Masalan, mana bunday. Yana qidir!',
    wiggling: 'Qara, u sekin qimirlayapti!',
    offer: 'Yordam kerakmi?',
    offerYes: 'Ha, yordam ber',
    showMore: 'Yana ko‘rsat',
    notThis: 'Bu boshqa narsa. Yana qidir!',
    learnDone: 'Barakalla! Hammasini topding!',
    found: (found, total) => `Topildi: ${found}/${total}`,
    board: 'Bog‘',
  },
  ru: {
    howToPlay: 'Как будем играть?',
    tapOne: 'Нажми на картинку пальчиком.',
    tapEach: 'Нажми на каждую по одному разу.',
    looksLike: 'Вот как оно выглядит. Посмотри внимательно!',
    example: 'Например, вот такой. Поищи ещё!',
    wiggling: 'Смотри, вот оно шевелится!',
    offer: 'Помочь тебе?',
    offerYes: 'Да, помоги',
    showMore: 'Покажи ещё',
    notThis: 'Это что-то другое. Поищи ещё!',
    learnDone: 'Молодец! Всё найдено!',
    found: (found, total) => `Найдено: ${found} из ${total}`,
    board: 'Сад',
  },
  en: {
    howToPlay: 'How shall we play?',
    tapOne: 'Tap it with your finger.',
    tapEach: 'Tap each one once.',
    looksLike: 'It looks like this. Look carefully!',
    example: 'For example, like this one. Keep looking!',
    wiggling: 'Look, it is wiggling!',
    offer: 'Need a little help?',
    offerYes: 'Yes, please',
    showMore: 'Show me more',
    notThis: 'That’s something else. Keep looking!',
    learnDone: 'Well done! You found them all!',
    found: (found, total) => `Found: ${found} of ${total}`,
    board: 'Garden',
  },
}
