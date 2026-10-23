/*
 * Validation of a provider's output (docs/architecture/ai-tutor.md §6).
 * Model JSON is never trusted: the shape, the length for the learner's band,
 * the language, child safety and "no answer before hint level 4" are all
 * checked here. Anything else is refused and the client shows Kiddo's own
 * hint instead.
 */

import { MAX_REPLY_CHARS } from './policy.ts'
import { similarExample } from './request.ts'
import { isInLanguage, screenReply, type SafetyIssue } from './safety.ts'
import { ACTIONS, EMOTIONS, type TutorReply, type TutorRequest } from './types.ts'

export type ReplyProblem =
  'not-json' | 'no-message' | 'too-long' | 'wrong-language' | 'reveals-answer' | SafetyIssue

export type ReplyCheck = { ok: true; reply: TutorReply } | { ok: false; problem: ReplyProblem }

/** The JSON object in a provider's text (a ```json fence around it is tolerated). */
function parseObject(text: string): Record<string, unknown> | null {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  try {
    const value = JSON.parse(trimmed) as unknown
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Numbers written in the text as whole numbers ("15", not the 5 of "15"). */
function numbersIn(text: string): Set<string> {
  return new Set(
    (text.match(/(?<!\d|\d\.)\d{1,3}(?!\d|\.\d)/g) ?? []).map((n) => String(Number(n))),
  )
}

/** Number words 0–20 (the range of the exercises) in the three languages. */
const NUMBER_WORDS: Record<TutorRequest['language'], readonly string[]> = {
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
    'twenty',
  ],
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
    'двадцать',
  ],
  uz: [
    'nol',
    'bir',
    'ikki',
    'uch',
    'to‘rt',
    'besh',
    'olti',
    'yetti',
    'sakkiz',
    'to‘qqiz',
    'o‘n',
    'o‘n bir',
    'o‘n ikki',
    'o‘n uch',
    'o‘n to‘rt',
    'o‘n besh',
    'o‘n olti',
    'o‘n yetti',
    'o‘n sakkiz',
    'o‘n to‘qqiz',
    'yigirma',
  ],
}

/** "8 is bigger than 5", "8 больше, чем 5", "8 5 dan katta": a comparison said outright. */
const COMPARISON_STATED = [
  /\b(is|are)\s+(bigger|greater|larger|smaller|less|more|fewer)\s+than\b/i,
  /\b(is|are)\s+(equal|the same)\b/i,
  /(больше|меньше),?\s+чем/iu,
  /\d\s*(больше|меньше|равно)/iu,
  /dan\s+(katta|kichik|ko‘p|kam)/iu,
  /\bteng\b/iu,
]

function normalise(text: string): string {
  return text.toLowerCase().replace(/[ʻ'`’]/g, '‘')
}

/** A whole word; in Uzbek also with a common suffix ("beshta", "o‘nga"). */
function containsWord(text: string, word: string, uzbek: boolean): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const suffix = uzbek ? '(?:ta|ga|ni|da|dan|ning)?' : ''
  return new RegExp(`(?<![\\p{L}‘])${escaped}${suffix}(?![\\p{L}‘])`, 'iu').test(text)
}

/**
 * Below hint level 4 the reply must not say the answer: not as digits, not
 * as a number word (0–20), and for a sign question not as a stated
 * comparison. A number answer may appear only when it is already part of the
 * exercise (or of the worked example the server chose).
 */
export function revealsAnswer(message: string, request: TutorRequest): boolean {
  if (request.hintLevel >= 4) return false
  const answer = request.item.answer
  if (!/^\d+$/.test(answer)) {
    return message.includes(answer) || COMPARISON_STATED.some((re) => re.test(message))
  }
  const allowed = numbersIn(request.item.expression)
  if (request.intent === 'example') {
    const example = similarExample(request.item)
    if (example)
      for (const n of numbersIn(`${example.expression} ${example.answer}`)) allowed.add(n)
  }
  const key = String(Number(answer))
  if (allowed.has(key)) return false
  if (numbersIn(message).has(key)) return true
  const word = NUMBER_WORDS[request.language][Number(answer)]
  return word !== undefined && containsWord(normalise(message), word, request.language === 'uz')
}

export function checkReply(text: string, request: TutorRequest): ReplyCheck {
  const object = parseObject(text)
  if (!object) return { ok: false, problem: 'not-json' }
  if (typeof object.message !== 'string') return { ok: false, problem: 'no-message' }
  const message = object.message.normalize('NFC').replace(/\s+/gu, ' ').trim()
  if (message.length === 0) return { ok: false, problem: 'no-message' }
  if (message.length > MAX_REPLY_CHARS[request.band]) return { ok: false, problem: 'too-long' }
  const issue = screenReply(message)
  if (issue) return { ok: false, problem: issue }
  if (!isInLanguage(message, request.language)) return { ok: false, problem: 'wrong-language' }
  if (revealsAnswer(message, request)) return { ok: false, problem: 'reveals-answer' }
  const emotion = (EMOTIONS as readonly unknown[]).includes(object.emotion)
    ? (object.emotion as TutorReply['emotion'])
    : 'encouraging'
  const recommendedAction = (ACTIONS as readonly unknown[]).includes(object.recommendedAction)
    ? (object.recommendedAction as TutorReply['recommendedAction'])
    : 'retry'
  // the level is the one asked for, whatever the model wrote
  return { ok: true, reply: { message, emotion, hintLevel: request.hintLevel, recommendedAction } }
}
