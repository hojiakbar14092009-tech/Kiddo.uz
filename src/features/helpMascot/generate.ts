import type { Language } from '@/content/languages'
import type { LearnChild } from '@/features/learn/learnStore'
import { makeOptions, pick, randomInt, shuffle, type Rng } from '@/features/learn/random'
import { mixWithReview, notSameOrder } from '@/features/learn/review'
import { testLength, type LearnMode } from '@/features/learn/session'
import { COUNTERS, MATERIAL, spell, type FindItem, type HelpWord } from './content'

export type Level = 4 | 5 | 6

/** Something the mascot said: right, or with a mistake (`shown` differs from `right`). */
export type Claim =
  | { type: 'initial'; word: HelpWord; shown: string; right: string }
  | { type: 'spelling'; word: HelpWord; shown: string; right: string }
  | { type: 'sum'; op: '+' | '-'; a: number; b: number; shown: string; right: string }

/** Age 4: the mascot asks for a thing; the child finds it among two pictures. */
export interface FindQuestion {
  kind: 'find'
  id: string
  skill: string
  item: FindItem
  options: FindItem[]
}

/** Age 5: the mascot's answer has a mistake; the child picks the right one. */
export interface FixQuestion {
  kind: 'fix'
  id: string
  skill: string
  claim: Claim
  options: string[]
  counter: string
}

export interface SheetLine {
  id: string
  claim: Claim
}

/** Age 6: three answers, one wrong: spot it, then pick the right answer. */
export interface SpotQuestion {
  kind: 'spot'
  id: string
  skill: string
  lines: SheetLine[]
  wrongLine: string
  options: string[]
  counter: string
}

export type HelpQuestion = FindQuestion | FixQuestion | SpotQuestion

/** The answer the mascot gave and the right one: every mistake ends replaced by it. */
export function correction(q: FixQuestion | SpotQuestion): { wrong: string; right: string } {
  const claim = q.kind === 'fix' ? q.claim : q.lines.find((line) => line.id === q.wrongLine)!.claim
  return { wrong: claim.shown, right: claim.right }
}

export function claimOf(q: FixQuestion | SpotQuestion): Claim {
  return q.kind === 'fix' ? q.claim : q.lines.find((line) => line.id === q.wrongLine)!.claim
}

export function errorTypeOf(claim: Claim, chosen: string): string {
  if (claim.type === 'initial') return 'wrong-initial'
  if (claim.type === 'spelling') return 'letter-order'
  const diff = Number(chosen) - Number(claim.right)
  return Math.abs(diff) === 1 ? (diff > 0 ? 'counted-one-more' : 'counted-one-less') : 'wrong-sum'
}

/** How a value is shown: a letter, a word (“Mushuk”) or a number. */
export function showValue(claim: Claim, value: string, language: Language): string {
  return claim.type === 'spelling' ? spell([value], language) : value
}

export function questionCount(level: Level, mode: LearnMode): number {
  return mode === 'test' ? testLength(level) : testLength(level) + 1
}

/* ---------------- claims ---------------- */

const alike = (a: string, b: string) => a.charAt(0) === b.charAt(0)

function initials(language: Language): string[] {
  return [...new Set(MATERIAL[language].words.map((word) => word.letters[0]!))]
}

export function initialClaim(language: Language, word: HelpWord, wrong: boolean, rng: Rng): Claim {
  const right = word.letters[0]!
  const others = initials(language).filter((letter) => !alike(letter, right))
  return { type: 'initial', word, right, shown: wrong ? pick(others, rng) : right }
}

/** Wrong spellings of a word: two neighbouring letters swapped, or one letter left out. */
export function misspellings(word: HelpWord): string[] {
  const right = word.letters.join('')
  const out = new Set<string>()
  for (let i = 0; i + 1 < word.letters.length; i += 1) {
    const letters = [...word.letters]
    ;[letters[i], letters[i + 1]] = [letters[i + 1]!, letters[i]!]
    out.add(letters.join(''))
  }
  for (let i = 0; i < word.letters.length; i += 1) {
    out.add(word.letters.filter((_, index) => index !== i).join(''))
  }
  out.delete(right)
  return [...out]
}

export function spellingClaim(word: HelpWord, rng: Rng): Claim {
  return {
    type: 'spelling',
    word,
    right: word.letters.join(''),
    shown: pick(misspellings(word), rng),
  }
}

export function sumClaim(op: '+' | '-', max: number, wrong: boolean, rng: Rng): Claim {
  const a = op === '+' ? randomInt(1, max - 1, rng) : randomInt(2, max, rng)
  const b = op === '+' ? randomInt(1, max - a, rng) : randomInt(1, a - 1, rng)
  const c = op === '+' ? a + b : a - b
  let shown = c
  if (wrong) {
    const near = [c + 1, c - 1].filter((n) => n >= 0)
    const far = [c + 2, c - 2].filter((n) => n >= 0)
    shown = rng() < 0.75 ? pick(near, rng) : pick(far, rng)
  }
  return { type: 'sum', op, a, b, right: String(c), shown: String(shown) }
}

/** Three choices for fixing a claim: the right one and two others, never the mascot's wrong one. */
export function fixOptions(language: Language, claim: Claim, rng: Rng): string[] {
  let others: string[]
  if (claim.type === 'initial') {
    others = initials(language).filter((letter) => !alike(letter, claim.right))
  } else if (claim.type === 'spelling') {
    others = misspellings(claim.word)
  } else {
    const c = Number(claim.right)
    others = [c - 2, c - 1, c + 1, c + 2, c + 3].filter((n) => n >= 0).map(String)
  }
  return makeOptions(
    claim.right,
    others.filter((value) => value !== claim.shown),
    3,
    rng,
  )
}

/* ---------------- questions ---------------- */

function findQuestion(language: Language, item: FindItem, rng: Rng): FindQuestion {
  const all = MATERIAL[language].find.filter((other) => other.id !== item.id)
  const same = all.filter((other) => other.group === item.group)
  return {
    kind: 'find',
    id: `find:${item.id}`,
    skill: `find:${item.group}`,
    item,
    options: makeOptions(item, same.length > 0 ? same : all, 2, rng, (option) => option.id),
  }
}

function fixQuestion(language: Language, claim: Claim, rng: Rng): FixQuestion {
  const id =
    claim.type === 'sum'
      ? `fix-sum:${claim.a}${claim.op}${claim.b}`
      : `fix-${claim.type}:${claim.word.id}`
  return {
    kind: 'fix',
    id,
    skill: `fix:${claim.type}`,
    claim,
    options: fixOptions(language, claim, rng),
    counter: pick(COUNTERS, rng),
  }
}

type SpotKind = 'plus' | 'minus' | 'initial'

export function spotQuestion(language: Language, kind: SpotKind, rng: Rng): SpotQuestion {
  const wrongAt = randomInt(0, 2, rng)
  let claims: Claim[]
  if (kind === 'initial') {
    // three words that start with three different letters
    const words: HelpWord[] = []
    for (const word of shuffle(MATERIAL[language].words, rng)) {
      if (words.some((other) => alike(other.letters[0]!, word.letters[0]!))) continue
      words.push(word)
      if (words.length === 3) break
    }
    claims = words.map((word, index) => initialClaim(language, word, index === wrongAt, rng))
  } else {
    const seen = new Set<string>()
    claims = []
    while (claims.length < 3) {
      const claim = sumClaim(kind === 'plus' ? '+' : '-', 10, claims.length === wrongAt, rng)
      if (claim.type !== 'sum') continue
      const key = `${claim.a}${claim.op}${claim.b}`
      if (seen.has(key)) continue
      seen.add(key)
      claims.push(claim)
    }
  }
  const lines = claims.map((claim, index) => ({ id: `line-${index}`, claim }))
  const key = claims
    .map((claim) =>
      claim.type === 'sum'
        ? `${claim.a}${claim.op}${claim.b}`
        : claim.type === 'initial'
          ? claim.word.id
          : '',
    )
    .join('|')
  return {
    kind: 'spot',
    id: `spot-${kind}:${key}`,
    skill: `spot:${kind}`,
    lines,
    wrongLine: lines[wrongAt]!.id,
    options: fixOptions(language, claims[wrongAt]!, rng),
    counter: pick(COUNTERS, rng),
  }
}

const AGE5_SKILLS = [
  'fix:sum',
  'fix:initial',
  'fix:spelling',
  'fix:sum',
  'fix:initial',
  'fix:spelling',
]
const AGE6_KINDS: SpotKind[] = ['plus', 'initial', 'minus', 'plus', 'initial', 'minus']

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
}): HelpQuestion[] {
  const count = questionCount(level, mode)
  const idOf = (q: HelpQuestion) => q.id
  const skillOf = (q: HelpQuestion) => q.skill
  const material = MATERIAL[language]
  let questions: HelpQuestion[] = []

  if (level === 4) {
    const pool = material.find.map((item) => findQuestion(language, item, rng))
    // one thing from each group before the next one, so the pictures vary
    const picked = mixWithReview(pool, skillOf, learn, 'help', language, pool.length, rng, idOf)
    const byGroup = (n: number) =>
      picked.filter(
        (q) => q.kind === 'find' && q.item.group === ['fruit', 'animal', 'thing'][n % 3],
      )
    for (let n = 0; questions.length < count && n < pool.length; n += 1) {
      const next = byGroup(n).find((q) => !questions.includes(q))
      if (next) questions.push(next)
    }
  } else if (level === 5) {
    const pool: FixQuestion[] = [
      ...material.words.map((word) =>
        fixQuestion(language, initialClaim(language, word, true, rng), rng),
      ),
      ...material.words
        .filter((word) => word.letters.length >= 3)
        .map((word) => fixQuestion(language, spellingClaim(word, rng), rng)),
    ]
    const sums = new Map<string, FixQuestion>()
    for (let tries = 0; sums.size < 8 && tries < 200; tries += 1) {
      const q = fixQuestion(language, sumClaim('+', 5, true, rng), rng)
      sums.set(q.id, q)
    }
    pool.push(...sums.values())
    const usedWords = new Set<string>()
    for (const skill of new Set(AGE5_SKILLS.slice(0, count))) {
      const quota = AGE5_SKILLS.slice(0, count).filter((s) => s === skill).length
      const candidates = pool.filter(
        (q) => q.skill === skill && (q.claim.type === 'sum' || !usedWords.has(q.claim.word.id)),
      )
      const chosen = mixWithReview(candidates, skillOf, learn, 'help', language, quota, rng, idOf)
      for (const q of chosen) {
        if (q.kind === 'fix' && q.claim.type !== 'sum') usedWords.add(q.claim.word.id)
      }
      questions.push(...chosen)
    }
    questions = shuffle(questions, rng)
  } else {
    const kinds = AGE6_KINDS.slice(0, count)
    for (const kind of new Set(kinds)) {
      const quota = kinds.filter((k) => k === kind).length
      const pool = new Map<string, SpotQuestion>()
      for (let tries = 0; pool.size < 6 && tries < 100; tries += 1) {
        const q = spotQuestion(language, kind, rng)
        pool.set(q.id, q)
      }
      questions.push(
        ...mixWithReview([...pool.values()], skillOf, learn, 'help', language, quota, rng, idOf),
      )
    }
    questions = shuffle(questions, rng)
  }

  return notSameOrder(questions, idOf, lastOrder, rng)
}
