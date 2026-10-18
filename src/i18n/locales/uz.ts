export const uz = {
  common: {
    appName: 'Kiddo',
    home: 'Bosh sahifa',
    back: 'Orqaga',
    next: 'Keyingi',
    listen: 'Tinglash',
    listenAgain: 'Yana tinglash',
    start: 'Boshlash',
    parentArea: 'Ota-ona bo‘limi',
    coins: 'Coinlar',
    languageSwitcher: 'Tilni almashtirish',
  },
  language: {
    greeting: 'Salom! Kiddo’ga xush kelibsan!',
    question: 'Qaysi tilda o‘ynaymiz?',
    title: 'Tilni tanlang',
    parentLogin: 'Ota-ona uchun kirish',
  },
  home: {
    greeting: 'Salom, {{name}}!',
    greetingNoName: 'Salom!',
  },
}

type DeepStringRecord<T> = { [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]> }

export type Translation = DeepStringRecord<typeof uz>
