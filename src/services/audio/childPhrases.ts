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
import { splitSentences, tidyPhrase } from './phrases'

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

function expand(template: string, letters: readonly string[], words: readonly string[]): string[] {
  let texts = [template]
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
    if (!template.includes(`{{${name}}}`)) return
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
  return texts.filter((text) => !/\{\{/.test(text))
}

const sources = {
  uz: { tree: uz as unknown as Tree, alphabet: uzAlphabet },
  ru: { tree: ru as unknown as Tree, alphabet: ruAlphabet },
  en: { tree: en as unknown as Tree, alphabet: enAlphabet },
} as const

/** Every sentence the app can say to a child, per language (split into sentences). */
export function childPhrases(): Record<Language, string[]> {
  return collect().phrases
}

/**
 * The spoken lines filled in at run time (a placeholder such as {{city}} or
 * {{a}} stays): their recordings cannot be checked sentence by sentence, so
 * they are listed as they are, for the recorder to cover with real values.
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
  for (const [language, { tree, alphabet }] of Object.entries(sources)) {
    const phrases = new Set<string>()
    unfilled = new Set<string>()
    const add = (text: string) => splitSentences(text).forEach((sentence) => phrases.add(sentence))
    const spokenNames = alphabet.letters.map((letter) => letter.spoken)
    for (const letter of alphabet.letters) {
      add(letter.spoken)
      add(letter.word)
    }
    for (const entry of NUMBERS) add(entry.words[language as 'uz' | 'ru' | 'en'])
    for (const [key, value] of leaves(tree)) {
      if (!SPOKEN_PARTS.some((prefix) => key === prefix || key.startsWith(`${prefix}.`))) continue
      expand(
        value,
        spokenNames,
        alphabet.letters.map((letter) => letter.word),
      ).forEach(add)
    }
    // The dinosaur world's own texts (its content file).
    for (const [, value] of leaves(DINO_TEXT[language as Language] as unknown as Tree)) {
      expand(value, spokenNames, []).forEach(add)
    }
    // The new learning sections (their own content files).
    LEARN_SPOKEN[language as 'uz' | 'ru' | 'en'].forEach(add)
    // Phase 49: the three-language cards' words, each said in its own language
    // (kept apart from LEARN_SPOKEN, whose lines must all be recorded already:
    // new words wait in pendingRecordings.json until the next recording)
    THREE_WORDS[language as Language].forEach(add)
    // Cheers are said in English whatever the language (see useMascot).
    if (language === 'en') {
      ;['Yahoooo!', 'Wow!', 'Hooray!', 'Yay!', 'Woohoo!', 'Oops!', 'Uh-oh!', 'Hmm!'].forEach(add)
    }
    out[language as Language] = [...phrases]
    templates[language as Language] = [...unfilled].sort()
    unfilled = null
  }
  return { phrases: out, templates }
}
