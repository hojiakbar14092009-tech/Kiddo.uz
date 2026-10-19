import type { Language } from '@/content/languages'

/*
 * What this section says and shows, written for each language on its own.
 * It talks about letters (never about letter names mixed with sounds): the
 * child sees the letter and the picture, and on PRO hears the word itself.
 * Every function returns a plain sentence; spoken.ts lists all of them.
 */

export interface WordsCopy {
  choose: string
  learnHint: string
  testHint: string
  /** Age 4: which picture starts with this letter? */
  pickPicture: (letter: string) => string
  pickPictureHelp: (letter: string) => string
  /** Age 4: which letter does this picture start with? */
  pickLetter: string
  pickLetterHelp: string
  /** “Mushuk” starts with the letter “M”. */
  startsWith: (word: string, letter: string) => string
  /** Age 5. */
  build: string
  buildHelp: string
  exampleTitle: (word: string) => string
  exampleGo: string
  built: (word: string) => string
  wrongTile: string
  /** Age 6. */
  readWord: string
  readWordHelp: string
  readSentence: string
  readSentenceHelp: string
  missing: string
  missingHelp: string
  wordIs: (word: string) => string
  sentenceIs: (sentence: string) => string
  greet: string
  correct: string
  tryAgain: string
}

const quoteUz = (text: string) => `«${text}»`
const quoteRu = (text: string) => `«${text}»`
const quoteEn = (text: string) => `“${text}”`

export const COPY: Record<Language, WordsCopy> = {
  uz: {
    choose: 'Bugun nima qilamiz?',
    learnHint: 'Birga o‘rganamiz, xato qilsang yana urinasan.',
    testHint: 'O‘zing bajarasan, javoblaring saqlanadi.',
    pickPicture: (letter) => `Qaysi rasm ${quoteUz(letter)} harfidan boshlanadi?`,
    pickPictureHelp: (letter) =>
      `Rasmlarni ichingda nomla. Qaysi so‘z ${quoteUz(letter)} harfidan boshlanadi?`,
    pickLetter: 'Bu so‘z qaysi harfdan boshlanadi?',
    pickLetterHelp: 'Rasmni ichingda nomla. So‘z boshidagi harfni top.',
    startsWith: (word, letter) => `${word} so‘zi ${quoteUz(letter)} harfidan boshlanadi.`,
    build: 'Rasmga qara. Harflarni tartib bilan bosib, so‘zni yig‘.',
    buildHelp: 'Keyingi kerakli harf yonib turibdi.',
    exampleTitle: (word) => `Qara, men ${quoteUz(word)} so‘zini yig‘aman.`,
    exampleGo: 'Endi o‘zing!',
    built: (word) => `Barakalla! Bu ${quoteUz(word)}.`,
    wrongTile: 'Bu harf hozir emas. So‘zni boshidan o‘qib ko‘r.',
    readWord: 'So‘zni o‘qi. Qaysi rasm?',
    readWordHelp: 'So‘zni harfma-harf o‘qi, keyin rasmlarni nomla.',
    readSentence: 'Gapni o‘qi. Qaysi rasm mos keladi?',
    readSentenceHelp: 'Gap kim yoki nima haqida? O‘sha so‘zni top.',
    missing: 'Qaysi harf tushib qolgan?',
    missingHelp: 'Rasm nomini ichingda sekin ayt. Bo‘sh joyda qaysi harf bor?',
    wordIs: (word) => `Bu so‘z: ${quoteUz(word)}.`,
    sentenceIs: (sentence) => `Gap: ${sentence}`,
    greet: 'Keling, harflar bilan o‘ynaymiz!',
    correct: 'To‘g‘ri!',
    tryAgain: 'Yana bir urinib ko‘r.',
  },
  ru: {
    choose: 'Чем займёмся сегодня?',
    learnHint: 'Учимся вместе, после ошибки можно попробовать ещё.',
    testHint: 'Ты отвечаешь без подсказок, ответы сохранятся.',
    pickPicture: (letter) => `Какая картинка начинается с буквы ${quoteRu(letter)}?`,
    pickPictureHelp: (letter) =>
      `Назови картинки про себя. Какое слово начинается с буквы ${quoteRu(letter)}?`,
    pickLetter: 'С какой буквы начинается это слово?',
    pickLetterHelp: 'Назови картинку про себя. Найди первую букву слова.',
    startsWith: (word, letter) => `Слово ${quoteRu(word)} начинается с буквы ${quoteRu(letter)}.`,
    build: 'Посмотри на картинку. Нажимай буквы по порядку и собери слово.',
    buildHelp: 'Нужная буква светится.',
    exampleTitle: (word) => `Смотри, я собираю слово ${quoteRu(word)}.`,
    exampleGo: 'Теперь ты!',
    built: (word) => `Молодец! Это ${quoteRu(word)}.`,
    wrongTile: 'Эта буква пока не нужна. Прочитай слово с начала.',
    readWord: 'Прочитай слово. Какая картинка?',
    readWordHelp: 'Прочитай слово по буквам, потом назови картинки.',
    readSentence: 'Прочитай предложение. Какая картинка подходит?',
    readSentenceHelp: 'О ком или о чём это предложение? Найди это слово.',
    missing: 'Какая буква пропала?',
    missingHelp: 'Медленно назови картинку про себя. Какая буква на пустом месте?',
    wordIs: (word) => `Это слово ${quoteRu(word)}.`,
    sentenceIs: (sentence) => `Предложение: ${sentence}`,
    greet: 'Давай поиграем с буквами!',
    correct: 'Верно!',
    tryAgain: 'Попробуй ещё раз.',
  },
  en: {
    choose: 'What shall we do today?',
    learnHint: 'We learn together. After a mistake, you can try again.',
    testHint: 'You do it on your own. Your answers are saved.',
    pickPicture: (letter) => `Which picture starts with the letter ${quoteEn(letter)}?`,
    pickPictureHelp: (letter) =>
      `Say the pictures in your head. Which word starts with the letter ${quoteEn(letter)}?`,
    pickLetter: 'Which letter does this word start with?',
    pickLetterHelp: 'Say the picture in your head. Find the first letter of the word.',
    startsWith: (word, letter) => `${word} starts with the letter ${quoteEn(letter)}.`,
    build: 'Look at the picture. Tap the letters in order to build the word.',
    buildHelp: 'The next letter you need is glowing.',
    exampleTitle: (word) => `Watch me build the word ${quoteEn(word)}.`,
    exampleGo: 'Now you!',
    built: (word) => `Well done! It says ${quoteEn(word)}.`,
    wrongTile: 'Not this letter yet. Read the word from the start.',
    readWord: 'Read the word. Which picture is it?',
    readWordHelp: 'Sound out the word letter by letter, then name the pictures.',
    readSentence: 'Read the sentence. Which picture fits?',
    readSentenceHelp: 'Who or what is the sentence about? Find that word.',
    missing: 'Which letter is missing?',
    missingHelp: 'Say the picture slowly in your head. Which letter goes in the gap?',
    wordIs: (word) => `The word is ${quoteEn(word)}.`,
    sentenceIs: (sentence) => `The sentence says: ${sentence}`,
    greet: 'Let’s play with letters!',
    correct: 'That’s right!',
    tryAgain: 'Try again.',
  },
}
