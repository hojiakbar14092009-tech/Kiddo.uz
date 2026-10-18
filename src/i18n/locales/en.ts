import type { Translation } from './uz'

export const en: Translation = {
  common: {
    appName: 'Kiddo',
    home: 'Home',
    back: 'Back',
    next: 'Next',
    listen: 'Listen',
    listenAgain: 'Listen again',
    start: 'Start',
    parentArea: 'Parent area',
    coins: 'Coins',
    languageSwitcher: 'Change language',
  },
  language: {
    greeting: 'Hi! Welcome to Kiddo!',
    question: 'Which language shall we play in?',
    title: 'Choose a language',
    parentLogin: 'Parent login',
  },
  home: {
    greeting: 'Hi, {{name}}!',
    greetingNoName: 'Hi!',
    alphabet: 'Alphabet',
  },
  alphabet: {
    title: 'Alphabet',
    hint: 'Tap a letter and I will say it!',
  },
  letter: {
    hint: 'The letter is coloured inside the word',
    position: '{{current}} / {{total}}',
    previous: 'Previous letter',
    next: 'Next letter',
    backToAlphabet: 'Back to the alphabet',
  },
  mascot: {
    tryAgain: 'Let’s try again!',
    girl: 'Girl robot',
    boy: 'Boy robot',
    homeHello: 'Hi, {{name}}! What shall we learn today?',
    homeHelloNoName: 'Hi! What shall we learn today?',
  },
}
