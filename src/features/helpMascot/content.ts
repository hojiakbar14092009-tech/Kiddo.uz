import type { Language } from '@/content/languages'

/*
 * «Maskotga yordam ber» material, written for each language on its own.
 * Words are spelled with the letters of Kiddo's alphabet for that language
 * (Uzbek Sh, Ch, Ng, Oʻ, Gʻ are one letter each). Every picture is a file in
 * public/3d.
 */

export type FindGroup = 'fruit' | 'animal' | 'thing'

/** Age 4: something the mascot asks the child to find. */
export interface FindItem {
  id: string
  picture: string
  group: FindGroup
  /** What it is called (“olma”). */
  name: string
  /** The mascot's request (“Menga olmani topib ber!”). */
  ask: string
}

/** A word with its picture, for letters and spelling. */
export interface HelpWord {
  id: string
  letters: readonly string[]
  picture: string
}

export interface HelpMaterial {
  find: readonly FindItem[]
  words: readonly HelpWord[]
}

const f = (id: string, picture: string, group: FindGroup, name: string, ask: string): FindItem => ({
  id,
  picture,
  group,
  name,
  ask,
})

const w = (id: string, letters: string, picture: string): HelpWord => ({
  id,
  letters: letters.split(' '),
  picture,
})

export const MATERIAL: Record<Language, HelpMaterial> = {
  uz: {
    find: [
      f('apple', 'apple', 'fruit', 'olma', 'Menga olmani topib ber!'),
      f('banana', 'banana', 'fruit', 'banan', 'Menga bananni topib ber!'),
      f('pear', 'pear', 'fruit', 'nok', 'Menga nokni topib ber!'),
      f('strawberry', 'strawberry', 'fruit', 'qulupnay', 'Menga qulupnayni topib ber!'),
      f('grapes', 'grapes', 'fruit', 'uzum', 'Menga uzumni topib ber!'),
      f('cat', 'cat', 'animal', 'mushuk', 'Menga mushukni topib ber!'),
      f('dog', 'dog', 'animal', 'kuchukcha', 'Menga kuchukchani topib ber!'),
      f('fish', 'fish', 'animal', 'baliq', 'Menga baliqni topib ber!'),
      f('rabbit', 'rabbit', 'animal', 'quyon', 'Menga quyonni topib ber!'),
      f('duck', 'duck', 'animal', 'o‘rdak', 'Menga o‘rdakni topib ber!'),
      f('ball', 'ball', 'thing', 'to‘p', 'Menga to‘pni topib ber!'),
      f('car', 'car', 'thing', 'mashina', 'Menga mashinani topib ber!'),
      f('key', 'key', 'thing', 'kalit', 'Menga kalitni topib ber!'),
      f('umbrella', 'umbrella', 'thing', 'soyabon', 'Menga soyabonni topib ber!'),
      f('book', 'book', 'thing', 'kitob', 'Menga kitobni topib ber!'),
    ],
    words: [
      w('olma', 'O L M A', 'apple'),
      w('baliq', 'B A L I Q', 'fish'),
      w('mushuk', 'M U Sh U K', 'cat'),
      w('non', 'N O N', 'bread'),
      w('kalit', 'K A L I T', 'key'),
      w('tulki', 'T U L K I', 'fox'),
      w('quyon', 'Q U Y O N', 'rabbit'),
      w('sabzi', 'S A B Z I', 'carrot'),
      w('uzum', 'U Z U M', 'grapes'),
      w('limon', 'L I M O N', 'lemon'),
      w('sher', 'Sh E R', 'lion'),
      w('choy', 'Ch O Y', 'cup'),
      w('fil', 'F I L', 'elephant'),
      w('echki', 'E Ch K I', 'goat'),
    ],
  },
  ru: {
    find: [
      f('apple', 'apple', 'fruit', 'яблоко', 'Найди мне яблоко!'),
      f('banana', 'banana', 'fruit', 'банан', 'Найди мне банан!'),
      f('pear', 'pear', 'fruit', 'груша', 'Найди мне грушу!'),
      f('strawberry', 'strawberry', 'fruit', 'клубника', 'Найди мне клубнику!'),
      f('grapes', 'grapes', 'fruit', 'виноград', 'Найди мне виноград!'),
      f('cat', 'cat', 'animal', 'кошка', 'Найди мне кошку!'),
      f('dog', 'dog', 'animal', 'собака', 'Найди мне собаку!'),
      f('fish', 'fish', 'animal', 'рыба', 'Найди мне рыбу!'),
      f('rabbit', 'rabbit', 'animal', 'заяц', 'Найди мне зайца!'),
      f('duck', 'duck', 'animal', 'утка', 'Найди мне утку!'),
      f('ball', 'ball', 'thing', 'мяч', 'Найди мне мяч!'),
      f('car', 'car', 'thing', 'машина', 'Найди мне машину!'),
      f('key', 'key', 'thing', 'ключ', 'Найди мне ключ!'),
      f('umbrella', 'umbrella', 'thing', 'зонт', 'Найди мне зонт!'),
      f('book', 'book', 'thing', 'книга', 'Найди мне книгу!'),
    ],
    words: [
      w('kot', 'К О Т', 'cat'),
      w('dom', 'Д О М', 'house'),
      w('ryba', 'Р Ы Б А', 'fish'),
      w('luna', 'Л У Н А', 'crescent-moon'),
      w('sova', 'С О В А', 'owl'),
      w('utka', 'У Т К А', 'duck'),
      w('lisa', 'Л И С А', 'fox'),
      w('koza', 'К О З А', 'goat'),
      w('roza', 'Р О З А', 'rose'),
      w('slon', 'С Л О Н', 'elephant'),
      w('banan', 'Б А Н А Н', 'banana'),
      w('limon', 'Л И М О Н', 'lemon'),
      w('zhuk', 'Ж У К', 'beetle'),
      w('grib', 'Г Р И Б', 'mushroom'),
    ],
  },
  en: {
    find: [
      f('apple', 'apple', 'fruit', 'apple', 'Find me the apple!'),
      f('banana', 'banana', 'fruit', 'banana', 'Find me the banana!'),
      f('pear', 'pear', 'fruit', 'pear', 'Find me the pear!'),
      f('strawberry', 'strawberry', 'fruit', 'strawberry', 'Find me the strawberry!'),
      f('grapes', 'grapes', 'fruit', 'grapes', 'Find me the grapes!'),
      f('cat', 'cat', 'animal', 'cat', 'Find me the cat!'),
      f('dog', 'dog', 'animal', 'dog', 'Find me the dog!'),
      f('fish', 'fish', 'animal', 'fish', 'Find me the fish!'),
      f('rabbit', 'rabbit', 'animal', 'rabbit', 'Find me the rabbit!'),
      f('duck', 'duck', 'animal', 'duck', 'Find me the duck!'),
      f('ball', 'ball', 'thing', 'ball', 'Find me the ball!'),
      f('car', 'car', 'thing', 'car', 'Find me the car!'),
      f('key', 'key', 'thing', 'key', 'Find me the key!'),
      f('umbrella', 'umbrella', 'thing', 'umbrella', 'Find me the umbrella!'),
      f('book', 'book', 'thing', 'book', 'Find me the book!'),
    ],
    words: [
      w('cat', 'C A T', 'cat'),
      w('dog', 'D O G', 'dog'),
      w('sun', 'S U N', 'sun'),
      w('bus', 'B U S', 'bus'),
      w('pig', 'P I G', 'pig'),
      w('fox', 'F O X', 'fox'),
      w('hen', 'H E N', 'chicken'),
      w('bed', 'B E D', 'bed'),
      w('cup', 'C U P', 'cup'),
      w('box', 'B O X', 'box'),
      w('fish', 'F I S H', 'fish'),
      w('duck', 'D U C K', 'duck'),
      w('frog', 'F R O G', 'frog'),
      w('milk', 'M I L K', 'milk'),
    ],
  },
}

/** A word as it is written for reading: “Mushuk”, “Кот”, “Cat”. */
export function spell(letters: readonly string[], language: Language): string {
  const text = letters.join('').toLocaleLowerCase(language)
  return text.charAt(0).toLocaleUpperCase(language) + text.slice(1)
}

/** Pictures used to show a sum (counted one by one). */
export const COUNTERS = ['apple', 'star', 'strawberry', 'ball', 'balloon', 'cookie'] as const
