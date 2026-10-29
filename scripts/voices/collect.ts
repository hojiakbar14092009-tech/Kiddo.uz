/**
 * Lists every sentence the app can say, per language, for the voice recorder
 * (generate.py). Run: npx tsx --tsconfig tsconfig.app.json scripts/voices/collect.ts > scripts/voices/phrases.json
 */
import { enAlphabet } from '../../src/content/alphabet/en'
import { ruAlphabet } from '../../src/content/alphabet/ru'
import { uzAlphabet } from '../../src/content/alphabet/uz'
import { NUMBERS } from '../../src/content/numbers'
import { en } from '../../src/i18n/locales/en'
import { ru } from '../../src/i18n/locales/ru'
import { uz } from '../../src/i18n/locales/uz'
import { LEARN_SPOKEN } from '../../src/features/learn/spoken'
import { splitSentences, tidyPhrase } from '../../src/services/audio/phrases'

type Tree = { [key: string]: string | Tree }

/** Parts of the interface the robot reads aloud. */
const SPOKEN = [
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
]
const COUNTS = Array.from({ length: 41 }, (_, i) => i)

function leaves(tree: Tree, prefix = ''): [string, string][] {
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
  return texts.filter((text) => !/\{\{/.test(text))
}

const sources = {
  uz: { tree: uz as unknown as Tree, alphabet: uzAlphabet },
  ru: { tree: ru as unknown as Tree, alphabet: ruAlphabet },
  en: { tree: en as unknown as Tree, alphabet: enAlphabet },
} as const

const out: Record<string, string[]> = {}
for (const [language, { tree, alphabet }] of Object.entries(sources)) {
  const phrases = new Set<string>()
  const add = (text: string) => splitSentences(text).forEach((sentence) => phrases.add(sentence))
  const spokenNames = alphabet.letters.map((letter) => letter.spoken)
  for (const letter of alphabet.letters) {
    add(letter.spoken)
    add(letter.word)
  }
  for (const entry of NUMBERS) add(entry.words[language as 'uz' | 'ru' | 'en'])
  for (const [key, value] of leaves(tree)) {
    if (!SPOKEN.some((prefix) => key === prefix || key.startsWith(`${prefix}.`))) continue
    expand(
      value,
      spokenNames,
      alphabet.letters.map((letter) => letter.word),
    ).forEach(add)
  }
  // The new learning sections (their own content files).
  LEARN_SPOKEN[language as 'uz' | 'ru' | 'en'].forEach(add)
  // Cheers are said in English whatever the language (see useMascot).
  if (language === 'en') {
    ;['Yahoooo!', 'Wow!', 'Hooray!', 'Yay!', 'Woohoo!', 'Oops!', 'Uh-oh!', 'Hmm!'].forEach(add)
  }
  out[language] = [...phrases]
}
process.stdout.write(JSON.stringify(out, null, 1))
