import { getAlphabet } from '@/content/alphabet'
import type { Language } from '@/content/languages'
import type { LearnChild } from '@/features/learn/learnStore'
import { makeOptions, pick, shuffle, type Rng } from '@/features/learn/random'
import { mixWithReview, notSameOrder } from '@/features/learn/review'
import { testLength, type LearnMode } from '@/features/learn/session'
import { MATERIAL, type Sentence, type Word } from './content'

export type Level = 4 | 5 | 6

/** Age 4: a big letter, two pictures – which one starts with it? */
export interface PickPictureQuestion {
  kind: 'pick-picture'
  id: string
  skill: string
  letter: string
  target: Word
  options: Word[]
}

/** Age 4: a picture, two letters – which one does it start with? */
export interface PickLetterQuestion {
  kind: 'pick-letter'
  id: string
  skill: string
  letter: string
  target: Word
  options: string[]
}

export interface Tile {
  id: string
  letter: string
}

/** Age 5: build the word of the picture from letter tiles, in order. */
export interface BuildQuestion {
  kind: 'build'
  id: string
  skill: string
  word: Word
  tiles: Tile[]
}

/** Age 6: read a word, choose its picture. */
export interface ReadWordQuestion {
  kind: 'read-word'
  id: string
  skill: string
  word: Word
  options: Word[]
}

/** Age 6: read a sentence, choose its picture. */
export interface ReadSentenceQuestion {
  kind: 'read-sentence'
  id: string
  skill: string
  sentence: Sentence
  /** Picture names. */
  options: string[]
}

/** Age 6: a word with one letter missing (and its picture), choose the letter. */
export interface MissingQuestion {
  kind: 'missing'
  id: string
  skill: string
  word: Word
  index: number
  options: string[]
}

export type WordQuestion =
  | PickPictureQuestion
  | PickLetterQuestion
  | BuildQuestion
  | ReadWordQuestion
  | ReadSentenceQuestion
  | MissingQuestion

export const VOWELS: Record<Language, readonly string[]> = {
  uz: ['A', 'E', 'I', 'O', 'U', 'Oʻ'],
  ru: ['А', 'Е', 'Ё', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я'],
  en: ['A', 'E', 'I', 'O', 'U'],
}

/** Letters never offered as a wrong option (signs, rare or easily confused letters). */
const NOT_OFFERED: Record<Language, readonly string[]> = {
  uz: ['ʼ'],
  ru: ['Ъ', 'Ь', 'Ё', 'Й', 'Щ'],
  en: ['Q', 'X'],
}

export function letterId(language: Language, letter: string): string {
  return getAlphabet(language).letters.find((entry) => entry.upper === letter)?.id ?? letter
}

/** How a letter is written as a big tile: its capital form (“Sh”, “Oʻ”). */
export function isVowel(language: Language, letter: string): boolean {
  return VOWELS[language].includes(letter)
}

/** C/V pattern of a word, e.g. “cvc”. */
export function patternOf(language: Language, word: Word): string {
  return word.letters.map((letter) => (isVowel(language, letter) ? 'v' : 'c')).join('')
}

/** Two letters look alike to a beginner (S/Sh, O/Oʻ, C/Ch, N/Ng). */
function alike(a: string, b: string): boolean {
  return a.charAt(0) === b.charAt(0)
}

function offeredLetters(language: Language): string[] {
  return getAlphabet(language)
    .letters.map((entry) => entry.upper)
    .filter((letter) => !NOT_OFFERED[language].includes(letter))
}

export function questionCount(level: Level, mode: LearnMode): number {
  return mode === 'test' ? testLength(level) : testLength(level) + 1
}

/* ---------------- age 4 ---------------- */

function pickPicture(language: Language, target: Word, rng: Rng): PickPictureQuestion {
  const letter = target.letters[0]!
  const others = MATERIAL[language].initial.filter(
    (word) => !alike(word.letters[0]!, letter) && word.picture !== target.picture,
  )
  return {
    kind: 'pick-picture',
    id: `pick-picture:${target.id}`,
    skill: `initial:${letterId(language, letter)}`,
    letter,
    target,
    options: makeOptions(target, others, 2, rng, (word) => word.id),
  }
}

function pickLetter(language: Language, target: Word, rng: Rng): PickLetterQuestion {
  const letter = target.letters[0]!
  const others = MATERIAL[language].initial
    .map((word) => word.letters[0]!)
    .filter((other) => !alike(other, letter))
  return {
    kind: 'pick-letter',
    id: `pick-letter:${target.id}`,
    skill: `initial:${letterId(language, letter)}`,
    letter,
    target,
    options: makeOptions(letter, others, 2, rng),
  }
}

/* ---------------- age 5 ---------------- */

export function buildQuestion(language: Language, word: Word, rng: Rng): BuildQuestion {
  const extra = shuffle(
    offeredLetters(language).filter(
      (letter) => !word.letters.some((own) => alike(own, letter) || own === letter),
    ),
    rng,
  )[0]!
  const tiles = word.letters.map((letter, index) => ({ id: `${index}`, letter }))
  tiles.push({ id: 'extra', letter: extra })
  let order = shuffle(tiles, rng)
  // never already in the right order
  for (
    let tries = 0;
    tries < 6 && order.map((t) => t.id).join() === tiles.map((t) => t.id).join();
    tries += 1
  ) {
    order = shuffle(tiles, rng)
  }
  return {
    kind: 'build',
    id: `build:${word.id}`,
    skill: `build:${patternOf(language, word)}`,
    word,
    tiles: order,
  }
}

/* ---------------- age 6 ---------------- */

function readWord(language: Language, word: Word, rng: Rng): ReadWordQuestion {
  const others = MATERIAL[language].read.filter((other) => other.picture !== word.picture)
  return {
    kind: 'read-word',
    id: `read-word:${word.id}`,
    skill: 'read:word',
    word,
    options: makeOptions(word, others, 3, rng, (option) => option.picture),
  }
}

function readSentence(language: Language, sentence: Sentence, rng: Rng): ReadSentenceQuestion {
  const others = MATERIAL[language].sentences
    .map((other) => other.picture)
    .filter((picture) => picture !== sentence.picture)
  return {
    kind: 'read-sentence',
    id: `read-sentence:${sentence.id}`,
    skill: 'read:sentence',
    sentence,
    options: makeOptions(sentence.picture, others, 3, rng),
  }
}

export function missingQuestion(
  language: Language,
  word: Word,
  rng: Rng,
  index?: number,
): MissingQuestion {
  const at = index ?? Math.floor(rng() * word.letters.length)
  const letter = word.letters[at]!
  const vowel = isVowel(language, letter)
  // wrong options of the other kind (a vowel for a consonant gap and back), so
  // no wrong option can make another real word
  const others = offeredLetters(language).filter(
    (other) => isVowel(language, other) !== vowel && !alike(other, letter),
  )
  return {
    kind: 'missing',
    id: `missing:${word.id}`,
    skill: `missing:${letterId(language, letter)}`,
    word,
    index: at,
    options: makeOptions(letter, others, 3, rng),
  }
}

/* ---------------- a session ---------------- */

const AGE6_KINDS = [
  'read-word',
  'read-sentence',
  'missing',
  'read-word',
  'missing',
  'read-sentence',
] as const

export interface WordsSession {
  questions: WordQuestion[]
  /** Age 5 learning: the word the mascot builds first, as a worked example. */
  example: Word | null
}

export function generateSession({
  language,
  level,
  mode,
  learn,
  lastOrder,
  rng = Math.random,
}: {
  language: Language
  level: Level
  mode: LearnMode
  learn: LearnChild
  lastOrder?: string
  rng?: Rng
}): WordsSession {
  const material = MATERIAL[language]
  const count = questionCount(level, mode)
  const idOfQ = (q: WordQuestion) => q.id
  let questions: WordQuestion[] = []
  let example: Word | null = null

  if (level === 4) {
    const pool = material.initial.map((word) =>
      rng() < 0.6 ? pickPicture(language, word, rng) : pickLetter(language, word, rng),
    )
    // never the same first letter twice in one session
    const picked = mixWithReview(
      pool,
      (q) => q.skill,
      learn,
      'words',
      language,
      pool.length,
      rng,
      idOfQ,
    )
    const seen = new Set<string>()
    for (const q of picked) {
      if (questions.length >= count) break
      if (seen.has(q.skill)) continue
      seen.add(q.skill)
      questions.push(q)
    }
  } else if (level === 5) {
    const pool = material.build.map((word) => buildQuestion(language, word, rng))
    questions = mixWithReview(pool, (q) => q.skill, learn, 'words', language, count, rng, idOfQ)
    if (mode === 'learn') {
      const used = new Set(questions.map((q) => (q as BuildQuestion).word.id))
      const rest = material.build.filter((word) => !used.has(word.id) && word.letters.length <= 3)
      example = rest.length > 0 ? pick(rest, rng) : null
    }
  } else {
    const kinds = AGE6_KINDS.slice(0, count)
    const usedWords = new Set<string>()
    for (const kind of ['read-word', 'read-sentence', 'missing'] as const) {
      const quota = kinds.filter((k) => k === kind).length
      if (quota === 0) continue
      const pool: WordQuestion[] =
        kind === 'read-sentence'
          ? material.sentences.map((s) => readSentence(language, s, rng))
          : material.read
              .filter((word) => !usedWords.has(word.id))
              .map((word) =>
                kind === 'read-word'
                  ? readWord(language, word, rng)
                  : missingQuestion(language, word, rng),
              )
      const chosen = mixWithReview(
        pool,
        (q) => q.skill,
        learn,
        'words',
        language,
        quota,
        rng,
        idOfQ,
      )
      for (const q of chosen) {
        if (q.kind === 'read-word' || q.kind === 'missing') usedWords.add(q.word.id)
      }
      questions.push(...chosen)
    }
    questions = shuffle(questions, rng)
  }

  return { questions: notSameOrder(questions, idOfQ, lastOrder, rng), example }
}

/** The right answer of a choice question, as the id used by its options. */
export function correctChoice(q: Exclude<WordQuestion, BuildQuestion>): string {
  switch (q.kind) {
    case 'pick-picture':
      return q.target.id
    case 'pick-letter':
      return q.letter
    case 'read-word':
      return q.word.picture
    case 'read-sentence':
      return q.sentence.picture
    case 'missing':
      return q.word.letters[q.index]!
  }
}

export function choiceIds(q: Exclude<WordQuestion, BuildQuestion>): string[] {
  switch (q.kind) {
    case 'pick-picture':
      return q.options.map((word) => word.id)
    case 'read-word':
      return q.options.map((word) => word.picture)
    default:
      return q.options
  }
}

export const ERROR_TYPE: Record<WordQuestion['kind'], string> = {
  'pick-picture': 'wrong-initial',
  'pick-letter': 'wrong-initial',
  build: 'letter-order',
  'read-word': 'misread-word',
  'read-sentence': 'misread-sentence',
  missing: 'wrong-letter',
}
