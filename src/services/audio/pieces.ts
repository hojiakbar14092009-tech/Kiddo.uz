import type { Language } from '@/content/languages'

/*
 * Sentences with numbers or lists ("Savatda 3 ta olma bor edi.", "3 − 1 = 2",
 * "Dasturxonga osh, non va choy qo‘y!") are not recorded whole – there would be
 * thousands. They are said from pieces instead: the fixed words of the sentence,
 * each number as its words ("o‘ttiz" + "besh"), each sign as its word ("minus",
 * "teng") and each named thing, with a short pause between pieces. The same rules
 * list the pieces for the recorder (childPhrases) and find them when speaking
 * (voiceLibrary), so what is recorded is exactly what is looked up.
 */

/** The quiet between two pieces: short enough to sound like one sentence. */
export const PIECE_PAUSE_MS = 100
/** The longest run of words recorded as one piece. */
const MAX_PIECE_WORDS = 12

const UNITS: Record<Language, readonly string[]> = {
  uz: ['nol', 'bir', 'ikki', 'uch', 'toʻrt', 'besh', 'olti', 'yetti', 'sakkiz', 'toʻqqiz'],
  ru: [
    'ноль',
    'один',
    'два',
    'три',
    'четыре',
    'пять',
    'шесть',
    'семь',
    'восемь',
    'девять',
    'десять',
    'одиннадцать',
    'двенадцать',
    'тринадцать',
    'четырнадцать',
    'пятнадцать',
    'шестнадцать',
    'семнадцать',
    'восемнадцать',
    'девятнадцать',
  ],
  en: [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen',
  ],
}
const TENS: Record<Language, readonly string[]> = {
  uz: ['', 'oʻn', 'yigirma', 'oʻttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'toʻqson'],
  ru: [
    '',
    'десять',
    'двадцать',
    'тридцать',
    'сорок',
    'пятьдесят',
    'шестьдесят',
    'семьдесят',
    'восемьдесят',
    'девяносто',
  ],
  en: ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
}
const RU_HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
]

/** How the maths signs are said (Uzbek "teng" as on the Math Lab's sign cards). */
export const SIGN_WORDS: Record<Language, Readonly<Record<string, string>>> = {
  uz: {
    '+': 'qo‘shish',
    '−': 'minus',
    '-': 'minus',
    '=': 'teng',
    '×': 'ko‘paytirish',
    '÷': 'bo‘lish',
    '%': 'foiz',
  },
  ru: {
    '+': 'плюс',
    '−': 'минус',
    '-': 'минус',
    '=': 'равно',
    '×': 'умножить на',
    '÷': 'разделить на',
    '%': 'процентов',
  },
  en: {
    '+': 'plus',
    '−': 'minus',
    '-': 'minus',
    '=': 'equals',
    '×': 'times',
    '÷': 'divided by',
    '%': 'percent',
  },
}

/** The words of a whole number 0–999, one piece each; null for anything else. */
export function numberWords(n: number, language: Language): string[] | null {
  if (!Number.isInteger(n) || n < 0 || n > 999) return null
  const units = UNITS[language]
  const tens = TENS[language]
  const below100 = (k: number): string[] => {
    if (k === 0) return []
    if (k < units.length) return [units[k]!]
    const unit = k % 10
    return [tens[Math.floor(k / 10)]!, ...(unit ? [units[unit]!] : [])]
  }
  if (n === 0) return [units[0]!]
  const hundreds = Math.floor(n / 100)
  const rest = below100(n % 100)
  if (hundreds === 0) return rest
  if (language === 'ru') return [RU_HUNDREDS[hundreds]!, ...rest]
  const word = language === 'uz' ? 'yuz' : 'hundred'
  // Uzbek says "yuz" for 100, English "one hundred"
  const lead = hundreds === 1 && language === 'uz' ? [] : [units[hundreds]!]
  return [...lead, word, ...rest]
}

/** A piece as it is recorded and looked up: lower case, no punctuation. */
export function pieceText(text: string, language: Language): string {
  return text
    .normalize('NFC')
    .toLocaleLowerCase(language)
    .replace(/[.,!?:;…«»"“”„()[\]–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type Token = { kind: 'word'; text: string } | { kind: 'fixed'; text: string }

const SIGNS = /^[+−\-=×÷%]$/

/**
 * A sentence as words to group into pieces ('word') and pieces said as they are
 * ('fixed': number words, sign words). Null when a number cannot be said (too big,
 * a fraction), so the sentence stays whole.
 */
function tokens(sentence: string, language: Language): Token[] | null {
  const out: Token[] = []
  const signs = SIGN_WORDS[language]
  // numbers and signs stand apart from the words around them ("+5", "12m", "3−1")
  const spaced = sentence
    .normalize('NFC')
    .replace(/(\d+)/g, ' $1 ')
    .replace(/([+−=×÷%])/g, ' $1 ')
  const words = pieceText(spaced, language).split(' ').filter(Boolean)
  for (const [index, word] of words.entries()) {
    if (/^\d+$/.test(word)) {
      const said = numberWords(Number(word), language)
      if (!said) return null
      said.forEach((text) => out.push({ kind: 'fixed', text }))
    } else if (SIGNS.test(word)) {
      // "+5" on a counter is just "five"; a sign between numbers is said
      if (word === '+' && (index === 0 || !/^\d+$/.test(words[index - 1] ?? ''))) continue
      out.push({ kind: 'fixed', text: signs[word]! })
    } else out.push({ kind: 'word', text: word })
  }
  return out
}

/** Whether a sentence is said from pieces: it has a number or a maths sign. */
export function hasNumbers(sentence: string): boolean {
  return /\d|[−=×÷]/.test(sentence)
}

/**
 * The pieces to say a sentence with, each one recorded (`has`), fewest pieces first;
 * null when some part has no recording.
 */
export function piecesOf(
  sentence: string,
  language: Language,
  has: (piece: string) => boolean,
): string[] | null {
  const list = tokens(sentence, language)
  if (!list || list.length === 0) return null
  const out: string[] = []
  let run: string[] = []
  const flush = (): boolean => {
    if (run.length === 0) return true
    const found = segment(run, has)
    run = []
    if (!found) return false
    out.push(...found)
    return true
  }
  for (const token of list) {
    if (token.kind === 'word') {
      run.push(token.text)
      continue
    }
    if (!flush() || !has(token.text)) return null
    out.push(token.text)
  }
  return flush() ? out : null
}

/** Splits a run of words into recorded pieces, as few as possible (null: impossible). */
function segment(words: readonly string[], has: (piece: string) => boolean): string[] | null {
  // best[i]: the fewest pieces for words[0..i)
  const best: (string[] | null)[] = [[]]
  for (let end = 1; end <= words.length; end += 1) {
    best[end] = null
    for (let start = Math.max(0, end - MAX_PIECE_WORDS); start < end; start += 1) {
      const before = best[start]
      if (!before) continue
      const piece = words.slice(start, end).join(' ')
      if (!has(piece)) continue
      if (!best[end] || before.length + 1 < best[end]!.length) best[end] = [...before, piece]
    }
  }
  return best[words.length] ?? null
}

/**
 * The pieces to record for a template with numbers or lists: its fixed words (cut at
 * the placeholders and at commas, colons and dashes) and every value it is filled
 * with (numbers as their words, lists as their items and joining words).
 */
export function templatePieces(
  template: string,
  values: readonly (string | number)[],
  language: Language,
): string[] {
  const pieces = new Set<string>()
  const addText = (text: string) => {
    for (const part of text.split(/[,:;–—]|\{\{\w+\}\}|[.!?…](?:\s|$)/)) {
      const list = tokens(part, language) ?? []
      let run: string[] = []
      const flush = () => {
        if (run.length > 0) pieces.add(run.join(' '))
        run = []
      }
      for (const token of list) {
        if (token.kind === 'fixed') {
          flush()
          pieces.add(token.text)
        } else if (LIST_WORDS[language].includes(token.text)) {
          // "osh, non va choy": the joining word is a piece of its own
          flush()
          pieces.add(token.text)
        } else run.push(token.text)
      }
      flush()
    }
  }
  addText(template)
  values.forEach((value) => addText(String(value)))
  return [...pieces]
}

/** The words that join the last two things of a list. */
const LIST_WORDS: Record<Language, readonly string[]> = {
  uz: ['va'],
  ru: ['и'],
  en: ['and'],
}
