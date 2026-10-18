export type PromoLang = 'en' | 'ru' | 'uz'

export interface PromoCopy {
  meet: string
  letters: string
  cards: { letter: string; word: string; picture: string }[]
  grows: string
  ageLabel: (age: number) => string
  cheer: string
  quiz: string
  praise: string[]
  shop: string
  parents: string
  child: string
  subjects: [string, string, string]
  week: string
  left: string
  tagline: string
  cta: string
  languages: string
}

/** On-screen words. The voice-over says the same thing in a fuller sentence. */
export const COPY: Record<PromoLang, PromoCopy> = {
  en: {
    meet: 'Meet Kiddo',
    letters: 'Letters, numbers & first words',
    cards: [
      { letter: 'A', word: 'Apple', picture: 'red-apple' },
      { letter: 'B', word: 'Banana', picture: 'banana' },
      { letter: 'C', word: 'Cat', picture: 'cat' },
    ],
    grows: 'Grows with your child',
    ageLabel: (age) => `age ${age}`,
    cheer: 'Robots cheer every win',
    quiz: 'Which one is the apple?',
    praise: ['Great job!', 'Super!', 'Yahoo!'],
    shop: 'Earn coins. Adopt a pet.',
    parents: 'Parents see every step',
    child: 'Ali',
    subjects: ['Letters', 'Numbers', 'Words'],
    week: 'This week',
    left: 'Ali left the app at 18:42',
    tagline: 'Learning that feels like play',
    cta: 'Try it free',
    languages: 'Uzbek, Russian, English',
  },
  ru: {
    meet: 'Знакомьтесь, Kiddo',
    letters: 'Буквы, цифры и первые слова',
    cards: [
      { letter: 'А', word: 'Арбуз', picture: 'watermelon' },
      { letter: 'Б', word: 'Банан', picture: 'banana' },
      { letter: 'К', word: 'Кот', picture: 'cat' },
    ],
    grows: 'Растёт вместе с ребёнком',
    ageLabel: (age) => (age === 4 ? '4 года' : `${age} лет`),
    cheer: 'Роботы радуются каждой победе',
    quiz: 'Где яблоко?',
    praise: ['Молодец!', 'Супер!', 'Ура!'],
    shop: 'Копи монетки. Заведи питомца.',
    parents: 'Родители видят каждый шаг',
    child: 'Али',
    subjects: ['Буквы', 'Цифры', 'Слова'],
    week: 'Эта неделя',
    left: 'Али вышел из приложения в 18:42',
    tagline: 'Учёба, как игра',
    cta: 'Попробуйте бесплатно',
    languages: 'Узбекский, русский, английский',
  },
  uz: {
    meet: 'Tanishing: Kiddo',
    letters: 'Harflar, raqamlar va ilk soʻzlar',
    cards: [
      { letter: 'O', word: 'Olma', picture: 'red-apple' },
      { letter: 'B', word: 'Banan', picture: 'banana' },
      { letter: 'M', word: 'Mushuk', picture: 'cat' },
    ],
    grows: 'Farzandingiz bilan birga oʻsadi',
    ageLabel: (age) => `${age} yosh`,
    cheer: 'Har bir gʻalabani olqishlaydi',
    quiz: 'Qaysi biri olma?',
    praise: ['Barakalla!', 'Zoʻr!', 'Yashavor!'],
    shop: 'Tanga yigʻing. Uy hayvoni oling.',
    parents: 'Ota-onalar har qadamni koʻradi',
    child: 'Ali',
    subjects: ['Harflar', 'Raqamlar', 'Soʻzlar'],
    week: 'Shu hafta',
    left: 'Ali ilovadan 18:42 da chiqdi',
    tagline: 'Oʻyindek qiziqarli taʼlim',
    cta: 'Bepul sinab koʻring',
    languages: 'Oʻzbek, rus, ingliz tilida',
  },
}

/** 109.09 BPM: one beat is 0.55 s, one bar 2.2 s, and every scene is two bars. */
export const BEAT = 0.55
export const BAR = BEAT * 4
export const DURATION = 30

export const SCENES = [
  { id: 'logo', start: 0 },
  { id: 'letters', start: 2 * BAR },
  { id: 'ages', start: 4 * BAR },
  { id: 'cheer', start: 6 * BAR },
  { id: 'shop', start: 8 * BAR },
  { id: 'parents', start: 10 * BAR },
  { id: 'cta', start: 12 * BAR },
] as const
