import type { Language } from '@/content/languages'
import { bridge, type Fact, type MathObject, type StageId } from './generators'

/*
 * Every word of the Matematika section in Uzbek, Russian and English,
 * written separately for each language (not translated word for word).
 * Sentences that can be read aloud are listed in spoken.ts from these
 * same functions, so the screen and the recordings always match.
 */

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/* ---------- objects ---------- */

type RuGender = 'm' | 'f' | 'n'

interface ObjectWords {
  uz: { noun: string; dative: string }
  /** nominative singular, genitive singular, genitive plural */
  ru: { gender: RuGender; forms: readonly [string, string, string] }
  en: { one: string; many: string }
}

const WORDS: Record<MathObject, ObjectWords> = {
  apple: {
    uz: { noun: 'olma', dative: 'olmaga' },
    ru: { gender: 'n', forms: ['яблоко', 'яблока', 'яблок'] },
    en: { one: 'apple', many: 'apples' },
  },
  pear: {
    uz: { noun: 'nok', dative: 'nokka' },
    ru: { gender: 'f', forms: ['груша', 'груши', 'груш'] },
    en: { one: 'pear', many: 'pears' },
  },
  strawberry: {
    uz: { noun: 'qulupnay', dative: 'qulupnayga' },
    ru: { gender: 'f', forms: ['клубничка', 'клубнички', 'клубничек'] },
    en: { one: 'strawberry', many: 'strawberries' },
  },
  tangerine: {
    uz: { noun: 'mandarin', dative: 'mandaringa' },
    ru: { gender: 'm', forms: ['мандарин', 'мандарина', 'мандаринов'] },
    en: { one: 'tangerine', many: 'tangerines' },
  },
  ball: {
    uz: { noun: 'to‘p', dative: 'to‘pga' },
    ru: { gender: 'm', forms: ['мяч', 'мяча', 'мячей'] },
    en: { one: 'ball', many: 'balls' },
  },
  cookie: {
    uz: { noun: 'pechenye', dative: 'pechenyega' },
    ru: { gender: 'n', forms: ['печенье', 'печенья', 'печений'] },
    en: { one: 'cookie', many: 'cookies' },
  },
  balloon: {
    uz: { noun: 'shar', dative: 'sharga' },
    ru: { gender: 'm', forms: ['шарик', 'шарика', 'шариков'] },
    en: { one: 'balloon', many: 'balloons' },
  },
  carrot: {
    uz: { noun: 'sabzi', dative: 'sabziga' },
    ru: { gender: 'f', forms: ['морковка', 'морковки', 'морковок'] },
    en: { one: 'carrot', many: 'carrots' },
  },
}

const UZ_COUNT = ['', 'bitta', 'ikkita', 'uchta', 'to‘rtta', 'beshta', 'oltita']
const EN_COUNT = ['', 'one', 'two', 'three', 'four', 'five', 'six']
const RU_COUNT: Record<RuGender, readonly string[]> = {
  m: ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть'],
  f: ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть'],
  n: ['', 'одно', 'два', 'три', 'четыре', 'пять', 'шесть'],
}

/** Russian noun form after a number. */
function ruNoun(object: MathObject, n: number): string {
  const [one, few, many] = WORDS[object].ru.forms
  const last = n % 10
  const teen = n % 100 >= 11 && n % 100 <= 14
  if (!teen && last === 1) return one
  if (!teen && last >= 2 && last <= 4) return few
  return many
}

/** "3 apples" for the answer card's accessible name. */
export function groupLabel(language: Language, object: MathObject, n: number): string {
  if (language === 'uz') return `${n} ta ${WORDS[object].uz.noun}`
  if (language === 'ru') return `${n} ${ruNoun(object, n)}`
  return `${n} ${n === 1 ? WORDS[object].en.one : WORDS[object].en.many}`
}

/** Age 4: the picture question, e.g. «Bitta olmaga yana bitta olma qo‘shdik. Endi nechta olma bor?» */
export function pictureQuestion(language: Language, object: MathObject, f: Fact): string {
  const w = WORDS[object]
  if (language === 'uz') {
    return `${cap(UZ_COUNT[f.a]!)} ${w.uz.dative} yana ${UZ_COUNT[f.b]} ${w.uz.noun} qo‘shdik. Endi nechta ${w.uz.noun} bor?`
  }
  if (language === 'ru') {
    const count = RU_COUNT[w.ru.gender]
    return `Вот ${count[f.a]} ${ruNoun(object, f.a)} и ещё ${count[f.b]} ${ruNoun(object, f.b)}. Сколько теперь ${w.ru.forms[2]}?`
  }
  const noun = (n: number) => (n === 1 ? w.en.one : w.en.many)
  return `${cap(EN_COUNT[f.a]!)} ${noun(f.a)} and ${EN_COUNT[f.b]} more ${noun(f.b)}. How many ${w.en.many} are there now?`
}

/** Ages 5–6: the number question under the big equation. */
export function numberQuestion(language: Language, f: Fact): string {
  if (language === 'uz') return `${f.a} qo‘shuv ${f.b} necha bo‘ladi?`
  if (language === 'ru') return `Сколько будет ${f.a} плюс ${f.b}?`
  return `What is ${f.a} plus ${f.b}?`
}

/** The help sentence for an example, by the way the stage teaches it. */
export function helpText(language: Language, stage: StageId, f: Fact): string {
  if (stage === '6-make10') {
    if (language === 'uz') return `${f.a} va ${f.b} birga 10 ni hosil qiladi.`
    if (language === 'ru') return `${f.a} и ${f.b} вместе дают 10.`
    return `${f.a} and ${f.b} make 10 together.`
  }
  if (stage === '6-over10') {
    const big = Math.max(f.a, f.b)
    const { toTen, rest } = bridge(f)
    if (language === 'uz')
      return `${big} ga ${toTen} qo‘shsak, 10 bo‘ladi. Yana ${rest} qoldi. Demak, ${f.sum}.`
    if (language === 'ru')
      return `${big} плюс ${toTen} будет 10. Осталось ещё ${rest}. Значит, ${f.sum}.`
    return `${big} plus ${toTen} makes 10. There are ${rest} more left. So it's ${f.sum}.`
  }
  if (language === 'uz') return `Sanaymiz: ${f.a} ta va yana ${f.b} ta, jami ${f.sum} ta.`
  if (language === 'ru') return `Считаем: ${f.a} и ещё ${f.b}. Всего ${f.sum}.`
  return `Let's count: ${f.a} and ${f.b} more. That makes ${f.sum}.`
}

/* ---------- screen words ---------- */

export interface MathCopy {
  chooseStage: string
  stageTitle: Record<StageId, string>
  /** What the stage teaches, said on its first screen. */
  explain: Record<StageId, string>
  learn: string
  test: string
  testHint: string
  locked: string
  taught: string
  guided: string
  alone: string
  start: string
  tapToCount: string
  counted: (n: number) => string
  recount: string
  correct: string
  retry: string
  stageDone: string
  stageDoneText: string
  nextStage: string
  stages: string
  testTitle: (n: number) => string
  /** Short bubble text while a question is on screen. */
  ask: string
  /** Short bubble text on a stage's first screen. */
  look: string
}

export const COPY: Record<Language, MathCopy> = {
  uz: {
    chooseStage: 'Qaysi bosqichni o‘rganamiz?',
    stageTitle: {
      '4-sum3': '3 gacha qo‘shamiz',
      '4-sum5': '5 gacha qo‘shamiz',
      '5-sum5': '5 gacha qo‘shish',
      '5-sum10': '10 gacha qo‘shish',
      '6-to10': '10 gacha qo‘shish',
      '6-make10': '10 ni hosil qilamiz',
      '6-over10': '10 dan oshib qo‘shamiz',
    },
    explain: {
      '4-sum3': 'Narsalarni qo‘shamiz! Har biriga bosib sanab ko‘r.',
      '4-sum5': 'Endi beshtagacha qo‘shamiz. Har biriga bosib sanab ko‘r.',
      '5-sum5': 'Sonlarni qo‘shamiz. Javob beshdan oshmaydi.',
      '5-sum10': 'Endi o‘ngacha qo‘shamiz.',
      '6-to10': 'O‘ngacha qo‘shamiz. Rasmga qarab sanasang bo‘ladi.',
      '6-make10': 'Qaysi ikki son birga o‘nni hosil qiladi?',
      '6-over10': 'O‘ndan oshib qo‘shamiz: avval o‘nni to‘ldiramiz, keyin qolganini qo‘shamiz.',
    },
    learn: 'O‘rganish',
    test: 'Qisqa tekshiruv',
    testHint: 'Tekshiruv uchun avval bir bosqichni o‘rgan.',
    locked: 'Avvalgi bosqichdan keyin ochiladi',
    taught: 'O‘rganildi',
    guided: 'Birga bajaramiz',
    alone: 'Endi o‘zing',
    start: 'Boshladik!',
    tapToCount: 'Har biriga bosib sanab ko‘r',
    counted: (n) => `Sanadik: ${n}`,
    recount: 'Qaytadan sanash',
    correct: 'To‘g‘ri! Barakalla!',
    retry: 'Keling, yana bir sanab ko‘ramiz.',
    stageDone: 'Bosqich o‘rganildi!',
    stageDoneText: 'Barakalla! Endi qisqa tekshiruvdan o‘tishing mumkin.',
    nextStage: 'Keyingi bosqich',
    stages: 'Bosqichlar',
    testTitle: (n) => `Qisqa tekshiruv: ${n} ta savol`,
    ask: 'Javobni tanla!',
    look: 'Qara, birga o‘rganamiz!',
  },
  ru: {
    chooseStage: 'Что будем учить?',
    stageTitle: {
      '4-sum3': 'Складываем до 3',
      '4-sum5': 'Складываем до 5',
      '5-sum5': 'Сложение до 5',
      '5-sum10': 'Сложение до 10',
      '6-to10': 'Сложение до 10',
      '6-make10': 'Собираем 10',
      '6-over10': 'Сложение через 10',
    },
    explain: {
      '4-sum3': 'Складываем предметы! Нажми на каждый и посчитай.',
      '4-sum5': 'Теперь складываем до пяти. Нажми на каждый и посчитай.',
      '5-sum5': 'Складываем числа. Ответ не больше пяти.',
      '5-sum10': 'Теперь складываем до десяти.',
      '6-to10': 'Складываем до десяти. Можно посчитать по картинке.',
      '6-make10': 'Какие два числа вместе дают десять?',
      '6-over10': 'Складываем через десять: сначала добираем до десяти, потом прибавляем остаток.',
    },
    learn: 'Учимся',
    test: 'Короткая проверка',
    testHint: 'Чтобы пройти проверку, сначала выучи один этап.',
    locked: 'Откроется после прошлого этапа',
    taught: 'Выучено',
    guided: 'Делаем вместе',
    alone: 'Теперь сам',
    start: 'Начинаем!',
    tapToCount: 'Нажми на каждый и посчитай',
    counted: (n) => `Посчитали: ${n}`,
    recount: 'Посчитать заново',
    correct: 'Верно! Молодец!',
    retry: 'Давай посчитаем ещё раз.',
    stageDone: 'Этап выучен!',
    stageDoneText: 'Молодец! Теперь можно пройти короткую проверку.',
    nextStage: 'Следующий этап',
    stages: 'Этапы',
    testTitle: (n) => `Короткая проверка: вопросов – ${n}`,
    ask: 'Выбери ответ!',
    look: 'Смотри, учимся вместе!',
  },
  en: {
    chooseStage: 'What shall we learn?',
    stageTitle: {
      '4-sum3': 'Adding up to 3',
      '4-sum5': 'Adding up to 5',
      '5-sum5': 'Adding up to 5',
      '5-sum10': 'Adding up to 10',
      '6-to10': 'Adding up to 10',
      '6-make10': 'Making 10',
      '6-over10': 'Adding past 10',
    },
    explain: {
      '4-sum3': "Let's add things! Tap each one to count it.",
      '4-sum5': 'Now we add up to five. Tap each one to count it.',
      '5-sum5': "Let's add numbers. The answer is five or less.",
      '5-sum10': 'Now we add up to ten.',
      '6-to10': 'We add up to ten. You can count the picture.',
      '6-make10': 'Which two numbers make ten together?',
      '6-over10': 'Adding past ten: first we fill up ten, then we add what is left.',
    },
    learn: 'Learn',
    test: 'Quick check',
    testHint: 'Learn one step first, then try the quick check.',
    locked: 'Opens after the step before',
    taught: 'Learned',
    guided: "Let's do it together",
    alone: 'Now on your own',
    start: "Let's start!",
    tapToCount: 'Tap each one to count it',
    counted: (n) => `Counted: ${n}`,
    recount: 'Count again',
    correct: 'Right! Well done!',
    retry: "Let's count once more.",
    stageDone: 'Step learned!',
    stageDoneText: 'Well done! Now you can try the quick check.',
    nextStage: 'Next step',
    stages: 'Steps',
    testTitle: (n) => `Quick check: ${n} questions`,
    ask: 'Pick the answer!',
    look: "Look, let's learn together!",
  },
}
