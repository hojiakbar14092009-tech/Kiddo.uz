import { enAlphabet } from '@/content/alphabet/en'
import { ruAlphabet } from '@/content/alphabet/ru'
import { uzAlphabet } from '@/content/alphabet/uz'
import type { Language } from '@/content/languages'
import { NUMBERS } from '@/content/numbers'
import { LEARN_SPOKEN } from '@/features/learn/spoken'
import { SPOKEN as THREE_WORDS } from '@/features/threeWords/spoken'
import { DINO_TEXT } from '@/features/worlds/dino/text'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import {
  feelingsSpoken,
  fillsFor,
  fillTemplate,
  type Params,
  uzbekistanSpoken,
} from './phraseFills'
import { splitSentences, tidyPhrase } from './phrases'
import { hasNumbers, numberWords, templatePieces } from './pieces'

/*
 * Every sentence Kiddo can say to a child (Phase 41): the letters and their
 * words, the numbers, the interface parts the robot reads aloud and the
 * learning sections' own lines. scripts/voices/collect.ts prints it for the
 * recorder, and childVoice.test.ts checks each one has a recording.
 */

export type Tree = { [key: string]: string | Tree }

/** Parts of the interface the robot reads aloud. */
export const SPOKEN_PARTS = [
  'learn',
  'task',
  'reward',
  'mascot',
  'age',
  'rest',
  'exam',
  'shop',
  'language',
  'pro.celebrateSay',
  // Phase 24–25: the birthday party and the welcome tour are said aloud
  'birthday',
  'welcome',
  // Phase 41: everything else a learning screen reads aloud (speakable.ts, the
  // tours for the youngest, the worlds' and labs' texts)
  'learnFirst',
  'letter',
  'tour',
  'feelings',
  'mathLab',
  'tutor',
  'uzbekistan',
  // Phase 49: the find-at-home prompts and praise, the own-story sentences and
  // the three-language cards' instruction (the words themselves: threeWords/spoken.ts, added below)
  'findHome.say',
  'myStory.say',
  'threeWords.say',
  // Phase 58–60: the attention helper's reminders, the science games and the cartoons' page
  'attention.say',
  'sciGames.done',
  'sciGames.water.intro',
  'sciGames.water.say',
  'sciGames.magnet.intro',
  'sciGames.magnet.say',
  'sciGames.float.intro',
  'sciGames.float.say',
  // Phase 65: the magic scale and the robot programmer
  'sciGames.scale.intro',
  'sciGames.scale.say',
  'sciGames.robot.intro',
  'sciGames.robot.say',
  // Phase 66: the word train and the little shop
  'sciGames.train.intro',
  'sciGames.train.say',
  'sciGames.shop.intro',
  'sciGames.shop.say',
  // Phase 67: the shape builder, who lives where, the healthy plate
  'sciGames.shapes.intro',
  'sciGames.shapes.need',
  'sciGames.shapes.made',
  'sciGames.shapes.say',
  'sciGames.habitats.intro',
  'sciGames.habitats.hint',
  'sciGames.habitats.say',
  'sciGames.plate.intro',
  'sciGames.plate.hint',
  'sciGames.plate.say',
  'shorts.say',
]
const COUNTS = Array.from({ length: 41 }, (_, i) => i)
/** While childPhrases runs: the templates it could not fill in. */
let unfilled: Set<string> | null = null

export function leaves(tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [[prefix + key, value] as [string, string]]
      : leaves(value, `${prefix}${key}.`),
  )
}

function expand(
  template: string,
  letters: readonly string[],
  words: readonly string[],
  /** The template's real values (phraseFills); none: filled below or left as a template. */
  params: readonly Params[] | undefined,
  language: Language,
): string[] {
  let texts = params ? params.map((values) => fillTemplate(template, values)) : [template]
  // every value put in, for a template said from pieces (numbers, lists)
  const used: (string | number)[] = (params ?? []).flatMap((values) => Object.values(values))
  if (template.includes('{{word}}')) {
    texts = letters.map((letter, index) =>
      template
        .split('{{letter}}')
        .join(letter)
        .split('{{word}}')
        .join(words[index] ?? ''),
    )
  }
  const fill = (name: string, values: readonly (string | number)[]) => {
    if (!texts.some((text) => text.includes(`{{${name}}}`))) return
    used.push(...values)
    texts = texts.flatMap((text) =>
      values.map((value) => text.split(`{{${name}}}`).join(String(value))),
    )
  }
  fill('letter', letters)
  fill('count', COUNTS)
  fill('age', [4, 5, 6])
  fill('learned', COUNTS)
  fill('total', [10, 26, 29, 30, 33])
  fill('correct', COUNTS.slice(0, 11))
  // The child's name is cut out; such clips are found without it (see withoutName).
  texts = texts.map((text) =>
    text.includes('{{name}}') ? tidyPhrase(text.split('{{name}}').join('')) : text,
  )
  // a text that still has a placeholder is filled in at run time with words
  // from the screen (a city, a number, a noun): it cannot be listed sentence by
  // sentence here, so it is kept apart as a template (childTemplates)
  if (texts.some((text) => /\{\{/.test(text))) unfilled?.add(template)
  const filled = texts.filter((text) => !/\{\{/.test(text))
  // a sentence with numbers or a list is not recorded whole (there would be thousands):
  // its fixed words, the numbers' words and the named things are recorded as pieces
  const pieced =
    /\{\{/.test(template) &&
    filled.length > 0 &&
    used.some((value) => hasNumbers(String(value)) || String(value).includes(', '))
  return pieced ? templatePieces(template, used, language) : filled
}

/** The words of every number 0–100: the pieces a number is said with. */
function allNumberWords(language: Language): string[] {
  return [...new Set(Array.from({ length: 101 }, (_, n) => numberWords(n, language) ?? []).flat())]
}

const sources = {
  uz: { tree: uz as unknown as Tree, alphabet: uzAlphabet },
  ru: { tree: ru as unknown as Tree, alphabet: ruAlphabet },
  en: { tree: en as unknown as Tree, alphabet: enAlphabet },
} as const

/**
 * What the app says from content files rather than the i18n tree, as named
 * parts (collect.ts --parts content.feelings, or "content" for all of them).
 */
export const CONTENT_PARTS: Record<string, (language: Language) => string[]> = {
  'content.alphabet': (language) =>
    sources[language].alphabet.letters.flatMap((letter) => [letter.spoken, letter.word]),
  // the numbers' own cards, and every word a number up to 100 is said with (pieces.ts)
  'content.numbers': (language) => [
    ...NUMBERS.map((entry) => entry.words[language]),
    ...allNumberWords(language),
  ],
  // the learning sections' own lines
  'content.learn': (language) => LEARN_SPOKEN[language],
  // Phase 49: the three-language cards' words, each said in its own language
  'content.threeWords': (language) => [...THREE_WORDS[language]],
  // the dinosaur world's own texts; {{name}} there is the dinosaur's, not the child's
  'content.dino': (language) => {
    const fills = fillsFor(language)
    const names = sources[language].alphabet.letters.map((letter) => letter.spoken)
    return leaves(DINO_TEXT[language] as unknown as Tree).flatMap(([key, value]) =>
      expand(value, names, [], fills.get(`worlds.dino.${key}`), language),
    )
  },
  'content.feelings': feelingsSpoken,
  'content.uzbekistan': uzbekistanSpoken,
  // Cheers are said in English whatever the language (see useMascot).
  'content.cheers': (language) =>
    language === 'en'
      ? ['Yahoooo!', 'Wow!', 'Hooray!', 'Yay!', 'Woohoo!', 'Oops!', 'Uh-oh!', 'Hmm!']
      : [],
}

const under = (key: string, list: readonly string[]) =>
  list.some((prefix) => key === prefix || key.startsWith(`${prefix}.`))

/** Every sentence the app can say to a child, per language (split into sentences). */
export function childPhrases(): Record<Language, string[]> {
  return collect().phrases
}

/**
 * The spoken lines filled in at run time (a placeholder such as {{city}} or
 * {{a}} stays) whose values are not listed in phraseFills: their recordings
 * cannot be checked sentence by sentence, so they are listed as they are.
 */
export function childTemplates(): Record<Language, string[]> {
  return collect().templates
}

function collect(): {
  phrases: Record<Language, string[]>
  templates: Record<Language, string[]>
} {
  const out = {} as Record<Language, string[]>
  const templates = {} as Record<Language, string[]>
  for (const language of Object.keys(sources) as Language[]) {
    unfilled = new Set<string>()
    const parts = [...SPOKEN_PARTS, ...Object.keys(CONTENT_PARTS)]
    out[language] = [...partPhrases(language, parts, [])]
    templates[language] = [...unfilled].sort()
    unfilled = null
  }
  return { phrases: out, templates }
}

/** The sentences of the i18n and content parts under `prefixes`, keys under `except` left out. */
function partPhrases(
  language: Language,
  prefixes: readonly string[],
  except: readonly string[],
): Set<string> {
  const { tree, alphabet } = sources[language]
  const fills = fillsFor(language)
  const phrases = new Set<string>()
  // a sentence with numbers or signs is said from pieces (pieces.ts): its pieces are listed
  const add = (text: string) =>
    splitSentences(text).forEach((sentence) =>
      hasNumbers(sentence)
        ? templatePieces(sentence, [], language).forEach((piece) => phrases.add(piece))
        : phrases.add(sentence),
    )
  const spokenNames = alphabet.letters.map((letter) => letter.spoken)
  const words = alphabet.letters.map((letter) => letter.word)
  for (const [key, value] of leaves(tree)) {
    if (!under(key, prefixes) || under(key, except)) continue
    expand(value, spokenNames, words, fills.get(key), language).forEach(add)
  }
  for (const [name, texts] of Object.entries(CONTENT_PARTS)) {
    if (under(name, prefixes) && !under(name, except)) texts(language).forEach(add)
  }
  return phrases
}

/**
 * The sentences of some interface parts only, per language (for recording a
 * part first, e.g. praise and instructions in the children's voices). Keys under
 * `except` are left out (labels and buttons the app never says aloud); a
 * sentence another key of the parts says stays.
 */
export function phrasesOfParts(
  prefixes: readonly string[],
  except: readonly string[] = [],
): Record<Language, string[]> {
  const out = {} as Record<Language, string[]>
  for (const language of Object.keys(sources) as Language[]) {
    out[language] = [...partPhrases(language, prefixes, except)]
  }
  return out
}
