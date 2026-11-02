import type { Language } from '@/content/languages'

/*
 * «Uch tilli so‘z» (Phase 49): one picture and its word in Uzbek, Russian
 * and English. The words are the ones Kiddo already teaches (the alphabets in
 * src/content/alphabet and «Birinchi so‘zim» in firstWords/content.ts), written
 * exactly as there – Uzbek with the alphabet's ʻ (U+02BB) – so most of them are
 * recorded already. A few everyday words fill the list up to 30.
 * Each word is spoken as written here (small letters), in its own language.
 */

export interface TriWord {
  id: string
  /** public/3d/<picture>.webp */
  picture: string
  words: Record<Language, string>
}

const word = (id: string, uz: string, ru: string, en: string, picture = id): TriWord => ({
  id,
  picture,
  words: { uz, ru, en },
})

export const TRI_WORDS: readonly TriWord[] = [
  word('apple', 'olma', 'яблоко', 'apple'),
  word('cat', 'mushuk', 'кот', 'cat'),
  word('dog', 'it', 'собака', 'dog'),
  word('fish', 'baliq', 'рыба', 'fish'),
  word('duck', 'oʻrdak', 'утка', 'duck'),
  word('egg', 'tuxum', 'яйцо', 'egg'),
  word('key', 'kalit', 'ключ', 'key'),
  word('fox', 'tulki', 'лиса', 'fox'),
  word('lemon', 'limon', 'лимон', 'lemon'),
  word('rabbit', 'quyon', 'заяц', 'rabbit'),
  word('lion', 'sher', 'лев', 'lion'),
  word('goat', 'echki', 'коза', 'goat'),
  word('ball', 'toʻp', 'мяч', 'ball'),
  word('grapes', 'uzum', 'виноград', 'grapes'),
  word('sun', 'quyosh', 'солнце', 'sun'),
  word('elephant', 'fil', 'слон', 'elephant'),
  word('bee', 'ari', 'пчела', 'bee'),
  word('banana', 'banan', 'банан', 'banana'),
  word('zebra', 'zebra', 'зебра', 'zebra'),
  word('house', 'uy', 'дом', 'house'),
  word('milk', 'sut', 'молоко', 'milk'),
  word('whale', 'kit', 'кит', 'whale'),
  word('bread', 'non', 'хлеб', 'bread'),
  word('horse', 'ot', 'конь', 'horse'),
  word('tree', 'daraxt', 'дерево', 'tree'),
  word('rocket', 'raketa', 'ракета', 'rocket'),
  word('umbrella', 'soyabon', 'зонт', 'umbrella'),
  word('monkey', 'maymun', 'обезьяна', 'monkey'),
  word('tiger', 'yoʻlbars', 'тигр', 'tiger'),
  word('star', 'yulduz', 'звезда', 'star'),
]

/** The order the three words are shown in, whatever the child's language. */
export const TRI_LANGUAGES: readonly Language[] = ['uz', 'ru', 'en']

/** How a word is written on its card: a capital first letter. */
export function displayWord(text: string, language: Language): string {
  return text.charAt(0).toLocaleUpperCase(language) + text.slice(1)
}
