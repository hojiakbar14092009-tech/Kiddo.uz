import type { Language } from '@/content/languages'

/** Words on the tales screens that are only used here (shared ones are in learn.*). */
export interface TalesUi {
  intro: string
  forAge: (age: number) => string
  younger: string
  scene: (current: number, total: number) => string
  prev: string
  next: string
  readAloud: string
  pause: string
  resume: string
  replay: string
  proOnly: string
  noRecording: string
  sceneLabel: (title: string) => string
  orderHint: string
  orderSlot: (n: number) => string
  taskFirst: string
  toQuestions: string
  questionsTitle: string
  backToList: string
  finished: string
}

export const TALES_UI: Record<Language, TalesUi> = {
  uz: {
    intro: 'Qaysi ertakni o‘qiymiz?',
    forAge: (age) => `${age} yosh`,
    younger: 'Kichkintoylar uchun ham',
    scene: (current, total) => `${current}/${total}-sahna`,
    prev: 'Oldingi sahna',
    next: 'Keyingi sahna',
    readAloud: 'Ovoz chiqarib o‘qish',
    pause: 'To‘xtatish',
    resume: 'Davom ettirish',
    replay: 'Sahnani qaytadan',
    proOnly: 'Ovozli o‘qish PRO versiyada. Matnni birga o‘qiymiz!',
    noRecording: 'Bu sahnaning ovozi hali yozilmagan. Matnni o‘qib chiqamiz.',
    sceneLabel: (title) => `«${title}» ertagidan sahna`,
    orderHint: 'Avval nima bo‘lganini bos, keyin – keyingisini.',
    orderSlot: (n) => `${n}-o‘rin`,
    taskFirst: 'Avval topshiriqni bajaramiz',
    toQuestions: 'Ertak bo‘yicha savollar',
    questionsTitle: 'Ertakni eslaymiz',
    backToList: 'Ertaklar ro‘yxati',
    finished: 'Ertak tugadi! Endi bir nechta savol.',
  },
  ru: {
    intro: 'Какую сказку почитаем?',
    forAge: (age) => `${age} лет`,
    younger: 'И для малышей',
    scene: (current, total) => `Сцена ${current} из ${total}`,
    prev: 'Предыдущая сцена',
    next: 'Следующая сцена',
    readAloud: 'Читать вслух',
    pause: 'Пауза',
    resume: 'Продолжить',
    replay: 'Сцена сначала',
    proOnly: 'Чтение вслух — в PRO. А текст прочитаем вместе!',
    noRecording: 'Голос для этой сцены ещё не записан. Прочитаем текст.',
    sceneLabel: (title) => `Сцена из сказки «${title}»`,
    orderHint: 'Нажми, что было сначала, потом — что было дальше.',
    orderSlot: (n) => `Место ${n}`,
    taskFirst: 'Сначала выполним задание',
    toQuestions: 'Вопросы по сказке',
    questionsTitle: 'Вспомним сказку',
    backToList: 'К списку сказок',
    finished: 'Сказка закончилась! Теперь несколько вопросов.',
  },
  en: {
    intro: 'Which tale shall we read?',
    forAge: (age) => `Age ${age}`,
    younger: 'For little ones too',
    scene: (current, total) => `Scene ${current} of ${total}`,
    prev: 'Previous scene',
    next: 'Next scene',
    readAloud: 'Read aloud',
    pause: 'Pause',
    resume: 'Continue',
    replay: 'Replay scene',
    proOnly: 'Reading aloud is in PRO. Let’s read the words together!',
    noRecording: 'The voice for this scene is not recorded yet. Let’s read the words.',
    sceneLabel: (title) => `A scene from “${title}”`,
    orderHint: 'Tap what happened first, then what came next.',
    orderSlot: (n) => `Place ${n}`,
    taskFirst: 'Let’s do the task first',
    toQuestions: 'Questions about the tale',
    questionsTitle: 'Let’s remember the tale',
    backToList: 'All tales',
    finished: 'The tale is over! Now a few questions.',
  },
}
