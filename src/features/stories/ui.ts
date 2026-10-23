import type { Language } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'

/** Words of the story screens, per language (the stories' own words are in text.*). */
export interface StoriesUi {
  title: string
  intro: string
  classic: string
  classicText: string
  minutes: (n: number) => string
  finished: string
  locked: string
  lockedTitle: string
  lockedText: string
  backToLibrary: string
  progress: (current: number, total: number) => string
  prev: string
  next: string
  choose: string
  readToMe: string
  /** Beside "Read to me" in Uzbek: the voice is synthetic for now (said openly). */
  syntheticVoice: string
  stopReading: string
  autoTurn: string
  proNarration: string
  noRecording: string
  narrationError: string
  narrationMuted: string
  theEnd: string
  toQuestions: string
  questionsTitle: string
  question: (current: number, total: number) => string
  resultTitle: string
  score: (correct: number, total: number) => string
  readAgain: string
  toLibrary: string
  pictureLabel: (title: string) => string
}

export const STORIES_UI: Record<Language, StoriesUi> = {
  uz: {
    title: 'Hikoyalar',
    intro: 'Qaysi hikoyani o‘qiymiz?',
    classic: 'Klassik ertaklar',
    classicText: 'Qisqa 3D ertaklar va topshiriqlar',
    minutes: (n) => `${n} daqiqa`,
    finished: 'O‘qilgan',
    locked: 'Bu hikoya PRO versiyada. Uni ota-onang «Ota-ona bo‘limi»da yoqishi mumkin.',
    lockedTitle: 'Bu – PRO hikoya',
    lockedText: 'Hozircha bepul hikoyalarni o‘qiymiz. PRO’ni faqat ota-ona yoqadi.',
    backToLibrary: 'Hikoyalar ro‘yxati',
    progress: (current, total) => `Sahifa: ${current} / ${total}`,
    prev: 'Oldingi sahifa',
    next: 'Keyingi sahifa',
    choose: 'Tanla:',
    readToMe: 'O‘qib ber',
    syntheticVoice:
      'O‘zbekcha ovoz hozircha vaqtinchalik sun’iy ovoz (ona tilida so‘zlashuvchi odam ovozi emas) – haqiqiy o‘zbekcha ovoz tayyor bo‘lguncha.',
    stopReading: 'O‘qishni to‘xtat',
    autoTurn: 'Sahifani o‘zi varaqlasin',
    proNarration: 'Ovozli o‘qish PRO versiyada. Matnni birga o‘qiymiz!',
    noRecording: 'Bu sahifaning ovozi hali yozilmagan. Matnni birga o‘qiymiz!',
    narrationError: 'Hozir ovozni yoqib bo‘lmadi. Matnni birga o‘qiymiz!',
    narrationMuted: 'Ovoz o‘chirilgan. Ota-onang ovozni balandroq qilishi mumkin.',
    theEnd: 'Tamom!',
    toQuestions: 'Savollar',
    questionsTitle: 'Hikoyani eslaymiz',
    question: (current, total) => `${current}-savol, jami ${total} ta`,
    resultTitle: 'Barakalla!',
    score: (correct, total) => `Birinchi urinishda: ${correct} / ${total}`,
    readAgain: 'Yana o‘qish',
    toLibrary: 'Boshqa hikoyalar',
    pictureLabel: (title) => `«${title}» hikoyasidan rasm`,
  },
  ru: {
    title: 'Истории',
    intro: 'Какую историю почитаем?',
    classic: 'Классические сказки',
    classicText: 'Короткие 3D-сказки с заданиями',
    minutes: (n) => `${n} мин`,
    finished: 'Прочитано',
    locked: 'Эта история — в PRO. Родители могут включить PRO в «Разделе для родителей».',
    lockedTitle: 'Это PRO-история',
    lockedText: 'Пока почитаем бесплатные истории. PRO включают только родители.',
    backToLibrary: 'К списку историй',
    progress: (current, total) => `Страница ${current} из ${total}`,
    prev: 'Предыдущая страница',
    next: 'Следующая страница',
    choose: 'Выбери:',
    readToMe: 'Почитай мне',
    syntheticVoice:
      'Узбекский голос пока временный синтезированный (не голос носителя языка) — до появления настоящего узбекского голоса.',
    stopReading: 'Остановить чтение',
    autoTurn: 'Листать страницы автоматически',
    proNarration: 'Чтение вслух — в PRO. А текст прочитаем вместе!',
    noRecording: 'Голос для этой страницы ещё не записан. Прочитаем текст вместе!',
    narrationError: 'Сейчас не получилось включить голос. Прочитаем текст вместе!',
    narrationMuted: 'Звук выключен. Родители могут сделать его громче.',
    theEnd: 'Конец!',
    toQuestions: 'Вопросы',
    questionsTitle: 'Вспомним историю',
    question: (current, total) => `Вопрос ${current} из ${total}`,
    resultTitle: 'Молодец!',
    score: (correct, total) => `С первого раза: ${correct} из ${total}`,
    readAgain: 'Читать снова',
    toLibrary: 'Другие истории',
    pictureLabel: (title) => `Картинка из истории «${title}»`,
  },
  en: {
    title: 'Stories',
    intro: 'Which story shall we read?',
    classic: 'Classic tales',
    classicText: 'Short 3D tales with tasks',
    minutes: (n) => `${n} min`,
    finished: 'Read',
    locked: 'This story is in PRO. A parent can turn it on in the Parent area.',
    lockedTitle: 'This is a PRO story',
    lockedText: 'Let’s read the free stories for now. Only a parent can turn on PRO.',
    backToLibrary: 'All stories',
    progress: (current, total) => `Page ${current} of ${total}`,
    prev: 'Previous page',
    next: 'Next page',
    choose: 'Choose:',
    readToMe: 'Read to me',
    syntheticVoice:
      'For now the Uzbek voice is a temporary synthetic voice (not a native Uzbek speaker) until a real Uzbek voice is ready.',
    stopReading: 'Stop reading',
    autoTurn: 'Turn the pages for me',
    proNarration: 'Reading aloud is in PRO. Let’s read the words together!',
    noRecording: 'This page is not recorded yet. Let’s read the words together!',
    narrationError: 'The voice could not start just now. Let’s read the words together!',
    narrationMuted: 'The sound is off. A parent can turn it up.',
    theEnd: 'The end!',
    toQuestions: 'Questions',
    questionsTitle: 'Let’s remember the story',
    question: (current, total) => `Question ${current} of ${total}`,
    resultTitle: 'Well done!',
    score: (correct, total) => `Right the first time: ${correct} of ${total}`,
    readAgain: 'Read again',
    toLibrary: 'More stories',
    pictureLabel: (title) => `A picture from “${title}”`,
  },
}

export function useStoryLanguage(): Language {
  return useSettingsStore((state) => state.language) ?? 'uz'
}

export function useStoriesUi(): StoriesUi {
  return STORIES_UI[useStoryLanguage()]
}
