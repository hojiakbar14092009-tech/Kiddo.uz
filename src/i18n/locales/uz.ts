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
    alphabet: 'Alifbo',
  },
  alphabet: {
    title: 'Alifbo',
    hint: 'Harfni bos, men aytib beraman!',
  },
  letter: {
    hint: 'Harf so‘z ichida rangli bo‘lib turibdi',
    position: '{{current}} / {{total}}',
    previous: 'Oldingi harf',
    next: 'Keyingi harf',
    backToAlphabet: 'Alifboga qaytish',
  },
}

type DeepStringRecord<T> = { [K in keyof T]: T[K] extends string ? string : DeepStringRecord<T[K]> }

export type Translation = DeepStringRecord<typeof uz>
