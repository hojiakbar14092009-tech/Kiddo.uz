import type { Language } from '@/content/languages'

/*
 * «Birinchi so‘zim» material, written separately for each language (never a
 * translation of another). A word is spelled in the letters of that
 * language's alphabet in Kiddo: in Uzbek Sh, Ch, Ng, Oʻ and Gʻ are single
 * letters (as in src/content/alphabet/uz.ts). Every word has a 3D picture.
 */

export interface Word {
  /** Stable id, also the review item id. */
  id: string
  /** The word as letters of the alphabet, in their capital form (e.g. ['M','U','Sh','U','K']). */
  letters: readonly string[]
  /** public/3d/<picture>.webp */
  picture: string
}

export interface Sentence {
  id: string
  text: string
  /** The word that names who or what it is about (shown by the help). */
  focus: string
  /** The picture it describes. */
  picture: string
}

export interface LanguageMaterial {
  /** Words for the first-sound game (age 4): their first letter is clear to hear and see. */
  initial: readonly Word[]
  /** Short words to build from letters (age 5). */
  build: readonly Word[]
  /** Words to read and match to a picture, and to fill a missing letter (age 6). */
  read: readonly Word[]
  /** Simple sentences to read and match to a picture (age 6). */
  sentences: readonly Sentence[]
}

const w = (id: string, letters: string, picture: string): Word => ({
  id,
  letters: letters.split(' '),
  picture,
})

export const MATERIAL: Record<Language, LanguageMaterial> = {
  uz: {
    initial: [
      w('olma', 'O L M A', 'apple'),
      w('mushuk', 'M U Sh U K', 'cat'),
      w('baliq', 'B A L I Q', 'fish'),
      w('sut', 'S U T', 'milk'),
      w('non', 'N O N', 'bread'),
      w('kalit', 'K A L I T', 'key'),
      w('tulki', 'T U L K I', 'fox'),
      w('ari', 'A R I', 'bee'),
      w('uy', 'U Y', 'house'),
      w('fil', 'F I L', 'elephant'),
      w('quyon', 'Q U Y O N', 'rabbit'),
      w('sher', 'Sh E R', 'lion'),
      w('choy', 'Ch O Y', 'cup'),
      w('oʻrdak', 'Oʻ R D A K', 'duck'),
      w('daraxt', 'D A R A X T', 'tree'),
      w('gul', 'G U L', 'tulip'),
      w('zebra', 'Z E B R A', 'zebra'),
      w('echki', 'E Ch K I', 'goat'),
      w('limon', 'L I M O N', 'lemon'),
      w('it', 'I T', 'dog'),
    ],
    build: [
      w('ot', 'O T', 'horse'),
      w('oy', 'O Y', 'crescent-moon'),
      w('uy', 'U Y', 'house'),
      w('it', 'I T', 'dog'),
      w('ari', 'A R I', 'bee'),
      w('non', 'N O N', 'bread'),
      w('sut', 'S U T', 'milk'),
      w('gul', 'G U L', 'tulip'),
      w('kit', 'K I T', 'whale'),
      w('nok', 'N O K', 'pear'),
      w('fil', 'F I L', 'elephant'),
      w('toʻp', 'T Oʻ P', 'ball'),
      w('qush', 'Q U Sh', 'bird'),
      w('choy', 'Ch O Y', 'cup'),
      w('sher', 'Sh E R', 'lion'),
    ],
    read: [
      w('olma', 'O L M A', 'apple'),
      w('baliq', 'B A L I Q', 'fish'),
      w('mushuk', 'M U Sh U K', 'cat'),
      w('quyosh', 'Q U Y O Sh', 'sun'),
      w('tuxum', 'T U X U M', 'egg'),
      w('kalit', 'K A L I T', 'key'),
      w('sabzi', 'S A B Z I', 'carrot'),
      w('uzum', 'U Z U M', 'grapes'),
      w('tulki', 'T U L K I', 'fox'),
      w('ayiq', 'A Y I Q', 'bear'),
      w('quyon', 'Q U Y O N', 'rabbit'),
      w('bodring', 'B O D R I Ng', 'cucumber'),
      w('kapalak', 'K A P A L A K', 'butterfly'),
      w('chumoli', 'Ch U M O L I', 'ant'),
      w('oʻrdak', 'Oʻ R D A K', 'duck'),
    ],
    sentences: [
      { id: 'uz-s1', text: 'Mushuk uxlayapti.', focus: 'Mushuk', picture: 'cat' },
      { id: 'uz-s2', text: 'Bu qizil olma.', focus: 'olma', picture: 'apple' },
      { id: 'uz-s3', text: 'Quyosh porlayapti.', focus: 'Quyosh', picture: 'sun' },
      { id: 'uz-s4', text: 'Baliq suzmoqda.', focus: 'Baliq', picture: 'fish' },
      { id: 'uz-s5', text: 'Ari gulga qoʻndi.', focus: 'Ari', picture: 'bee' },
      { id: 'uz-s6', text: 'Kuchukcha yuguryapti.', focus: 'Kuchukcha', picture: 'dog' },
      { id: 'uz-s7', text: 'Oʻrdak suvda.', focus: 'Oʻrdak', picture: 'duck' },
      { id: 'uz-s8', text: 'Quyon sabzi yeydi.', focus: 'Quyon', picture: 'rabbit' },
    ],
  },
  ru: {
    initial: [
      w('kot', 'К О Т', 'cat'),
      w('dom', 'Д О М', 'house'),
      w('ryba', 'Р Ы Б А', 'fish'),
      w('luna', 'Л У Н А', 'crescent-moon'),
      w('sova', 'С О В А', 'owl'),
      w('utka', 'У Т К А', 'duck'),
      w('mysh', 'М Ы Ш Ь', 'mouse'),
      w('arbuz', 'А Р Б У З', 'watermelon'),
      w('banan', 'Б А Н А Н', 'banana'),
      w('zhuk', 'Ж У К', 'beetle'),
      w('pchela', 'П Ч Е Л А', 'bee'),
      w('grusha', 'Г Р У Ш А', 'pear'),
      w('koza', 'К О З А', 'goat'),
      w('lisa', 'Л И С А', 'fox'),
      w('volk', 'В О Л К', 'wolf'),
      w('tigr', 'Т И Г Р', 'tiger'),
      w('shar', 'Ш А Р', 'balloon'),
      w('syr', 'С Ы Р', 'cheese'),
      w('noski', 'Н О С К И', 'socks'),
    ],
    build: [
      w('kot', 'К О Т', 'cat'),
      w('dom', 'Д О М', 'house'),
      w('syr', 'С Ы Р', 'cheese'),
      w('zhuk', 'Ж У К', 'beetle'),
      w('luk', 'Л У К', 'onion'),
      w('kit', 'К И Т', 'whale'),
      w('lev', 'Л Е В', 'lion'),
      w('shar', 'Ш А Р', 'balloon'),
      w('myach', 'М Я Ч', 'ball'),
      w('rak', 'Р А К', 'crab'),
    ],
    read: [
      w('ryba', 'Р Ы Б А', 'fish'),
      w('luna', 'Л У Н А', 'crescent-moon'),
      w('sova', 'С О В А', 'owl'),
      w('utka', 'У Т К А', 'duck'),
      w('lisa', 'Л И С А', 'fox'),
      w('koza', 'К О З А', 'goat'),
      w('roza', 'Р О З А', 'rose'),
      w('grib', 'Г Р И Б', 'mushroom'),
      w('hleb', 'Х Л Е Б', 'bread'),
      w('slon', 'С Л О Н', 'elephant'),
      w('klyuch', 'К Л Ю Ч', 'key'),
      w('yaitso', 'Я Й Ц О', 'egg'),
      w('raketa', 'Р А К Е Т А', 'rocket'),
      w('mashina', 'М А Ш И Н А', 'car'),
      w('zont', 'З О Н Т', 'umbrella'),
    ],
    sentences: [
      { id: 'ru-s1', text: 'Кот спит.', focus: 'Кот', picture: 'cat' },
      { id: 'ru-s2', text: 'Рыба плывёт.', focus: 'Рыба', picture: 'fish' },
      { id: 'ru-s3', text: 'Вот красное яблоко.', focus: 'яблоко', picture: 'apple' },
      { id: 'ru-s4', text: 'Солнце светит.', focus: 'Солнце', picture: 'sun' },
      { id: 'ru-s5', text: 'Утка в воде.', focus: 'Утка', picture: 'duck' },
      { id: 'ru-s6', text: 'Пчела на цветке.', focus: 'Пчела', picture: 'bee' },
      { id: 'ru-s7', text: 'Заяц ест морковь.', focus: 'Заяц', picture: 'rabbit' },
      { id: 'ru-s8', text: 'Собака бежит.', focus: 'Собака', picture: 'dog' },
    ],
  },
  en: {
    initial: [
      w('cat', 'C A T', 'cat'),
      w('dog', 'D O G', 'dog'),
      w('sun', 'S U N', 'sun'),
      w('bus', 'B U S', 'bus'),
      w('pig', 'P I G', 'pig'),
      w('fox', 'F O X', 'fox'),
      w('hen', 'H E N', 'chicken'),
      w('milk', 'M I L K', 'milk'),
      w('apple', 'A P P L E', 'apple'),
      w('egg', 'E G G', 'egg'),
      w('key', 'K E Y', 'key'),
      w('lemon', 'L E M O N', 'lemon'),
      w('rabbit', 'R A B B I T', 'rabbit'),
      w('tiger', 'T I G E R', 'tiger'),
      w('goat', 'G O A T', 'goat'),
      w('nest', 'N E S T', 'nest'),
      w('wolf', 'W O L F', 'wolf'),
      w('zebra', 'Z E B R A', 'zebra'),
      w('violin', 'V I O L I N', 'violin'),
    ],
    build: [
      w('cat', 'C A T', 'cat'),
      w('dog', 'D O G', 'dog'),
      w('sun', 'S U N', 'sun'),
      w('bus', 'B U S', 'bus'),
      w('hat', 'H A T', 'hat'),
      w('pig', 'P I G', 'pig'),
      w('fox', 'F O X', 'fox'),
      w('bed', 'B E D', 'bed'),
      w('cup', 'C U P', 'cup'),
      w('box', 'B O X', 'box'),
      w('hen', 'H E N', 'chicken'),
      w('bat', 'B A T', 'bat'),
      w('ant', 'A N T', 'ant'),
    ],
    read: [
      w('fish', 'F I S H', 'fish'),
      w('duck', 'D U C K', 'duck'),
      w('frog', 'F R O G', 'frog'),
      w('milk', 'M I L K', 'milk'),
      w('egg', 'E G G', 'egg'),
      w('crab', 'C R A B', 'crab'),
      w('nest', 'N E S T', 'nest'),
      w('drum', 'D R U M', 'drum'),
      w('tent', 'T E N T', 'tent'),
      w('cat', 'C A T', 'cat'),
      w('dog', 'D O G', 'dog'),
      w('pig', 'P I G', 'pig'),
      w('fox', 'F O X', 'fox'),
      w('sun', 'S U N', 'sun'),
      w('bus', 'B U S', 'bus'),
    ],
    sentences: [
      { id: 'en-s1', text: 'The cat is on the bed.', focus: 'cat', picture: 'cat' },
      { id: 'en-s2', text: 'A fox is in a box.', focus: 'fox', picture: 'fox' },
      { id: 'en-s3', text: 'The sun is hot.', focus: 'sun', picture: 'sun' },
      { id: 'en-s4', text: 'A pig is in the mud.', focus: 'pig', picture: 'pig' },
      { id: 'en-s5', text: 'The dog can run.', focus: 'dog', picture: 'dog' },
      { id: 'en-s6', text: 'A duck can swim.', focus: 'duck', picture: 'duck' },
      { id: 'en-s7', text: 'The frog can hop.', focus: 'frog', picture: 'frog' },
      { id: 'en-s8', text: 'A red bus stops.', focus: 'bus', picture: 'bus' },
    ],
  },
}

export function wordText(word: Word): string {
  return word.letters.join('')
}

/** How a word is written for reading: capital first letter, the rest small. */
export function wordDisplay(word: Word, language: Language): string {
  const text = wordText(word).toLocaleLowerCase(language)
  return text.charAt(0).toLocaleUpperCase(language) + text.slice(1)
}
