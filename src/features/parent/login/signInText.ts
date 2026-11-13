import type { Language } from '@/content/languages'

/** The MVP sign-in screen's words (Google, e-mail code, Telegram code), written for each language. */
export const SIGN_IN_TEXT = {
  uz: {
    google: 'Google orqali kirish',
    telegram: 'Telegram',
    email: 'Email',
    tabs: 'Kirish usuli',
    phone: 'Telefon raqamingiz',
    getCode: 'Telegram’da kod olish',
    steps: [
      'Botda «Start» tugmasini bosing (bot buni o‘zi bosa olmaydi)',
      '«Raqamni ulashish» tugmasi bilan raqamingizni yuboring',
      'Bot yuborgan 6 xonali kodni shu yerga yozing',
    ],
    openBot: 'Botni ochish',
    notOpened: 'Bot o‘zi ochilmadimi? «Botni ochish» tugmasini bosing.',
    inApp: 'Google bilan kirish uchun saytni Safari yoki Chrome’da oching.',
    inAppHint:
      'Havolani nusxalang va brauzerga qo‘ying. Telegram yoki email bilan shu yerda kirsa bo‘ladi.',
    qr: 'Kompyuterdamisiz? Telefon kamerasi bilan QR kodni skanerlang',
    copy: 'Havolani nusxalash',
    copied: 'Havola nusxalandi',
    noTelegram: 'Telegram yo‘qmi? Google yoki email bilan kiring.',
    waiting: 'Botda Start bosing va raqamingizni ulashing. Kutyapmiz…',
    codeSent: 'Kod Telegram’ga yuborildi. Uni pastga yozing.',
    expired: 'Havola eskirdi yoki ishlatildi. Qaytadan boshlang.',
    restart: 'Qaytadan boshlash',
    code: '6 xonali kod',
    signIn: 'Kirish',
    resend: 'Qayta yuborish',
    resendIn: (s: number) => `Qayta yuborish ${s} soniyadan keyin`,
    emailAddress: 'Email manzilingiz',
    sendEmail: 'Kodni emailga yuborish',
    emailSent: (to: string) => `Kod ${to} manziliga yuborildi (spam papkasini ham tekshiring).`,
    noMethods: 'Kirish hali sozlanmagan. Birozdan keyin urinib ko‘ring.',
    errors: {
      wrong_code: 'Kod noto‘g‘ri.',
      code_expired: 'Kod eskirgan. Yangisini so‘rang.',
      too_many_tries: 'Juda ko‘p urinish. Yangi kod so‘rang.',
      rate_limited: 'Juda tez-tez. Birozdan keyin urinib ko‘ring.',
      too_many_sends: 'Bu kirish uchun kodlar tugadi. Qaytadan boshlang.',
      bad_phone: 'Raqamni +998 bilan to‘liq yozing.',
      bad_email: 'Email manzilini tekshiring.',
      expired: 'Havola eskirdi. Qaytadan boshlang.',
      not_configured: 'Bu usul hali sozlanmagan.',
      offline: 'Internet yo‘q. Ulanishni tekshiring.',
      failed: 'Kirib bo‘lmadi. Qaytadan urinib ko‘ring.',
    } as Record<string, string>,
  },
  ru: {
    google: 'Войти через Google',
    telegram: 'Telegram',
    email: 'Email',
    tabs: 'Способ входа',
    phone: 'Ваш номер телефона',
    getCode: 'Получить код в Telegram',
    steps: [
      'В боте нажмите «Start» (бот не может нажать её сам)',
      'Отправьте номер кнопкой «Поделиться номером»',
      'Введите здесь 6-значный код от бота',
    ],
    openBot: 'Открыть бота',
    notOpened: 'Бот не открылся сам? Нажмите «Открыть бота».',
    inApp: 'Чтобы войти через Google, откройте сайт в Safari или Chrome.',
    inAppHint:
      'Скопируйте ссылку и вставьте в браузер. Через Telegram или email можно войти и здесь.',
    qr: 'Вы за компьютером? Отсканируйте QR-код камерой телефона',
    copy: 'Скопировать ссылку',
    copied: 'Ссылка скопирована',
    noTelegram: 'Нет Telegram? Войдите через Google или email.',
    waiting: 'Нажмите Start в боте и поделитесь номером. Ждём…',
    codeSent: 'Код отправлен в Telegram. Введите его ниже.',
    expired: 'Ссылка устарела или уже использована. Начните заново.',
    restart: 'Начать заново',
    code: '6-значный код',
    signIn: 'Войти',
    resend: 'Отправить ещё раз',
    resendIn: (s: number) => `Повторная отправка через ${s} с`,
    emailAddress: 'Ваш email',
    sendEmail: 'Отправить код на email',
    emailSent: (to: string) => `Код отправлен на ${to} (проверьте и папку «Спам»).`,
    noMethods: 'Вход ещё не настроен. Попробуйте позже.',
    errors: {
      wrong_code: 'Неверный код.',
      code_expired: 'Код устарел. Запросите новый.',
      too_many_tries: 'Слишком много попыток. Запросите новый код.',
      rate_limited: 'Слишком часто. Попробуйте чуть позже.',
      too_many_sends: 'Коды для этого входа закончились. Начните заново.',
      bad_phone: 'Введите номер полностью, с +998.',
      bad_email: 'Проверьте email.',
      expired: 'Ссылка устарела. Начните заново.',
      not_configured: 'Этот способ ещё не настроен.',
      offline: 'Нет интернета. Проверьте подключение.',
      failed: 'Не удалось войти. Попробуйте ещё раз.',
    } as Record<string, string>,
  },
  en: {
    google: 'Sign in with Google',
    telegram: 'Telegram',
    email: 'Email',
    tabs: 'How to sign in',
    phone: 'Your phone number',
    getCode: 'Get the code in Telegram',
    steps: [
      'In the bot, tap “Start” (the bot cannot tap it for you)',
      'Send your number with “Share my number”',
      'Type the 6-digit code from the bot here',
    ],
    openBot: 'Open the bot',
    notOpened: 'The bot did not open by itself? Tap “Open the bot”.',
    inApp: 'To sign in with Google, open the site in Safari or Chrome.',
    inAppHint:
      'Copy the link and paste it into the browser. Telegram or email sign-in works right here.',
    qr: 'On a computer? Scan the QR code with your phone’s camera',
    copy: 'Copy the link',
    copied: 'Link copied',
    noTelegram: 'No Telegram? Sign in with Google or email.',
    waiting: 'Tap Start in the bot and share your number. Waiting…',
    codeSent: 'The code was sent to Telegram. Type it below.',
    expired: 'The link expired or was already used. Start again.',
    restart: 'Start again',
    code: '6-digit code',
    signIn: 'Sign in',
    resend: 'Send again',
    resendIn: (s: number) => `Send again in ${s} s`,
    emailAddress: 'Your email',
    sendEmail: 'Email me a code',
    emailSent: (to: string) => `The code was sent to ${to} (check the spam folder too).`,
    noMethods: 'Signing in is not set up yet. Try again a little later.',
    errors: {
      wrong_code: 'Wrong code.',
      code_expired: 'The code expired. Ask for a new one.',
      too_many_tries: 'Too many tries. Ask for a new code.',
      rate_limited: 'Too often. Try again in a moment.',
      too_many_sends: 'No more codes for this sign-in. Start again.',
      bad_phone: 'Type the full number, with +998.',
      bad_email: 'Check the email address.',
      expired: 'The link expired. Start again.',
      not_configured: 'This way is not set up yet.',
      offline: 'No internet. Check the connection.',
      failed: 'Could not sign in. Try again.',
    } as Record<string, string>,
  },
} satisfies Record<Language, unknown>

export type SignInText = (typeof SIGN_IN_TEXT)['uz']

export const RESEND_AFTER_MS = 30_000

/** Seconds left until `at` (0 when it passed or is unknown). */
export const secondsUntil = (at: number | null, now: number) =>
  at === null ? 0 : Math.max(0, Math.ceil((at - now) / 1000))

/** A QR picture of the bot link for a parent at a computer (downloaded only when shown). */
export async function qrOf(link: string): Promise<string> {
  const { default: qrcode } = await import('qrcode-generator')
  const qr = qrcode(0, 'M')
  qr.addData(link)
  qr.make()
  return qr.createDataURL(5, 2)
}

/** A phone (Android, iPhone, iPad): Telegram opens straight from a tg:// link there. */
export const isPhone = (ua: string = navigator.userAgent) => /Android|iPhone|iPad|iPod/i.test(ua)

/** https://t.me/<bot>?start=<token> as the app's own tg:// link. */
export function tgLink(link: string): string {
  const url = new URL(link)
  const start = url.searchParams.get('start') ?? ''
  return `tg://resolve?domain=${url.pathname.slice(1)}&start=${encodeURIComponent(start)}`
}

/** A browser inside an app (Telegram, Instagram, Facebook, LINE): Google refuses to sign in there. */
export const isInAppBrowser = (ua: string = navigator.userAgent, scope: object = window) =>
  /Telegram|Instagram|FBAN|FBAV|FB_IAB|\bLine\//i.test(ua) || 'TelegramWebviewProxy' in scope
