/*
 * Strict parsing of a tutor request (docs/architecture/ai-tutor.md §3). Only
 * known keys with known shapes get through, so a client cannot smuggle a
 * name, an e-mail or a chat history to the provider: a request with any
 * other key is refused (400), not cleaned.
 */

import {
  BANDS,
  INTENTS,
  MEMORY_STATUSES,
  PERSONAS,
  TUTOR_LANGUAGES,
  type HintLevel,
  type TutorItem,
  type TutorMemory,
  type TutorRequest,
} from './types.ts'

export const CHILD_ID_RE = /^[A-Za-z0-9_-]{1,64}$/
export const SKILL_RE = /^[a-z][a-z0-9-]{0,15}:[a-z0-9-]{1,24}$/
export const TASK_RE = /^[a-z][a-z0-9-]{0,23}$/
/** Digits, the arithmetic signs, `?`, commas and spaces; nothing to write words with. */
export const EXPRESSION_RE = /^[0-9 +\-−=?<>,]{1,40}$/
export const ANSWER_RE = /^([0-9]{1,3}|[<>=])$/
export const CODE_RE = /^[a-z][a-z0-9-]{0,31}$/

/*
 * Allow-lists of what the game engine actually produces (Math Lab today). A
 * pattern alone would let a forged request carry an instruction written as
 * a code ("ignore-rules-…"); a closed list cannot.
 */
export const SKILL_FAMILIES = new Set([
  'drag',
  'count',
  'more',
  'less',
  'compare',
  'add',
  'sub',
  'missing',
  'neighbor',
  'two-step',
  'word',
])
/** The part after the family (`add:within10` → `within10`). */
export const SKILL_SUFFIXES = new Set([
  'to5',
  'to10',
  'one',
  'groups',
  'numbers',
  'within5',
  'within10',
  'within20',
  'before',
  'after',
  'between',
  'add',
  'sub',
])
export const TASKS = new Set([
  'drag',
  'count',
  'one-more',
  'compare-groups',
  'add',
  'sub',
  'one-less',
  'missing',
  'compare',
  'before',
  'after',
  'between',
  'two-step',
  'word',
])
export const ERROR_CODES = new Set([
  'off-by-one',
  'off-by-more',
  'wrong-operation',
  'kept-number',
  'no-change',
  'wrong-direction',
  'wrote-total',
  'stopped-after-first-step',
  'too-many',
  'too-few',
  'sign-reversed',
  'not-equal',
  'chose-fewer',
  'other',
])

const TOP_KEYS = new Set([
  'v',
  'childId',
  'language',
  'band',
  'persona',
  'intent',
  'hintLevel',
  'item',
  'memory',
])
const ITEM_KEYS = new Set(['skill', 'task', 'expression', 'answer', 'learnerAnswer', 'errorCode'])
const MEMORY_KEYS = new Set(['mastery', 'misconceptions', 'preferredHint'])
const MISCONCEPTION_KEYS = new Set(['code', 'count', 'status'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function onlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key))
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

function parseItem(value: unknown): TutorItem | null {
  if (!isRecord(value) || !onlyKeys(value, ITEM_KEYS)) return null
  const { skill, task, expression, answer, learnerAnswer, errorCode } = value
  if (typeof skill !== 'string' || !SKILL_RE.test(skill)) return null
  const [family, suffix] = skill.split(':')
  if (!SKILL_FAMILIES.has(family ?? '') || !SKILL_SUFFIXES.has(suffix ?? '')) return null
  if (typeof task !== 'string' || !TASK_RE.test(task) || !TASKS.has(task)) return null
  if (typeof expression !== 'string' || !EXPRESSION_RE.test(expression)) return null
  if (!/[0-9?]/.test(expression)) return null
  if (typeof answer !== 'string' || !ANSWER_RE.test(answer)) return null
  const item: TutorItem = { skill, task, expression: expression.trim(), answer }
  if (learnerAnswer !== undefined) {
    if (typeof learnerAnswer !== 'string' || !ANSWER_RE.test(learnerAnswer)) return null
    item.learnerAnswer = learnerAnswer
  }
  if (errorCode !== undefined) {
    if (typeof errorCode !== 'string' || !ERROR_CODES.has(errorCode)) return null
    item.errorCode = errorCode
  }
  return item
}

function parseMemory(value: unknown): TutorMemory | null {
  if (!isRecord(value) || !onlyKeys(value, MEMORY_KEYS)) return null
  const { mastery, misconceptions, preferredHint } = value
  if (typeof mastery !== 'number' || !Number.isFinite(mastery) || mastery < 0 || mastery > 1) {
    return null
  }
  if (!Array.isArray(misconceptions) || misconceptions.length > 3) return null
  const list: TutorMemory['misconceptions'] = []
  for (const m of misconceptions) {
    if (!isRecord(m) || !onlyKeys(m, MISCONCEPTION_KEYS)) return null
    if (typeof m.code !== 'string' || !ERROR_CODES.has(m.code)) return null
    if (!Number.isInteger(m.count) || (m.count as number) < 1 || (m.count as number) > 999) {
      return null
    }
    if (!oneOf(MEMORY_STATUSES, m.status)) return null
    list.push({ code: m.code, count: m.count as number, status: m.status })
  }
  const memory: TutorMemory = { mastery: Math.round(mastery * 100) / 100, misconceptions: list }
  if (preferredHint !== undefined) {
    if (!oneOf(['verbal', 'visual', 'partial'] as const, preferredHint)) return null
    memory.preferredHint = preferredHint
  }
  return memory
}

/** The request, or null (400 bad_request). */
export function parseTutorRequest(body: unknown): TutorRequest | null {
  if (!isRecord(body) || !onlyKeys(body, TOP_KEYS)) return null
  const { v, childId, language, band, persona, intent, hintLevel, item, memory } = body
  if (v !== 1) return null
  if (typeof childId !== 'string' || !CHILD_ID_RE.test(childId)) return null
  if (!oneOf(TUTOR_LANGUAGES, language)) return null
  if (!oneOf(BANDS, band)) return null
  if (!oneOf(PERSONAS, persona)) return null
  if (!oneOf(INTENTS, intent)) return null
  if (!Number.isInteger(hintLevel) || (hintLevel as number) < 1 || (hintLevel as number) > 4) {
    return null
  }
  const parsedItem = parseItem(item)
  if (!parsedItem) return null
  const request: TutorRequest = {
    v: 1,
    childId,
    language,
    band,
    persona,
    intent,
    hintLevel: hintLevel as HintLevel,
    item: parsedItem,
  }
  if (memory !== undefined) {
    const parsedMemory = parseMemory(memory)
    if (!parsedMemory) return null
    request.memory = parsedMemory
  }
  return request
}

/**
 * A worked example like the item, with numbers the server chooses and an
 * answer it computes (the provider only puts it into words), for `a + b = ?`
 * and `a − b = ?`; null for other shapes.
 */
export function similarExample(item: TutorItem): { expression: string; answer: string } | null {
  const match = /^(\d{1,2}) *([+\-−]) *(\d{1,2}) *= *\?$/.exec(item.expression)
  if (!match) return null
  const a = Number(match[1])
  const op = match[2] === '+' ? '+' : '-'
  const b = Number(match[3])
  const a2 = a > 1 ? a - 1 : a + 1
  const result = op === '+' ? a2 + b : a2 - b
  if (result < 0) return null
  return { expression: `${a2} ${op} ${b} = ?`, answer: String(result) }
}
