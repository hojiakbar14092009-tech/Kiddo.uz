/*
 * Child-safety checks on every provider reply (docs/architecture/ai-tutor.md
 * §6). The request side needs no screening of its own: there is no free text
 * (request.ts accepts numbers and codes only). A reply that fails any check
 * is never shown; the client then uses Kiddo's own hint instead.
 *
 * Word lists are deliberately short and conservative: they catch what must
 * never reach a young child, and a false alarm only means the local hint is
 * shown instead of the AI one.
 */

import type { TutorLanguage } from './types.ts'

export type SafetyIssue =
  'contact' | 'unsafe' | 'label' | 'dependency' | 'policy-leak' | 'too-many-emoji'

const LETTER_B = '(?<![\\p{L}\\p{M}])'
const LETTER_E = '(?![\\p{L}\\p{M}])'

function words(list: readonly string[], whole = true): RegExp {
  const body = list.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return new RegExp(whole ? `${LETTER_B}(?:${body})${LETTER_E}` : `${LETTER_B}(?:${body})`, 'iu')
}

/** Links, e-mail, phone numbers, social handles. */
const CONTACT = [/:\/\//, /\bwww\./i, /@/, /\b[a-z0-9-]+\.(com|uz|ru|org|net|io|app)\b/i]

/** A phone number: a run of digits, spaces, brackets and dashes holding 9 or more digits. */
function hasPhoneNumber(text: string): boolean {
  for (const run of text.match(/\+?[\d()][\d\s()-]{6,}/g) ?? []) {
    if ((run.match(/\d/g) ?? []).length >= 9) return true
  }
  return false
}

/** Whole words (or word starts, for the inflected Russian and Uzbek stems). */
const UNSAFE_WHOLE = words([
  'kill',
  'killed',
  'blood',
  'gun',
  'guns',
  'weapon',
  'weapons',
  'sex',
  'sexy',
  'naked',
  'drug',
  'drugs',
  'alcohol',
  'beer',
  'wine',
  'die',
  'dead',
  'death',
  'suicide',
  'hate',
  'stupid',
  'dumb',
  'idiot',
  'shut up',
  'qon',
  'qurol',
  'pivo',
  'aroq',
  'vino',
])
const UNSAFE_STEMS = words(
  [
    'убий',
    'убит',
    'убива',
    'кровь',
    'кровав',
    'оружи',
    'пистолет',
    'секс',
    'голы',
    'наркот',
    'алкогол',
    'пиво',
    'водк',
    'смерт',
    'умер',
    'самоубий',
    'ненави',
    'дурак',
    'туп',
    'глуп',
    'идиот',
    'o‘ldir',
    "o'ldir",
    'jinsiy',
    'yalang‘och',
    "yalang'och",
    'giyohvand',
    'ahmoq',
    'tentak',
    'jinni',
    'nafrat',
    'o‘lim',
    "o'lim",
  ],
  false,
)

/** Words that label the child instead of the step. */
const LABELS_WHOLE = words(['lazy', 'slow', 'weak', 'bad at', 'not smart'])
const LABEL_STEMS = words(
  ['ленив', 'слабак', 'неспособн', 'dangasa', 'zaif', 'qobiliyatsiz'],
  false,
)

/** Emotional-dependency phrases (the tutor is a helper, not a replacement for people). */
const DEPENDENCY = [
  /only friend/i,
  /miss(ed)? you/i,
  /don'?t (leave|go)/i,
  /stay with me/i,
  /единственн\S* друг/iu,
  /скуча/iu,
  /не уходи/iu,
  /yagona do[‘'ʻ]?st/iu,
  /sog[‘'ʻ]?in/iu,
  /tashlab ketma/iu,
]

/** The policy, prompts or raw data leaking into the reply. */
const POLICY_LEAK = [
  /system prompt/i,
  /\binstruction/i,
  /\bpolicy\b/i,
  /kiddo tutor/i,
  /```/,
  /[{}[\]<>]{2,}/,
  /инструкц/iu,
  /ko[‘'ʻ]?rsatma/iu,
  /yo[‘'ʻ]?riqnoma/iu,
]

const EMOJI = /\p{Extended_Pictographic}/gu

/** The first problem found in a reply, or null when it is fine for a child. */
export function screenReply(message: string): SafetyIssue | null {
  if (CONTACT.some((re) => re.test(message)) || hasPhoneNumber(message)) return 'contact'
  if (UNSAFE_WHOLE.test(message) || UNSAFE_STEMS.test(message)) return 'unsafe'
  if (LABELS_WHOLE.test(message) || LABEL_STEMS.test(message)) return 'label'
  if (DEPENDENCY.some((re) => re.test(message))) return 'dependency'
  if (POLICY_LEAK.some((re) => re.test(message))) return 'policy-leak'
  if ((message.match(EMOJI) ?? []).length > 1) return 'too-many-emoji'
  return null
}

// ------------------------------------------------------------ language

const CYRILLIC = /\p{Script=Cyrillic}/gu
const LATIN = /\p{Script=Latin}/gu

const EN_WORDS = new Set([
  'the',
  'is',
  'are',
  'and',
  'you',
  'your',
  'let',
  "let's",
  'lets',
  'how',
  'many',
  'what',
  'try',
  'count',
  'look',
  'number',
  'we',
  'it',
  'this',
  'that',
  'again',
  'one',
  'more',
  'start',
  'then',
  'add',
  'take',
  'away',
  'left',
  'together',
  'good',
  'great',
  'almost',
  'can',
  'do',
  'which',
  'here',
  'there',
  'now',
  'first',
  'next',
  'step',
  'hop',
  'right',
])
const UZ_WORDS = new Set([
  'va',
  'bu',
  'bilan',
  'qani',
  'keling',
  'yana',
  'nechta',
  'son',
  'sonni',
  'sana',
  'sanaymiz',
  'birga',
  'endi',
  'misol',
  'misolni',
  'javob',
  'qara',
  'qarang',
  'qadam',
  'ta',
  'bor',
  'emas',
  'kerak',
  'bir',
  'ikki',
  'uch',
  'qil',
  'avval',
  'keyin',
  'juda',
  'yaxshi',
  'zo‘r',
  'qo‘sh',
  'qo‘shamiz',
  'ayir',
  'ayiramiz',
  'sakra',
  'o‘ngga',
  'chapga',
  'qolgan',
  'qoldi',
  'necha',
  'hammasi',
  'ham',
  'deyarli',
  'urinish',
  'tanla',
  'bos',
])

function tokens(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(/[ʻ'`’]/g, '‘')
      .match(/[\p{L}‘]+/gu) ?? []
  )
}

/** Is the reply written in this language (and not in one of the other two)? */
export function isInLanguage(message: string, language: TutorLanguage): boolean {
  const cyr = (message.match(CYRILLIC) ?? []).length
  const lat = (message.match(LATIN) ?? []).length
  const letters = cyr + lat
  if (letters === 0) return false
  if (language === 'ru') return cyr / letters >= 0.9
  if (cyr > 0) return false
  const list = tokens(message)
  const en = list.filter((w) => EN_WORDS.has(w)).length
  const uz = list.filter((w) => UZ_WORDS.has(w) || /[og]‘/.test(w)).length
  return language === 'uz' ? uz >= 1 && uz >= en : en >= 1 && en > uz
}
