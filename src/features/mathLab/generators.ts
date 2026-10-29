import { seededRandom } from '@/lib/random'
import type { ChallengeLevel } from '@/domain/learner'
import { OBJECTS, type MathObject } from '@/features/math/generators'
import { makeOptions, shuffle, type Rng } from '@/features/learn/random'

/*
 * Math Lab questions by challenge level (domain/learner), never by age.
 *
 * L1  count objects up to 5, "one more", which group has more, put N in the basket
 * L2  add / subtract within 10 with objects, "one less", put N in the basket
 * L3  add / subtract within 10, missing number (3 + ? = 5), compare numbers (<, >, =)
 * L4  within 20, missing number on either side, number before / after / between
 * L5  mixed operations within 20, two steps (5 + 3 − 2), short word problems
 *
 * Every question has exactly one right answer, no result (or step) is ever
 * negative, and the wrong options are mistakes a child really makes: one
 * more or one less, the other operation, a number from the question;
 * like the question itself, they never leave the level's range (levelMax).
 * Pure functions: pass a seeded `rng` (learn/random) for repeatable tests.
 */

export type LabKind =
  | 'drag'
  | 'count'
  | 'one-more'
  | 'compare-groups'
  | 'add'
  | 'sub'
  | 'one-less'
  | 'missing'
  | 'compare'
  | 'before'
  | 'after'
  | 'between'
  | 'two-step'
  | 'word'

export type Op = '+' | '-'
export type Sign = '<' | '>' | '='

/** One token of a written example: a number, the hidden number, an operation or "=". */
export type Token = number | '?' | Op | '='

/** What the question shows above the answers. */
export type Scene =
  /** A group of objects (count, one more, one less: `change` objects come or go). */
  | { type: 'group'; count: number; change?: 1 | -1 }
  /** Two groups to compare; the answers are the groups themselves. */
  | { type: 'none' }
  /** Objects with an operation: `a + b` side by side, `a − b` with b crossed out. */
  | { type: 'objects'; a: number; b: number; op: Op }
  /** A written example, e.g. [3, '+', '?', '=', 5]. */
  | { type: 'equation'; tokens: Token[] }
  /** Two numbers with a box for the sign between them. */
  | { type: 'compare'; a: number; b: number }
  /** Numbers in a row with one hidden: [12, '?'] or [12, '?', 14]. */
  | { type: 'sequence'; cells: (number | '?')[] }
  /** A word problem: the text says it all; a basket with the first group. */
  | { type: 'word'; a: number }
  /** Drag (or tap) objects into the basket. */
  | { type: 'basket'; target: number; available: number }

/** What help shows after a mistake (or when the bulb is pressed). */
export type HelpVisual =
  /** Groups of objects, each numbered when counted; `crossed` of the last group are taken away. */
  | { type: 'objects'; groups: number[]; crossed?: number; continued?: boolean }
  /** A number line from `from` to `to`: start at `start`, walk to `end` (marks = numbers to show). */
  | { type: 'line'; from: number; to: number; start: number; end: number; marks?: number[] }
  /** Big numbers (mastery): the two numbers written in columns, ones under ones. */
  | { type: 'columns'; a: number; b: number; op: Op }

export interface HelpText {
  key: HelpKey
  params: Record<string, string | number>
}

export type HelpKey =
  | 'columnsAdd'
  | 'columnsSub'
  | 'count'
  | 'oneMore'
  | 'oneLess'
  | 'compareGroups'
  | 'addObjects'
  | 'subObjects'
  | 'addLine'
  | 'subLine'
  | 'missingAdd'
  | 'missingSub'
  | 'compare'
  | 'neighbors'
  | 'twoStep'
  | 'drag'

export type PromptKey =
  | 'count'
  | 'oneMore'
  | 'oneLess'
  | 'compareGroups'
  | 'addObjects'
  | 'subObjects'
  | 'equation'
  | 'compare'
  | 'before'
  | 'after'
  | 'between'
  | 'wordAdd'
  | 'wordSub'
  | 'drag'

export type OptionShow = 'number' | 'dots' | 'group' | 'sign'

export interface LabOption {
  id: string
  value: number | Sign
  show: OptionShow
}

export interface LabQuestion {
  /** Unique in a session, e.g. `add:3+4`. */
  id: string
  kind: LabKind
  /** The skill a mistake is recorded under, e.g. `sub:within10`, `missing:add`. */
  skill: string
  level: ChallengeLevel
  object: MathObject
  prompt: { key: PromptKey; params: Record<string, string | number> }
  scene: Scene
  /** Id of the right option (for 'drag': the number to put in the basket). */
  answer: string
  /** Empty for 'drag'. */
  options: LabOption[]
  help: { visual: HelpVisual; text: HelpText }
  /** Why a wrong option is wrong (option id → error type), for the record. */
  errors: Record<string, string>
  /** A spaced review of a skill the learning memory says is due (Phase 10). */
  review?: boolean
  /** Mastery step above level 5 the question was made for (0 or missing below it). */
  mastery?: number
}

// ------------------------------------------------------------------ helpers

/** Objects easy to count and to put in a basket. */
export const LAB_OBJECTS: readonly MathObject[] = OBJECTS

/** The number of questions in a session: 5 for levels 1–2, 6 from level 3. */
export function sessionLength(level: ChallengeLevel): number {
  return level <= 2 ? 5 : 6
}

/** How many answer cards a level shows (pictures are bigger, so fewer). */
export function optionCount(level: ChallengeLevel): number {
  return level <= 2 ? 3 : 4
}

/** Highest number a level uses. */
export function levelMax(level: ChallengeLevel): number {
  if (level === 1) return 5
  if (level <= 3) return 10
  return 20
}

function range(from: number, to: number): number[] {
  const out: number[] = []
  for (let n = from; n <= to; n += 1) out.push(n)
  return out
}

/** All pairs (a, b) with a in A, b in B that pass `keep`. */
function pairs(
  as: readonly number[],
  bs: readonly number[],
  keep: (a: number, b: number) => boolean,
): [number, number][] {
  const out: [number, number][] = []
  for (const a of as) for (const b of bs) if (keep(a, b)) out.push([a, b])
  return out
}

/**
 * The first candidate (in a random order) whose id is not used yet; the first
 * of all when every one is used. Never loops, even with a constant rng.
 */
function fresh<T>(
  candidates: readonly T[],
  used: ReadonlySet<string>,
  id: (c: T) => string,
  rng: Rng,
): T {
  if (candidates.length === 0) throw new Error('no candidate for a question')
  const order = shuffle(candidates, rng)
  return order.find((c) => !used.has(id(c))) ?? order[0]!
}

/**
 * Number options: the answer and plausible mistakes (in the order given,
 * most likely first), padded with neighbours when the mistakes are too few.
 * Never negative, never above `max`, all different.
 */
export function numberOptions(
  answer: number,
  mistakes: readonly { value: number; error: string }[],
  count: number,
  max: number,
  rng: Rng,
  show: OptionShow = 'number',
): { options: LabOption[]; errors: Record<string, string> } {
  const ok = (n: number) => Number.isInteger(n) && n >= 0 && n <= max && n !== answer
  const chosen: { value: number; error: string }[] = []
  const seen = new Set<number>([answer])
  const add = (value: number, error: string) => {
    if (chosen.length >= count - 1 || !ok(value) || seen.has(value)) return
    seen.add(value)
    chosen.push({ value, error })
  }
  for (const m of mistakes) add(m.value, m.error)
  for (let k = 1; chosen.length < count - 1 && k <= max + 1; k += 1) {
    add(answer + k, 'off-by-more')
    add(answer - k, 'off-by-more')
  }
  const toOption = (value: number): LabOption => ({ id: String(value), value, show })
  const options = makeOptions(
    toOption(answer),
    chosen.map((c) => toOption(c.value)),
    count,
    rng,
    (o) => o.id,
  )
  const errors: Record<string, string> = {}
  for (const c of chosen) errors[String(c.value)] = c.error
  return { options, errors }
}

const near = (answer: number) => [
  { value: answer + 1, error: 'off-by-one' },
  { value: answer - 1, error: 'off-by-one' },
]

/** A number line window around the numbers that matter (at least 6 cells, inside 0–20). */
export function lineWindow(numbers: readonly number[], span = 6): { from: number; to: number } {
  const lo = Math.max(0, Math.min(...numbers) - 1)
  let hi = Math.min(20, Math.max(...numbers) + 1)
  let from = lo
  if (hi - from + 1 < span) hi = Math.min(20, from + span - 1)
  if (hi - from + 1 < span) from = Math.max(0, hi - span + 1)
  return { from, to: hi }
}

function lineHelp(start: number, end: number, extra: number[] = []): HelpVisual {
  const { from, to } = lineWindow([start, end, ...extra])
  return { type: 'line', from, to, start, end }
}

// ------------------------------------------------------------------ makers

interface MakeContext {
  level: ChallengeLevel
  rng: Rng
  used: ReadonlySet<string>
  object: MathObject
  /** Answer cards from the adaptive plan (2–4); the level's own count without it. */
  options?: number
}

/** The answer cards of a question: the adaptive plan's count, else the level's. */
function optionsOf(c: MakeContext): number {
  return Math.min(4, Math.max(2, Math.round(c.options ?? optionCount(c.level))))
}

type Maker = (c: MakeContext) => LabQuestion

const base = (c: MakeContext) => ({ level: c.level, object: c.object })

const makeDrag: Maker = (c) => {
  const targets = c.level === 1 ? range(1, 5) : range(3, 8)
  const target = fresh(targets, c.used, (n) => `drag:${n}`, c.rng)
  return {
    ...base(c),
    id: `drag:${target}`,
    kind: 'drag',
    skill: c.level === 1 ? 'drag:to5' : 'drag:to10',
    prompt: { key: 'drag', params: { target } },
    scene: { type: 'basket', target, available: target + 2 },
    answer: String(target),
    options: [],
    help: {
      visual: { type: 'objects', groups: [target] },
      text: { key: 'drag', params: { target } },
    },
    errors: {},
  }
}

const makeCount: Maker = (c) => {
  const n = fresh(range(1, 5), c.used, (k) => `count:${k}`, c.rng)
  const { options, errors } = numberOptions(
    n,
    [...near(n), { value: n + 2, error: 'off-by-more' }],
    optionsOf(c),
    levelMax(c.level),
    c.rng,
    'dots',
  )
  return {
    ...base(c),
    id: `count:${n}`,
    kind: 'count',
    skill: 'count:to5',
    prompt: { key: 'count', params: {} },
    scene: { type: 'group', count: n },
    answer: String(n),
    options,
    help: { visual: { type: 'objects', groups: [n] }, text: { key: 'count', params: {} } },
    errors,
  }
}

const makeOneMore: Maker = (c) => {
  const n = fresh(range(1, 4), c.used, (k) => `one-more:${k}`, c.rng)
  const answer = n + 1
  const { options, errors } = numberOptions(
    answer,
    [
      { value: n, error: 'no-change' },
      { value: n + 2, error: 'off-by-one' },
      { value: n - 1, error: 'wrong-direction' },
    ],
    optionsOf(c),
    levelMax(c.level),
    c.rng,
    'group',
  )
  return {
    ...base(c),
    id: `one-more:${n}`,
    kind: 'one-more',
    skill: 'more:one',
    prompt: { key: 'oneMore', params: {} },
    scene: { type: 'group', count: n, change: 1 },
    answer: String(answer),
    options,
    help: {
      visual: { type: 'objects', groups: [n, 1], continued: true },
      text: { key: 'oneMore', params: { n, next: answer } },
    },
    errors,
  }
}

const makeCompareGroups: Maker = (c) => {
  const candidates = pairs(range(1, 5), range(1, 5), (a, b) => a !== b)
  const [a, b] = fresh(candidates, c.used, ([x, y]) => `compare-groups:${x}:${y}`, c.rng)
  const more = Math.max(a, b)
  const less = Math.min(a, b)
  return {
    ...base(c),
    id: `compare-groups:${a}:${b}`,
    kind: 'compare-groups',
    skill: 'compare:groups',
    prompt: { key: 'compareGroups', params: {} },
    scene: { type: 'none' },
    answer: String(more),
    // left and right as generated (the bigger group is not always on the same side)
    options: [
      { id: String(a), value: a, show: 'group' },
      { id: String(b), value: b, show: 'group' },
    ],
    help: {
      visual: { type: 'objects', groups: [a, b] },
      text: { key: 'compareGroups', params: {} },
    },
    errors: { [String(less)]: 'chose-fewer' },
  }
}

/** a + b or a − b with objects (level 2) or as an example (levels 3–5). */
function makeArithmetic(op: Op, within: number, objects: boolean): Maker {
  return (c): LabQuestion => {
    const max = within
    const candidates =
      op === '+'
        ? pairs(range(1, objects ? 5 : max - 1), range(1, objects ? 5 : max - 1), (a, b) => {
            const sum = a + b
            if (sum > max) return false
            // within 20 means crossing 10 most of the time
            return max <= 10 || sum > 10
          })
        : pairs(range(2, max), range(1, objects ? 5 : max - 1), (a, b) => {
            if (b >= a) return false
            return max <= 10 || a > 10
          })
    const [a, b] = fresh(
      candidates,
      c.used,
      ([x, y]) => `${op === '+' ? 'add' : 'sub'}:${x}${op}${y}`,
      c.rng,
    )
    const answer = op === '+' ? a + b : a - b
    const other = op === '+' ? Math.abs(a - b) : a + b
    const { options, errors } = numberOptions(
      answer,
      [
        ...near(answer),
        { value: other, error: 'wrong-operation' },
        { value: op === '+' ? Math.max(a, b) : a, error: 'kept-number' },
      ],
      optionsOf(c),
      // the wrong options stay inside the level too (no 15 at level 2)
      max,
      c.rng,
      objects ? 'dots' : 'number',
    )
    const skillOp = op === '+' ? 'add' : 'sub'
    const tag = max <= 5 ? 'within5' : max <= 10 ? 'within10' : 'within20'
    return {
      ...base(c),
      id: `${skillOp}:${a}${op}${b}`,
      kind: op === '+' ? 'add' : 'sub',
      skill: `${skillOp}:${tag}`,
      prompt: objects
        ? { key: op === '+' ? 'addObjects' : 'subObjects', params: { b } }
        : { key: 'equation', params: {} },
      scene: objects
        ? { type: 'objects', a, b, op }
        : { type: 'equation', tokens: [a, op, b, '=', '?'] },
      answer: String(answer),
      options,
      help: objects
        ? {
            visual:
              op === '+'
                ? { type: 'objects', groups: [a, b], continued: true }
                : { type: 'objects', groups: [a], crossed: b },
            text: { key: op === '+' ? 'addObjects' : 'subObjects', params: { a, b } },
          }
        : {
            visual: lineHelp(a, answer),
            text: { key: op === '+' ? 'addLine' : 'subLine', params: { a, b } },
          },
      errors,
    }
  }
}

const makeOneLess: Maker = (c) => {
  const n = fresh(range(2, 10), c.used, (k) => `one-less:${k}`, c.rng)
  const answer = n - 1
  const { options, errors } = numberOptions(
    answer,
    [
      { value: n, error: 'no-change' },
      { value: n + 1, error: 'wrong-direction' },
      { value: n - 2, error: 'off-by-one' },
    ],
    optionsOf(c),
    levelMax(c.level),
    c.rng,
    'dots',
  )
  return {
    ...base(c),
    id: `one-less:${n}`,
    kind: 'one-less',
    skill: 'less:one',
    prompt: { key: 'oneLess', params: {} },
    scene: { type: 'group', count: n, change: -1 },
    answer: String(answer),
    options,
    help: {
      visual: { type: 'objects', groups: [n], crossed: 1 },
      text: { key: 'oneLess', params: { n, next: answer } },
    },
    errors,
  }
}

type MissingForm = 'a+?=s' | '?+b=s' | 's=a+?' | 'a-?=r' | '?-b=r'

/** A missing number: level 3 only "a + ? = s"; from level 4 on either side and in subtraction. */
function makeMissing(forms: readonly MissingForm[], within: number): Maker {
  return (c) => {
    const facts = pairs(range(1, within - 1), range(1, within - 1), (a, b) => a + b <= within)
    const candidates = forms.flatMap((form) => facts.map(([a, b]) => ({ form, a, b })))
    const { form, a, b } = fresh(
      candidates,
      c.used,
      (x) => `missing:${x.form}:${x.a}:${x.b}`,
      c.rng,
    )
    const s = a + b
    // in "a + b = s" the hidden part and the numbers shown
    let tokens: Token[]
    let answer: number
    let mistakes: { value: number; error: string }[]
    let help: { visual: HelpVisual; text: HelpText }
    let skill: string
    switch (form) {
      case 'a+?=s':
      case 's=a+?':
        tokens = form === 'a+?=s' ? [a, '+', '?', '=', s] : [s, '=', a, '+', '?']
        answer = b
        mistakes = [
          { value: s, error: 'wrote-total' },
          { value: s + a, error: 'wrong-operation' },
          ...near(b),
        ]
        help = { visual: lineHelp(a, s), text: { key: 'missingAdd', params: { from: a, to: s } } }
        skill = 'missing:add'
        break
      case '?+b=s':
        tokens = ['?', '+', b, '=', s]
        answer = a
        mistakes = [
          { value: s, error: 'wrote-total' },
          { value: s + b, error: 'wrong-operation' },
          ...near(a),
        ]
        help = { visual: lineHelp(b, s), text: { key: 'missingAdd', params: { from: b, to: s } } }
        skill = 'missing:add'
        break
      case 'a-?=r':
        // s − ? = a  (the hidden number is b)
        tokens = [s, '-', '?', '=', a]
        answer = b
        mistakes = [
          { value: s + a, error: 'wrong-operation' },
          { value: a, error: 'kept-number' },
          ...near(b),
        ]
        help = { visual: lineHelp(s, a), text: { key: 'missingSub', params: { from: s, to: a } } }
        skill = 'missing:sub'
        break
      case '?-b=r':
        // ? − b = a  (the hidden number is s)
        tokens = ['?', '-', b, '=', a]
        answer = s
        mistakes = [
          { value: Math.abs(a - b), error: 'wrong-operation' },
          { value: a, error: 'kept-number' },
          ...near(s),
        ]
        help = { visual: lineHelp(a, s), text: { key: 'addLine', params: { a, b } } }
        skill = 'missing:sub'
        break
    }
    const { options, errors } = numberOptions(answer, mistakes, optionsOf(c), within, c.rng)
    return {
      ...base(c),
      id: `missing:${form}:${a}:${b}`,
      kind: 'missing',
      skill,
      prompt: { key: 'equation', params: {} },
      scene: { type: 'equation', tokens },
      answer: String(answer),
      options,
      help,
      errors,
    }
  }
}

const SIGNS: readonly Sign[] = ['<', '>', '=']

const makeCompare: Maker = (c) => {
  const unequal = pairs(range(0, 10), range(0, 10), (a, b) => a !== b)
  const equal = range(1, 10).map((n): [number, number] => [n, n])
  // about one in five is "="
  const pool = c.rng() < 0.2 ? equal : unequal
  const [a, b] = fresh(pool, c.used, ([x, y]) => `compare:${x}:${y}`, c.rng)
  const answer: Sign = a < b ? '<' : a > b ? '>' : '='
  const errors: Record<string, string> = {}
  for (const sign of SIGNS)
    if (sign !== answer) errors[sign] = sign === '=' ? 'not-equal' : 'sign-reversed'
  return {
    ...base(c),
    id: `compare:${a}:${b}`,
    kind: 'compare',
    skill: 'compare:numbers',
    prompt: { key: 'compare', params: {} },
    scene: { type: 'compare', a, b },
    answer,
    options: SIGNS.map((sign) => ({ id: sign, value: sign, show: 'sign' as const })),
    help: {
      visual: { ...lineHelp(Math.min(a, b), Math.max(a, b)), marks: [a, b] },
      text: { key: 'compare', params: { a, b } },
    },
    errors,
  }
}

function makeNeighbor(kind: 'before' | 'after' | 'between'): Maker {
  return (c): LabQuestion => {
    const starts = kind === 'before' ? range(1, 20) : kind === 'after' ? range(0, 19) : range(0, 18)
    const n = fresh(starts, c.used, (k) => `${kind}:${k}`, c.rng)
    const answer = kind === 'before' ? n - 1 : n + 1
    const cells: (number | '?')[] =
      kind === 'before' ? ['?', n] : kind === 'after' ? [n, '?'] : [n, '?', n + 2]
    const mistakes =
      kind === 'before'
        ? [
            { value: n + 1, error: 'wrong-direction' },
            { value: n, error: 'kept-number' },
            { value: n - 2, error: 'off-by-one' },
          ]
        : kind === 'after'
          ? [
              { value: n - 1, error: 'wrong-direction' },
              { value: n, error: 'kept-number' },
              { value: n + 2, error: 'off-by-one' },
            ]
          : [
              { value: n + 2, error: 'kept-number' },
              { value: n, error: 'kept-number' },
              { value: n + 3, error: 'off-by-one' },
            ]
    const { options, errors } = numberOptions(
      answer,
      mistakes,
      optionsOf(c),
      levelMax(c.level),
      c.rng,
    )
    const { from, to } = lineWindow([n, answer, ...(kind === 'between' ? [n + 2] : [])])
    return {
      ...base(c),
      id: `${kind}:${n}`,
      kind,
      skill: `neighbor:${kind}`,
      prompt:
        kind === 'between'
          ? { key: 'between', params: { a: n, b: n + 2 } }
          : { key: kind, params: { n } },
      scene: { type: 'sequence', cells },
      answer: String(answer),
      options,
      help: {
        visual: { type: 'line', from, to, start: n, end: answer },
        text: { key: 'neighbors', params: {} },
      },
      errors,
    }
  }
}

const makeTwoStep: Maker = (c) => {
  const candidates: { a: number; op1: Op; b: number; op2: Op; d: number }[] = []
  for (const a of range(2, 12))
    for (const b of range(1, 8))
      for (const d of range(1, 8))
        for (const [op1, op2] of [
          ['+', '-'],
          ['-', '+'],
        ] as [Op, Op][]) {
          const mid = op1 === '+' ? a + b : a - b
          const end = op2 === '+' ? mid + d : mid - d
          if (mid < 0 || mid > 20 || end < 0 || end > 20) continue
          candidates.push({ a, op1, b, op2, d })
        }
  const { a, op1, b, op2, d } = fresh(
    candidates,
    c.used,
    (x) => `two-step:${x.a}${x.op1}${x.b}${x.op2}${x.d}`,
    c.rng,
  )
  const mid = op1 === '+' ? a + b : a - b
  const answer = op2 === '+' ? mid + d : mid - d
  const swapped = op2 === '+' ? mid - d : mid + d
  const { options, errors } = numberOptions(
    answer,
    [
      { value: mid, error: 'stopped-after-first-step' },
      { value: swapped, error: 'wrong-operation' },
      ...near(answer),
    ],
    optionsOf(c),
    levelMax(c.level),
    c.rng,
  )
  return {
    ...base(c),
    id: `two-step:${a}${op1}${b}${op2}${d}`,
    kind: 'two-step',
    skill: 'two-step:within20',
    prompt: { key: 'equation', params: {} },
    scene: { type: 'equation', tokens: [a, op1, b, op2, d, '=', '?'] },
    answer: String(answer),
    options,
    help: {
      visual: lineHelp(mid, answer, [a]),
      text: { key: 'twoStep', params: { first: `${a} ${op1 === '+' ? '+' : '−'} ${b} = ${mid}` } },
    },
    errors,
  }
}

const makeWord: Maker = (c) => {
  const adds = pairs(range(2, 10), range(1, 9), (a, b) => a + b <= 20).map(([a, b]) => ({
    op: '+' as Op,
    a,
    b,
  }))
  const subs = pairs(range(3, 20), range(1, 9), (a, b) => b < a).map(([a, b]) => ({
    op: '-' as Op,
    a,
    b,
  }))
  const { op, a, b } = fresh([...adds, ...subs], c.used, (x) => `word:${x.a}${x.op}${x.b}`, c.rng)
  const answer = op === '+' ? a + b : a - b
  const other = op === '+' ? a - b : a + b
  const { options, errors } = numberOptions(
    answer,
    [
      { value: other, error: 'wrong-operation' },
      ...near(answer),
      { value: a, error: 'kept-number' },
    ],
    optionsOf(c),
    levelMax(c.level),
    c.rng,
  )
  return {
    ...base(c),
    id: `word:${a}${op}${b}`,
    kind: 'word',
    skill: op === '+' ? 'word:add' : 'word:sub',
    prompt: { key: op === '+' ? 'wordAdd' : 'wordSub', params: { a, b } },
    scene: { type: 'word', a },
    answer: String(answer),
    options,
    help: {
      visual: lineHelp(a, answer),
      text: { key: op === '+' ? 'addLine' : 'subLine', params: { a, b } },
    },
    errors,
  }
}

/** The kinds of one session per level, in order of importance (the first ones always come). */
export const LEVEL_PLAN: Record<ChallengeLevel, readonly Maker[]> = {
  1: [makeDrag, makeCount, makeOneMore, makeCompareGroups, makeCount],
  2: [
    makeDrag,
    makeArithmetic('+', 10, true),
    makeArithmetic('-', 10, true),
    makeOneLess,
    makeArithmetic('+', 10, true),
  ],
  3: [
    makeArithmetic('+', 10, false),
    makeArithmetic('-', 10, false),
    makeMissing(['a+?=s'], 10),
    makeCompare,
    makeArithmetic('-', 10, false),
    makeMissing(['a+?=s'], 10),
  ],
  4: [
    makeArithmetic('+', 20, false),
    makeArithmetic('-', 20, false),
    makeMissing(['?+b=s', 'a+?=s', 's=a+?'], 20),
    makeMissing(['a-?=r', '?-b=r'], 20),
    makeNeighbor('before'),
    (c) => (c.rng() < 0.5 ? makeNeighbor('after')(c) : makeNeighbor('between')(c)),
  ],
  5: [
    (c) => makeArithmetic(c.rng() < 0.5 ? '+' : '-', 20, false)(c),
    makeTwoStep,
    makeWord,
    makeMissing(['?+b=s', 'a+?=s', 's=a+?', 'a-?=r', '?-b=r'], 20),
    makeTwoStep,
    makeWord,
  ],
}

// ------------------------------------------------------------------ mastery

/**
 * Numbers stay at most five digits: big enough to keep growing for many
 * steps, small enough to stay exact and fit a 320 px phone. The mastery count
 * itself has no ceiling.
 */
export const MASTERY_NUMBER_CAP = 99_999

/**
 * The biggest number of a mastery step above level 5 (Phase 22): 50, 100,
 * 200, 500, 1000, 2000, 5000, 10 000, 20 000, 50 000, then 99 999.
 */
export function masteryMax(mastery: number): number {
  const step = Number.isFinite(mastery) ? Math.min(Math.max(1, Math.floor(mastery)), 20) : 1
  const k = step + 4
  return Math.min(MASTERY_NUMBER_CAP, [1, 2, 5][k % 3]! * 10 ** Math.floor(k / 3))
}

function int(rng: Rng, from: number, to: number): number {
  return from + Math.floor(rng() * (to - from + 1))
}

type BigForm = '+' | '-' | 'a+?=s' | 'a-?=r'

/** A sum or a difference with big numbers, sampled (the ranges are too big to list). */
function makeBig(form: BigForm, max: number, mastery: number): Maker {
  return (c) => {
    const id = (a: number, b: number) => `big:${form}:${a}:${b}`
    let a = 0
    let b = 0
    for (let tries = 0; tries < 40; tries += 1) {
      // a with tens to carry or borrow: never a trivial "+ 1"
      a = int(c.rng, Math.ceil(max / 10), max - 2)
      b = int(c.rng, Math.max(2, Math.ceil(max / 50)), Math.max(2, max - a))
      if (!c.used.has(id(a, b)) && a + b <= max) break
    }
    if (a + b > max) b = max - a
    // never the same item twice in a session, even when sampling was unlucky
    while (c.used.has(id(a, b)) && a > Math.ceil(max / 10)) a -= 1
    const s = a + b
    let tokens: Token[]
    let answer: number
    let mistakes: { value: number; error: string }[]
    let visual: HelpVisual
    let key: HelpKey
    let skill: string
    switch (form) {
      case '+':
        tokens = [a, '+', b, '=', '?']
        answer = s
        mistakes = [{ value: Math.abs(a - b), error: 'wrong-operation' }]
        visual = { type: 'columns', a, b, op: '+' }
        key = 'columnsAdd'
        skill = 'add:big'
        break
      case '-':
        tokens = [s, '-', b, '=', '?']
        answer = a
        mistakes = [{ value: s + b, error: 'wrong-operation' }]
        visual = { type: 'columns', a: s, b, op: '-' }
        key = 'columnsSub'
        skill = 'sub:big'
        break
      case 'a+?=s':
        tokens = [a, '+', '?', '=', s]
        answer = b
        mistakes = [{ value: s, error: 'wrote-total' }]
        visual = { type: 'columns', a: s, b: a, op: '-' }
        key = 'columnsSub'
        skill = 'missing:add'
        break
      case 'a-?=r':
        tokens = [s, '-', '?', '=', a]
        answer = b
        mistakes = [{ value: s + a, error: 'wrong-operation' }]
        visual = { type: 'columns', a: s, b: a, op: '-' }
        key = 'columnsSub'
        skill = 'missing:sub'
        break
    }
    const { options, errors } = numberOptions(
      answer,
      [
        ...mistakes,
        // a slip in the tens: the classic big-number mistake
        { value: answer + 10, error: 'place-value' },
        { value: answer - 10, error: 'place-value' },
        ...near(answer),
      ],
      optionsOf(c),
      max,
      c.rng,
      'number',
    )
    return {
      ...base(c),
      id: id(a, b),
      kind: form === '+' ? 'add' : form === '-' ? 'sub' : 'missing',
      skill,
      prompt: { key: 'equation', params: {} },
      scene: { type: 'equation', tokens },
      answer: String(answer),
      options,
      help: { visual, text: { key, params: {} } },
      errors,
      mastery,
    }
  }
}

/** The kinds of a session at a mastery step: the same four kinds, bigger numbers each step. */
function masteryPlan(mastery: number): readonly Maker[] {
  const max = masteryMax(mastery)
  return [
    makeBig('+', max, mastery),
    makeBig('-', max, mastery),
    makeBig('a+?=s', max, mastery),
    makeBig('a-?=r', max, mastery),
    (c) => makeBig(c.rng() < 0.5 ? '+' : '-', max, mastery)(c),
    (c) => makeBig(c.rng() < 0.5 ? 'a+?=s' : 'a-?=r', max, mastery)(c),
  ]
}

function planOf(level: ChallengeLevel, mastery: number): readonly Maker[] {
  return level === 5 && mastery > 0 ? masteryPlan(mastery) : LEVEL_PLAN[level]
}

/** One question of a kind at a level (for tests and later phases such as review). */
export function makeQuestion(
  level: ChallengeLevel,
  index: number,
  rng: Rng = Math.random,
  used: ReadonlySet<string> = new Set(),
  options?: number,
  mastery = 0,
): LabQuestion {
  const plan = planOf(level, mastery)
  const maker = plan[index % plan.length]!
  const object = LAB_OBJECTS[Math.floor(rng() * LAB_OBJECTS.length)] ?? 'apple'
  return maker({ level, rng, used, object, ...(options ? { options } : {}) })
}

/**
 * A question of `skill` at `level` that is not one of `avoid` (the items the
 * child got wrong and the questions already in the session): a related item,
 * never the same one again. Null when the skill has no such item left (then
 * the session simply has no review).
 */
export function reviewQuestion(
  skill: string,
  level: ChallengeLevel,
  avoid: ReadonlySet<string>,
  rng: Rng = Math.random,
  options?: number,
  mastery = 0,
): LabQuestion | null {
  // a skill of the other plan is still practised: a level-5 skill (word problems,
  // two steps) in a mastery session, a big-number skill after a step back
  const steps = skill.endsWith(':big') ? [Math.max(1, mastery)] : [mastery, 0]
  for (const step of [...new Set(steps)]) {
    const plan = planOf(level, step)
    for (let attempt = 0; attempt < plan.length * 12; attempt += 1) {
      const q = makeQuestion(level, attempt % plan.length, rng, avoid, options, step)
      if (q.skill === skill && !avoid.has(q.id)) return { ...q, review: true }
    }
  }
  return null
}

/** A due review for the session (from the learning memory). */
export interface ReviewPlan {
  skill: string
  /** The level the skill was practised at; a review never goes above today's level. */
  level: ChallengeLevel
  /** Items already seen wrong. */
  avoid: readonly string[]
  /**
   * The child chose this skill in the Mistake Garden: practised at its own
   * level even above today's (the level it was hard at), so the plant can grow.
   */
  chosen?: boolean
}

/** How the adaptive plan shapes a session (domain/adaptive). */
export interface SessionShape {
  /** Answer cards per question (2–4). */
  options?: number
  /** Mastery steps above level 5 (domain/learner): bigger numbers, no ceiling. */
  mastery?: number
}

/**
 * The questions of one session at a level: every kind of the level once, the
 * drag task first for levels 1–2 (hands first), the rest in a random order,
 * no question twice. Due reviews (retrieval practice, at most two) take the
 * place of questions (from the second for levels 1–2, else from the first),
 * so a session never gets longer.
 */
export function planSession(
  level: ChallengeLevel,
  rng: Rng = Math.random,
  review?: ReviewPlan | readonly ReviewPlan[] | null,
  shape: SessionShape = {},
): LabQuestion[] {
  const count = sessionLength(level)
  const used = new Set<string>()
  const out: LabQuestion[] = []
  const mastery = level === 5 ? Math.max(0, Math.floor(shape.mastery ?? 0)) : 0
  for (let index = 0; index < count; index += 1) {
    const q = makeQuestion(level, index, rng, used, shape.options, mastery)
    used.add(q.id)
    out.push(q)
  }
  const ordered = level <= 2 ? [out[0]!, ...shuffle(out.slice(1), rng)] : shuffle(out, rng)
  const reviews = (Array.isArray(review) ? review : review ? [review] : [])
    .filter((item) => item.chosen === true || item.level <= level)
    .slice(0, 2)
  let at = level <= 2 ? 1 : 0
  let chosenPlaced = false
  const result = [...ordered]
  for (const item of reviews) {
    if (at >= result.length) break
    const avoid = new Set([...item.avoid, ...result.map((q) => q.id)])
    const q = reviewQuestion(item.skill, item.level, avoid, rng, shape.options, mastery)
    if (!q) continue
    // a second item of a skill chosen in the garden is extra practice, not another
    // review: one session moves the review schedule on once at most
    const again = item.chosen === true && chosenPlaced
    if (item.chosen === true) chosenPlaced = true
    result[at] = again ? { ...q, review: false } : q
    // the second review is spread out (never two reviews in a row)
    at += 2
  }
  return result
}

/** Is this option (or for 'drag', this many in the basket) the right answer? */
export function isRight(q: LabQuestion, answer: string): boolean {
  return answer === q.answer
}

/** Why an answer was wrong (null when right). */
export function errorOf(q: LabQuestion, answer: string): string | null {
  if (isRight(q, answer)) return null
  if (q.kind === 'drag') return Number(answer) > Number(q.answer) ? 'too-many' : 'too-few'
  return q.errors[answer] ?? 'other'
}

/**
 * Learn Before Play (Phase 21): a worked example of the same skill as `q`,
 * shown the first time a child meets the skill. Another item (never the
 * question itself), chosen deterministically from the question's id; null
 * when the skill has no other item.
 */
export function exampleQuestion(q: LabQuestion): LabQuestion | null {
  let seed = 7
  for (const char of q.id) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0
  const other = reviewQuestion(
    q.skill,
    q.level,
    new Set([q.id]),
    seededRandom(seed),
    q.options.length || undefined,
    q.mastery ?? 0,
  )
  return other ? { ...other, review: false } : null
}
