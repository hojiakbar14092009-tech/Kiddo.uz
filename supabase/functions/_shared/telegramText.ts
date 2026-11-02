/*
 * What the parents' Telegram bot says (Phase 56), in Uzbek, Russian and English.
 * Plain text (no Markdown): a child's name never breaks the formatting.
 * A message names a child by first name and age only, with short results.
 */

export type BotLanguage = 'uz' | 'ru' | 'en'
export const BOT_LANGUAGES: readonly BotLanguage[] = ['uz', 'ru', 'en']

export interface ChildName {
  name: string
  age: number
}

export interface ChildReport extends ChildName {
  days_active: number
  minutes: number
  tasks: number
  letters: string[]
  hard: string[]
  last_day: string | null
}

export type ReportKind = 'weekly' | 'daily' | 'reminder'

export interface Report {
  chat_id: number
  language: BotLanguage
  kind: ReportKind
  days: number
  children: ChildReport[]
}

export interface Pro {
  plan: 'monthly' | 'yearly' | 'lifetime'
  expires_at: string | null
}

interface Texts {
  welcome: string
  linked: (children: string) => string
  linkedNoChildren: string
  noChildren: string
  invalid: string
  tooMany: string
  stopped: string
  notLinked: string
  help: string
  privacy: string
  languagePick: string
  languageSet: string
  proNone: string
  proUntil: (plan: string, date: string) => string
  proLifetime: string
  plans: Record<Pro['plan'], string>
  age: (age: number) => string
  and: string
  weeklyTitle: string
  dailyTitle: string
  days: (active: number, of: number) => string
  minutes: (minutes: number) => string
  tasks: (tasks: number) => string
  letters: string
  hard: string
  noPlayWeek: string
  footer: string
  reminder: (names: string) => string
}

const UZ: Texts = {
  welcome:
    'Assalomu alaykum! Bu Kiddo ota-onalar boti.\n\nUlash uchun: Kiddo ilovasida "Ota-ona bo‘limi" → "Sozlamalar" → "Telegramga ulash" tugmasini bosing va chiqqan havolani oching. Havola 10 daqiqa amal qiladi.',
  linked: (children) =>
    `${children} ulandi. Har yakshanba kechqurun haftalik hisobot keladi.\n\nBuyruqlar: /report — hisobot hozir, /stop — uzish, /help — yordam.`,
  linkedNoChildren:
    'Hisob ulandi. Ilovada bola qo‘shilgach, hisobotlar shu yerga keladi.\n\n/help — yordam.',
  noChildren: 'Ilovada hali bola qo‘shilmagan.',
  invalid:
    'Bu havola eskirgan yoki allaqachon ishlatilgan. Ilovadagi "Telegramga ulash" tugmasidan yangisini oling.',
  tooMany:
    'Bitta oilaga eng ko‘pi bilan 5 ta chat ulanadi. Ilovada keraksizini uzib, yana urinib ko‘ring.',
  stopped: 'Chat uzildi, boshqa xabar kelmaydi. Qayta ulash uchun ilovadan yangi havola oling.',
  notLinked: 'Bu chat hech qaysi oilaga ulanmagan.',
  help: 'Buyruqlar:\n/report — haftalik hisobot hozir\n/pro — PRO holati\n/lang — tilni o‘zgartirish\n/privacy — nima yuboriladi\n/stop — chatni uzish\n\nXabar vaqti va turlari: ilovada "Ota-ona bo‘limi" → "Sozlamalar" → "Telegram".',
  privacy:
    'Botga faqat bolaning ismi, yoshi va qisqa natijasi (kunlar, daqiqalar, harflar) boradi. Familiya, rasm, ovoz va javoblar yuborilmaydi. Bot faqat ilovadagi havola orqali ulangan chatlarga yozadi. /stop — hammasini to‘xtatadi.',
  languagePick: 'Tilni tanlang: /lang uz, /lang ru yoki /lang en',
  languageSet: 'Til o‘zgartirildi: o‘zbekcha.',
  proNone: 'PRO yoqilmagan. To‘lov faqat ilovada, botda emas.',
  proUntil: (plan, date) => `PRO: ${plan}, ${date} gacha.`,
  proLifetime: 'PRO: umrbod.',
  plans: { monthly: 'oylik', yearly: 'yillik', lifetime: 'umrbod' },
  age: (age) => `${age} yosh`,
  and: 'va',
  weeklyTitle: 'Haftalik hisobot',
  dailyTitle: 'Bugungi xulosa',
  days: (active, of) => `Shug‘ullangan kunlar: ${active} / ${of}`,
  minutes: (minutes) => `Vaqt: ${minutes} daqiqa`,
  tasks: (tasks) => `Mashqlar: ${tasks}`,
  letters: 'Yaxshi bajargan harflari',
  hard: 'Qiynalgan harflari',
  noPlayWeek: 'Bu davrda mashq qilmadi.',
  footer: 'Batafsil: ilovada "Ota-ona bo‘limi" → "Hisobot".',
  reminder: (names) =>
    `${names} 3 kundan beri Kiddo’ga kirmadi. Bugun birga 10 daqiqa o‘ynab ko‘rasizmi?`,
}

const RU: Texts = {
  welcome:
    'Здравствуйте! Это бот Kiddo для родителей.\n\nКак подключить: в приложении Kiddo откройте «Раздел для родителей» → «Настройки» → «Подключить Telegram» и откройте полученную ссылку. Ссылка действует 10 минут.',
  linked: (children) =>
    `Подключено: ${children}. Каждое воскресенье вечером придёт отчёт за неделю.\n\nКоманды: /report — отчёт сейчас, /stop — отключить, /help — помощь.`,
  linkedNoChildren:
    'Аккаунт подключён. Когда в приложении появится ребёнок, отчёты будут приходить сюда.\n\n/help — помощь.',
  noChildren: 'В приложении пока нет ни одного ребёнка.',
  invalid:
    'Эта ссылка устарела или уже использована. Получите новую кнопкой «Подключить Telegram» в приложении.',
  tooMany:
    'К одной семье можно подключить не больше 5 чатов. Отключите лишний в приложении и попробуйте снова.',
  stopped:
    'Чат отключён, сообщений больше не будет. Чтобы подключить снова, получите новую ссылку в приложении.',
  notLinked: 'Этот чат не подключён ни к одной семье.',
  help: 'Команды:\n/report — отчёт за неделю сейчас\n/pro — статус PRO\n/lang — сменить язык\n/privacy — что отправляется\n/stop — отключить чат\n\nВремя и виды сообщений: в приложении «Раздел для родителей» → «Настройки» → «Telegram».',
  privacy:
    'Бот получает только имя ребёнка, возраст и краткий итог (дни, минуты, буквы). Фамилия, фото, голос и ответы не отправляются. Бот пишет только в чаты, подключённые по ссылке из приложения. /stop — остановить всё.',
  languagePick: 'Выберите язык: /lang uz, /lang ru или /lang en',
  languageSet: 'Язык изменён: русский.',
  proNone: 'PRO не подключён. Оплата только в приложении, не в боте.',
  proUntil: (plan, date) => `PRO: ${plan}, до ${date}.`,
  proLifetime: 'PRO: навсегда.',
  plans: { monthly: 'месячный', yearly: 'годовой', lifetime: 'навсегда' },
  age: (age) => `возраст: ${age}`,
  and: 'и',
  weeklyTitle: 'Отчёт за неделю',
  dailyTitle: 'Итог дня',
  days: (active, of) => `Дни занятий: ${active} / ${of}`,
  minutes: (minutes) => `Время: ${minutes} мин`,
  tasks: (tasks) => `Упражнения: ${tasks}`,
  letters: 'Хорошо получились буквы',
  hard: 'Трудные буквы',
  noPlayWeek: 'В эти дни не занимался.',
  footer: 'Подробнее: «Раздел для родителей» → «Отчёт» в приложении.',
  reminder: (names) => `${names}: уже 3 дня без Kiddo. Может, поиграете вместе 10 минут сегодня?`,
}

const EN: Texts = {
  welcome:
    'Hello! This is the Kiddo bot for parents.\n\nTo connect: in the Kiddo app open "Parent area" → "Settings" → "Connect Telegram" and open the link it gives you. The link works for 10 minutes.',
  linked: (children) =>
    `Connected: ${children}. A weekly report arrives every Sunday evening.\n\nCommands: /report — report now, /stop — disconnect, /help — help.`,
  linkedNoChildren:
    'Account connected. Once a child is added in the app, reports will arrive here.\n\n/help — help.',
  noChildren: 'No child has been added in the app yet.',
  invalid:
    'This link has expired or was already used. Get a new one with "Connect Telegram" in the app.',
  tooMany: 'A family can connect at most 5 chats. Disconnect one in the app and try again.',
  stopped:
    'Chat disconnected; no more messages will come. To connect again, get a new link in the app.',
  notLinked: 'This chat is not connected to any family.',
  help: 'Commands:\n/report — this week’s report now\n/pro — PRO status\n/lang — change language\n/privacy — what is sent\n/stop — disconnect this chat\n\nMessage time and types: in the app, "Parent area" → "Settings" → "Telegram".',
  privacy:
    'The bot gets only a child’s first name, age and a short result (days, minutes, letters). No surname, photo, voice or answers are sent. The bot writes only to chats connected with a link from the app. /stop stops everything.',
  languagePick: 'Choose a language: /lang uz, /lang ru or /lang en',
  languageSet: 'Language changed: English.',
  proNone: 'PRO is not on. Payment is only in the app, never in the bot.',
  proUntil: (plan, date) => `PRO: ${plan}, until ${date}.`,
  proLifetime: 'PRO: lifetime.',
  plans: { monthly: 'monthly', yearly: 'yearly', lifetime: 'lifetime' },
  age: (age) => `age ${age}`,
  and: 'and',
  weeklyTitle: 'Weekly report',
  dailyTitle: 'Today',
  days: (active, of) => `Days played: ${active} / ${of}`,
  minutes: (minutes) => `Time: ${minutes} min`,
  tasks: (tasks) => `Exercises: ${tasks}`,
  letters: 'Letters done well',
  hard: 'Tricky letters',
  noPlayWeek: 'No play in these days.',
  footer: 'More in the app: "Parent area" → "Report".',
  reminder: (names) =>
    `It has been 3 days since ${names} last opened Kiddo. Play 10 minutes together today?`,
}

export const TEXTS: Record<BotLanguage, Texts> = { uz: UZ, ru: RU, en: EN }

export function botLanguage(value: unknown): BotLanguage {
  if (typeof value !== 'string') return 'uz'
  const code = value.slice(0, 2).toLowerCase()
  return (BOT_LANGUAGES as readonly string[]).includes(code) ? (code as BotLanguage) : 'uz'
}

/** "Aziz", "Aziz va Madina", "Aziz, Madina va Lola". */
export function joinNames(names: string[], language: BotLanguage): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} ${TEXTS[language].and} ${names[names.length - 1]}`
}

/** "Aziz (5 yosh) va Madina (4 yosh)". */
export function childrenLine(children: ChildName[], language: BotLanguage): string {
  const t = TEXTS[language]
  return joinNames(
    children.map((child) => `${child.name} (${t.age(child.age)})`),
    language,
  )
}

/** A letter id as a child sees it: "a" → "A", "sh" → "Sh", "o‘" → "O‘". */
export function showLetter(id: string): string {
  return id.charAt(0).toLocaleUpperCase() + id.slice(1)
}

/**
 * The text of a weekly, daily or reminder message, or null when there is
 * nothing to say (a day with no play, a reminder for a family with no child).
 */
export function formatReport(report: Report): string | null {
  const language = botLanguage(report.language)
  const t = TEXTS[language]
  const children = report.children ?? []
  if (children.length === 0) return null
  if (report.kind === 'reminder') {
    return t.reminder(
      joinNames(
        children.map((child) => child.name),
        language,
      ),
    )
  }
  const shown =
    report.kind === 'daily'
      ? children.filter((child) => child.tasks > 0 || child.minutes > 0)
      : children
  if (shown.length === 0) return null
  const blocks = shown.map((child) => {
    const lines = [`${child.name}, ${t.age(child.age)}`]
    if (child.tasks === 0 && child.minutes === 0) {
      lines.push(`• ${t.noPlayWeek}`)
      return lines.join('\n')
    }
    if (report.kind === 'weekly') lines.push(`• ${t.days(child.days_active, report.days)}`)
    lines.push(`• ${t.minutes(child.minutes)}`)
    lines.push(`• ${t.tasks(child.tasks)}`)
    if (child.letters.length > 0)
      lines.push(`• ${t.letters}: ${child.letters.map(showLetter).join(', ')}`)
    if (child.hard.length > 0) lines.push(`• ${t.hard}: ${child.hard.map(showLetter).join(', ')}`)
    return lines.join('\n')
  })
  const title = report.kind === 'weekly' ? t.weeklyTitle : t.dailyTitle
  return `${title}\n\n${blocks.join('\n\n')}\n\n${t.footer}`
}

export function formatPro(pro: Pro | null, language: BotLanguage): string {
  const t = TEXTS[language]
  if (!pro) return t.proNone
  if (pro.plan === 'lifetime' || !pro.expires_at) return t.proLifetime
  const date = pro.expires_at.slice(0, 10).split('-').reverse().join('.')
  return t.proUntil(t.plans[pro.plan] ?? pro.plan, date)
}
