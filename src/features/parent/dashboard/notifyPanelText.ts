/** The parents' Telegram notifications panel (stage 9): its settings and its texts in uz/ru/en. */
export interface NotifySettings {
  weekly: boolean
  events: boolean
  linked: boolean
  language: 'uz' | 'ru' | 'en'
  viaTelegram: boolean
}

export const NOTIFY_PANEL_TEXT = {
  uz: {
    title: 'Telegram xabarnomalari',
    intro:
      'Haftalik hisobot va muhim voqealarni Telegram’da oling. Standart holatda o‘chiq: faqat siz yoqsangiz keladi.',
    weekly: 'Haftalik hisobot (yakshanba, 20:00, Toshkent vaqti)',
    events:
      'Muhim voqealar: yangi bosqich, bir necha kun kirilmasa mayin eslatma (kuniga ko‘pi bilan 1 ta)',
    needLink: 'Xabarlar kelishi uchun Telegram chatini ulang.',
    getLink: 'Telegram’ni ulash',
    openBot: 'Botni ochish',
    linkHint: 'Botda «Start» tugmasini bosing. Havola 10 daqiqa va faqat bir marta ishlaydi.',
    refresh: 'Uladim, tekshirish',
    linked: 'Telegram chati ulangan ✓',
    privacy:
      'Yuboriladi: farzandingiz ismi, mashg‘ulotlar soni, o‘yin vaqti va takrorlash foydali harflar. Istalgan vaqtda o‘chiring yoki botda /stop yozing.',
    error: 'Sozlamalarni saqlab yoki yuklab bo‘lmadi. Birozdan keyin urinib ko‘ring.',
  },
  ru: {
    title: 'Уведомления в Telegram',
    intro:
      'Получайте недельный отчёт и важные события в Telegram. По умолчанию выключено: приходит, только если вы включите.',
    weekly: 'Недельный отчёт (воскресенье, 20:00 по Ташкенту)',
    events:
      'Важные события: новый этап, мягкое напоминание после нескольких дней без занятий (не больше 1 в день)',
    needLink: 'Чтобы сообщения приходили, подключите чат Telegram.',
    getLink: 'Подключить Telegram',
    openBot: 'Открыть бота',
    linkHint: 'Нажмите «Start» в боте. Ссылка действует 10 минут и только один раз.',
    refresh: 'Я подключил(а), проверить',
    linked: 'Чат Telegram подключён ✓',
    privacy:
      'Отправляется: имя ребёнка, число занятий, время в игре и буквы, которые полезно повторить. Выключите в любой момент или напишите боту /stop.',
    error: 'Не удалось сохранить или загрузить настройки. Попробуйте чуть позже.',
  },
  en: {
    title: 'Telegram notifications',
    intro:
      'Get the weekly report and important moments in Telegram. Off by default: messages come only if you turn them on.',
    weekly: 'Weekly report (Sunday, 20:00 Tashkent time)',
    events:
      'Important moments: a new stage, a gentle note after a few quiet days (at most 1 a day)',
    needLink: 'Link a Telegram chat so the messages can reach you.',
    getLink: 'Link Telegram',
    openBot: 'Open the bot',
    linkHint: 'Tap “Start” in the bot. The link works for 10 minutes and only once.',
    refresh: 'I linked it, check',
    linked: 'Telegram chat linked ✓',
    privacy:
      'What is sent: your child’s name, the number of activities, time playing and letters worth practising. Turn it off any time or send /stop to the bot.',
    error: 'Could not save or load the settings. Please try again a little later.',
  },
} as const
