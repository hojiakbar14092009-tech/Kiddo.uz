import type { Language } from '@/content/languages'

/*
 * What the mascot and the screens say, per language. The mascot speaks in
 * the first person without past-tense forms that would give it a gender
 * (in Russian “я ошибся/ошиблась”), since the child chooses a girl or a boy robot.
 */

export interface HelpCopy {
  greet: string
  choose: string
  learnHint: string
  testHint: string
  /** Age 4. */
  findHelp: string
  thanks: (name: string) => string
  notThis: string
  /** Age 5: the mascot's answer has a mistake. */
  fixInitial: string
  fixSpelling: string
  fixSum: string
  fixInitialHelp: string
  fixSpellingHelp: string
  fixSumHelp: string
  /** Age 6: a worksheet with one mistake. */
  spot: string
  spotHelp: string
  lineIsRight: string
  fixLine: string
  /** Explanations, said when the mistake is fixed. */
  initialIs: (word: string, letter: string) => string
  spellingIs: (word: string) => string
  plusIs: (a: number, b: number, c: number) => string
  minusIs: (a: number, b: number, c: number) => string
  correct: string
  tryAgain: string
  mascotSaid: string
  fixed: string
}

export const COPY: Record<Language, HelpCopy> = {
  uz: {
    greet: 'Salom! Menga yordam berasanmi?',
    choose: 'Maskotga qanday yordam beramiz?',
    learnHint: 'Birga o‘rganamiz, xato qilsang yana urinasan.',
    testHint: 'O‘zing bajarasan, javoblaring saqlanadi.',
    findHelp: 'Bulutchadagi rasmga qara. Xuddi shunday rasmni top.',
    thanks: (name) => `Rahmat! Bu ${name}.`,
    notThis: 'Bu boshqa narsa. Yana qara!',
    fixInitial: 'Menimcha, bu yerda xato bor. To‘g‘ri harfni tanla.',
    fixSpelling: 'Menimcha, bu so‘zda xato bor. To‘g‘ri yozilganini tanla.',
    fixSum: 'Menimcha, bu yerda xato bor. Aslida nechta bo‘ladi?',
    fixInitialHelp: 'Rasm nomini ichingda ayt. Birinchi harf qaysi?',
    fixSpellingHelp: 'Har bir so‘zni harfma-harf sekin o‘qi.',
    fixSumHelp: 'Rasmlarni bittalab sana.',
    spot: 'Mana mening javoblarim. Bittasida xato bor. Qaysi biri?',
    spotHelp: 'Har bir qatorni o‘zing tekshir va mening javobim bilan solishtir.',
    lineIsRight: 'Bu qator to‘g‘ri. Boshqasini tekshir.',
    fixLine: 'Topding! Endi to‘g‘ri javobni tanla.',
    initialIs: (word, letter) => `${word} so‘zi «${letter}» harfidan boshlanadi.`,
    spellingIs: (word) => `To‘g‘ri yozilishi: ${word}.`,
    plusIs: (a, b, c) => `${a} + ${b} = ${c}. ${a} taga yana ${b} ta qo‘shsak, ${c} ta bo‘ladi.`,
    minusIs: (a, b, c) => `${a} − ${b} = ${c}. ${a} tadan ${b} tasini olsak, ${c} ta qoladi.`,
    correct: 'To‘g‘ri! Rahmat!',
    tryAgain: 'Yana bir urinib ko‘r.',
    mascotSaid: 'Maskot javobi',
    fixed: 'Tuzatildi',
  },
  ru: {
    greet: 'Привет! Поможешь мне?',
    choose: 'Как поможем роботу?',
    learnHint: 'Учимся вместе, после ошибки можно попробовать ещё.',
    testHint: 'Ты отвечаешь без подсказок, ответы сохранятся.',
    findHelp: 'Посмотри на картинку в облачке. Найди такую же.',
    thanks: (name) => `Спасибо! Это ${name}.`,
    notThis: 'Это другое. Посмотри ещё!',
    fixInitial: 'Кажется, тут ошибка. Выбери правильную букву.',
    fixSpelling: 'Кажется, в слове ошибка. Выбери, как правильно.',
    fixSum: 'Кажется, тут ошибка. Сколько будет на самом деле?',
    fixInitialHelp: 'Назови картинку про себя. Какая первая буква?',
    fixSpellingHelp: 'Медленно прочитай каждое слово по буквам.',
    fixSumHelp: 'Посчитай картинки по одной.',
    spot: 'Вот мои ответы. В одном есть ошибка. В каком?',
    spotHelp: 'Проверь каждую строку сам и сравни с моим ответом.',
    lineIsRight: 'Эта строка верная. Проверь другую.',
    fixLine: 'Ошибка найдена! Теперь выбери правильный ответ.',
    initialIs: (word, letter) => `Слово «${word}» начинается с буквы «${letter}».`,
    spellingIs: (word) => `Правильно пишется: ${word}.`,
    plusIs: (a, b, c) => `${a} + ${b} = ${c}. Если к ${a} добавить ${b}, будет ${c}.`,
    minusIs: (a, b, c) => `${a} − ${b} = ${c}. Если из ${a} убрать ${b}, останется ${c}.`,
    correct: 'Верно! Спасибо!',
    tryAgain: 'Попробуй ещё раз.',
    mascotSaid: 'Ответ робота',
    fixed: 'Исправлено',
  },
  en: {
    greet: 'Hi! Will you help me?',
    choose: 'How shall we help the robot?',
    learnHint: 'We learn together. After a mistake, you can try again.',
    testHint: 'You do it on your own. Your answers are saved.',
    findHelp: 'Look at the picture in the bubble. Find the same one.',
    thanks: (name) => `Thank you! You found the ${name}.`,
    notThis: 'That is something else. Look again!',
    fixInitial: 'I think there is a mistake here. Pick the right letter.',
    fixSpelling: 'I think this word has a mistake. Pick the right spelling.',
    fixSum: 'I think there is a mistake here. How many is it really?',
    fixInitialHelp: 'Say the picture in your head. What is the first letter?',
    fixSpellingHelp: 'Read each word slowly, letter by letter.',
    fixSumHelp: 'Count the pictures one by one.',
    spot: 'Here are my answers. One of them is wrong. Which one?',
    spotHelp: 'Work out each line yourself and compare it with my answer.',
    lineIsRight: 'That line is right. Check another one.',
    fixLine: 'You found it! Now pick the right answer.',
    initialIs: (word, letter) => `${word} starts with the letter “${letter}”.`,
    spellingIs: (word) => `The right spelling is ${word}.`,
    plusIs: (a, b, c) => `${a} + ${b} = ${c}. ${a} and ${b} more make ${c}.`,
    minusIs: (a, b, c) => `${a} − ${b} = ${c}. Take ${b} away from ${a} and ${c} are left.`,
    correct: 'That’s right! Thank you!',
    tryAgain: 'Try again.',
    mascotSaid: 'Robot’s answer',
    fixed: 'Fixed',
  },
}
