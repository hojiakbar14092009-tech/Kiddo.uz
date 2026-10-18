import type { Translation } from './uz'

export const ru: Translation = {
  common: {
    appName: 'Kiddo',
    home: 'Главная',
    back: 'Назад',
    next: 'Дальше',
    listen: 'Слушать',
    listenAgain: 'Послушать ещё',
    start: 'Начать',
    parentArea: 'Раздел для родителей',
    coins: 'Монеты',
    languageSwitcher: 'Сменить язык',
  },
  language: {
    greeting: 'Привет! Добро пожаловать в Kiddo!',
    question: 'На каком языке поиграем?',
    title: 'Выберите язык',
    parentLogin: 'Вход для родителей',
  },
  home: {
    greeting: 'Привет, {{name}}!',
    greetingNoName: 'Привет!',
    alphabet: 'Алфавит',
  },
  alphabet: {
    title: 'Алфавит',
    hint: 'Нажми на букву, я её назову!',
  },
  letter: {
    hint: 'Буква в слове выделена цветом',
    position: '{{current}} / {{total}}',
    previous: 'Предыдущая буква',
    next: 'Следующая буква',
    backToAlphabet: 'Назад к алфавиту',
  },
  mascot: {
    tryAgain: 'Попробуем ещё!',
    girl: 'Робот-девочка',
    boy: 'Робот-мальчик',
    homeHello: 'Привет, {{name}}! Что будем учить сегодня?',
    homeHelloNoName: 'Привет! Что будем учить сегодня?',
  },
}
