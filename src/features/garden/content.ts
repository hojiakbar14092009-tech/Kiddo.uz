import type { Language } from '@/content/languages'

/*
 * Things in the garden and how to name them in each language. A find task
 * needs the accusative in Uzbek and Russian, and counting needs the Russian
 * genitive and gender ("два яблока", "две груши"); counting is only asked
 * about things (not animals), where the Russian forms stay simple.
 */

export type Category = 'flower' | 'fruit' | 'vegetable'
type Gender = 'm' | 'f' | 'n'

export interface GardenItem {
  asset: string
  /** A living creature ("Where is …?" is asked about these). */
  animal?: boolean
  category?: Category
  uz: { nom: string; acc: string }
  ru: { nom: string; acc: string; gen: string; gender: Gender }
  en: { one: string; many: string }
}

export const GARDEN_ITEMS: readonly GardenItem[] = [
  {
    asset: 'apple',
    category: 'fruit',
    uz: { nom: 'Olma', acc: 'olmani' },
    ru: { nom: 'яблоко', acc: 'яблоко', gen: 'яблока', gender: 'n' },
    en: { one: 'apple', many: 'apples' },
  },
  {
    asset: 'pear',
    category: 'fruit',
    uz: { nom: 'Nok', acc: 'nokni' },
    ru: { nom: 'груша', acc: 'грушу', gen: 'груши', gender: 'f' },
    en: { one: 'pear', many: 'pears' },
  },
  {
    asset: 'peach',
    category: 'fruit',
    uz: { nom: 'Shaftoli', acc: 'shaftolini' },
    ru: { nom: 'персик', acc: 'персик', gen: 'персика', gender: 'm' },
    en: { one: 'peach', many: 'peaches' },
  },
  {
    asset: 'tangerine',
    category: 'fruit',
    uz: { nom: 'Mandarin', acc: 'mandarinni' },
    ru: { nom: 'мандарин', acc: 'мандарин', gen: 'мандарина', gender: 'm' },
    en: { one: 'tangerine', many: 'tangerines' },
  },
  {
    asset: 'tulip',
    category: 'flower',
    uz: { nom: 'Lola', acc: 'lolani' },
    ru: { nom: 'тюльпан', acc: 'тюльпан', gen: 'тюльпана', gender: 'm' },
    en: { one: 'tulip', many: 'tulips' },
  },
  {
    asset: 'rose',
    category: 'flower',
    uz: { nom: 'Atirgul', acc: 'atirgulni' },
    ru: { nom: 'роза', acc: 'розу', gen: 'розы', gender: 'f' },
    en: { one: 'rose', many: 'roses' },
  },
  {
    asset: 'sunflower',
    category: 'flower',
    uz: { nom: 'Kungaboqar', acc: 'kungaboqarni' },
    ru: { nom: 'подсолнух', acc: 'подсолнух', gen: 'подсолнуха', gender: 'm' },
    en: { one: 'sunflower', many: 'sunflowers' },
  },
  {
    asset: 'carrot',
    category: 'vegetable',
    uz: { nom: 'Sabzi', acc: 'sabzini' },
    ru: { nom: 'морковка', acc: 'морковку', gen: 'морковки', gender: 'f' },
    en: { one: 'carrot', many: 'carrots' },
  },
  {
    asset: 'tomato',
    category: 'vegetable',
    uz: { nom: 'Pomidor', acc: 'pomidorni' },
    ru: { nom: 'помидор', acc: 'помидор', gen: 'помидора', gender: 'm' },
    en: { one: 'tomato', many: 'tomatoes' },
  },
  {
    asset: 'cucumber',
    category: 'vegetable',
    uz: { nom: 'Bodring', acc: 'bodringni' },
    ru: { nom: 'огурец', acc: 'огурец', gen: 'огурца', gender: 'm' },
    en: { one: 'cucumber', many: 'cucumbers' },
  },
  {
    asset: 'potato',
    category: 'vegetable',
    uz: { nom: 'Kartoshka', acc: 'kartoshkani' },
    ru: { nom: 'картошка', acc: 'картошку', gen: 'картошки', gender: 'f' },
    en: { one: 'potato', many: 'potatoes' },
  },
  {
    asset: 'mushroom',
    uz: { nom: 'Qo‘ziqorin', acc: 'qo‘ziqorinni' },
    ru: { nom: 'гриб', acc: 'гриб', gen: 'гриба', gender: 'm' },
    en: { one: 'mushroom', many: 'mushrooms' },
  },
  {
    asset: 'strawberry',
    uz: { nom: 'Qulupnay', acc: 'qulupnayni' },
    ru: { nom: 'клубника', acc: 'клубнику', gen: 'клубники', gender: 'f' },
    en: { one: 'strawberry', many: 'strawberries' },
  },
  {
    asset: 'basket',
    uz: { nom: 'Savat', acc: 'savatni' },
    ru: { nom: 'корзинка', acc: 'корзинку', gen: 'корзинки', gender: 'f' },
    en: { one: 'basket', many: 'baskets' },
  },
  {
    asset: 'bucket',
    uz: { nom: 'Chelak', acc: 'chelakni' },
    ru: { nom: 'ведёрко', acc: 'ведёрко', gen: 'ведёрка', gender: 'n' },
    en: { one: 'bucket', many: 'buckets' },
  },
  {
    asset: 'butterfly',
    animal: true,
    uz: { nom: 'Kapalak', acc: 'kapalakni' },
    ru: { nom: 'бабочка', acc: 'бабочку', gen: 'бабочки', gender: 'f' },
    en: { one: 'butterfly', many: 'butterflies' },
  },
  {
    asset: 'ladybug',
    animal: true,
    uz: { nom: 'Xonqizi', acc: 'xonqizini' },
    ru: { nom: 'божья коровка', acc: 'божью коровку', gen: 'божьей коровки', gender: 'f' },
    en: { one: 'ladybug', many: 'ladybugs' },
  },
  {
    asset: 'bee',
    animal: true,
    uz: { nom: 'Ari', acc: 'arini' },
    ru: { nom: 'пчела', acc: 'пчелу', gen: 'пчелы', gender: 'f' },
    en: { one: 'bee', many: 'bees' },
  },
  {
    asset: 'snail',
    animal: true,
    uz: { nom: 'Shilliqqurt', acc: 'shilliqqurtni' },
    ru: { nom: 'улитка', acc: 'улитку', gen: 'улитки', gender: 'f' },
    en: { one: 'snail', many: 'snails' },
  },
  {
    asset: 'frog',
    animal: true,
    uz: { nom: 'Qurbaqa', acc: 'qurbaqani' },
    ru: { nom: 'лягушка', acc: 'лягушку', gen: 'лягушки', gender: 'f' },
    en: { one: 'frog', many: 'frogs' },
  },
  {
    asset: 'hedgehog',
    animal: true,
    uz: { nom: 'Tipratikan', acc: 'tipratikanni' },
    ru: { nom: 'ёжик', acc: 'ёжика', gen: 'ёжика', gender: 'm' },
    en: { one: 'hedgehog', many: 'hedgehogs' },
  },
  {
    asset: 'bird',
    animal: true,
    uz: { nom: 'Qushcha', acc: 'qushchani' },
    ru: { nom: 'птичка', acc: 'птичку', gen: 'птички', gender: 'f' },
    en: { one: 'bird', many: 'birds' },
  },
]

export const CATEGORY_WORDS: Record<Category, { uz: string; ru: string; en: string }> = {
  flower: { uz: 'gulni', ru: 'цветка', en: 'flowers' },
  fruit: { uz: 'mevani', ru: 'фрукта', en: 'fruits' },
  vegetable: { uz: 'sabzavotni', ru: 'овоща', en: 'vegetables' },
}

const UZ_NUMBERS: Record<number, string> = { 2: 'Ikkita', 3: 'Uchta' }
const EN_NUMBERS: Record<number, string> = { 2: 'two', 3: 'three' }
function ruNumber(count: number, gender: Gender): string {
  if (count === 2) return gender === 'f' ? 'две' : 'два'
  return 'три'
}

export function itemByAsset(asset: string): GardenItem {
  const item = GARDEN_ITEMS.find((candidate) => candidate.asset === asset)
  if (!item) throw new Error(`unknown garden item ${asset}`)
  return item
}

/** The name of a thing (for its button). */
export function itemName(asset: string, language: Language): string {
  const item = itemByAsset(asset)
  if (language === 'uz') return item.uz.nom
  if (language === 'ru') return item.ru.nom[0]!.toUpperCase() + item.ru.nom.slice(1)
  return item.en.one[0]!.toUpperCase() + item.en.one.slice(1)
}

export type GardenTaskKind = 'find' | 'where' | 'count' | 'category'

export interface GardenTask {
  id: string
  kind: GardenTaskKind
  /** Review groups tasks by what they practise. */
  skill: string
  /** find / where / count: the thing; category: an example of the group. */
  target: string
  category?: Category
  /** How many to find (1 for find and where). */
  count: number
}

/** What the mascot asks, e.g. «Olmani top!», «Kapalak qayerda?», «Ikkita gulni top!». */
export function taskPrompt(task: GardenTask, language: Language): string {
  if (task.kind === 'category') {
    const word = CATEGORY_WORDS[task.category!]
    if (language === 'uz') return `${UZ_NUMBERS[task.count]} ${word.uz} top!`
    if (language === 'ru') return `Найди ${ruNumber(task.count, 'm')} ${word.ru}!`
    return `Find ${EN_NUMBERS[task.count]} ${word.en}!`
  }
  const item = itemByAsset(task.target)
  if (task.kind === 'where') {
    if (language === 'uz') return `${item.uz.nom} qayerda?`
    if (language === 'ru') return `Где ${item.ru.nom}?`
    return `Where is the ${item.en.one}?`
  }
  if (task.kind === 'count') {
    if (language === 'uz') return `${UZ_NUMBERS[task.count]} ${item.uz.acc} top!`
    if (language === 'ru') return `Найди ${ruNumber(task.count, item.ru.gender)} ${item.ru.gen}!`
    return `Find ${EN_NUMBERS[task.count]} ${item.en.many}!`
  }
  const acc = item.uz.acc
  if (language === 'uz') return `${acc[0]!.toUpperCase()}${acc.slice(1)} top!`
  if (language === 'ru') return `Найди ${item.ru.acc}!`
  return `Find the ${item.en.one}!`
}
