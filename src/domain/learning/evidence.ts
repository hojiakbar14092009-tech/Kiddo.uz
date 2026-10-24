import type { Evidence, HintLevel, SkillMemory } from '@/domain/learningMemory/memory'
import { stableHash } from '@/lib/stableHash'
import { skillDef } from './skills'

/*
 * The one evidence contract of Kiddo's learning modules (Phase 17). A module
 * reports a finished question as a `LearningOutcome`; `toEvidence` turns it
 * into the learning memory's `Evidence` (Phase 10), the only input of the
 * memory rules. No module writes memory, scores or statuses itself, and no
 * module has a memory of its own.
 *
 * Kept out on purpose: names, free text, answers as typed, times on task,
 * pauses, rereads. The item is a hash of the question id, so a word or a
 * picture name never leaves the device as text.
 */

/** Normalized help (Phase 10 ladder): 0 none, 1 small clue, 2 guided, 3 strong scaffold, 4 full answer. */
export const HINT = {
  none: 0,
  clue: 1,
  guided: 2,
  scaffold: 3,
  answer: 4,
} as const satisfies Record<string, HintLevel>

export interface LearningOutcome {
  /** A registered skill key (skills.ts). */
  skill: string
  /** One learning session (a run): mistakes in one sitting never confirm a difficulty on their own. */
  sessionId: string
  /** The question within the session (any text; hashed). */
  questionId: string
  /** The item (any text, hashed), e.g. the word or the planet asked about. */
  item: string
  /** The first answer was right. */
  firstTry: boolean
  /** Help was opened before the first answer. */
  helpedBefore: boolean
  /** Normalized error codes of the wrong answers (see `errorCode`). */
  errors: readonly string[]
  /** Highest help shown for this question (`HINT`). */
  hint: HintLevel
  /** ISO time. */
  at: string
  /** Challenge level, when the module has one (1–5). */
  level?: number
  /**
   * The question was a spaced review. Modules without their own review
   * schedule leave it out: then a question of a skill whose review is due in
   * the memory counts as that review (`isDueReview`).
   */
  review?: boolean
}

const ITEM_PREFIX = /^[a-z0-9-]{1,16}$/

/** A hashed item id the memory accepts (`q:1x2y3z`): never free text. */
export function itemId(raw: string, prefix = 'q'): string {
  const safe = ITEM_PREFIX.test(prefix) ? prefix : 'q'
  return `${safe}:${stableHash(raw).toString(36)}`
}

const CODE_RE = /^[a-z][a-z0-9-]{0,31}$/

/**
 * A module's error label as a memory error code: a known code passes as it
 * is; anything else (item-specific labels such as `chose-fox`) becomes the
 * module's generic code, so a repeated difficulty with the skill is seen as
 * one pattern rather than many one-off slips.
 */
export function errorCode(
  label: string | null | undefined,
  known: readonly string[],
  generic: string,
): string {
  if (label && CODE_RE.test(label) && known.includes(label)) return label
  return generic
}

/**
 * Does this answer count as the skill's spaced review? Only when the memory's
 * review is due at `at`, and only for a related item, never one the child
 * already got wrong (as Math Lab's reviews avoid them).
 */
export function isDueReview(memory: SkillMemory | undefined, at: string, item?: string): boolean {
  if (!memory?.nextReviewAt) return false
  if (item && Object.values(memory.misconceptions).some((m) => m.items.includes(item))) return false
  return Date.parse(memory.nextReviewAt) <= Date.parse(at)
}

/** The memory's evidence for one outcome (null when the skill is not registered). */
export function toEvidence(outcome: LearningOutcome, memory?: SkillMemory): Evidence | null {
  if (!skillDef(outcome.skill)) return null
  const level =
    outcome.level !== undefined && Number.isInteger(outcome.level) && outcome.level >= 1
      ? Math.min(5, outcome.level)
      : undefined
  const item = itemId(outcome.item)
  return {
    id: `${outcome.sessionId.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64)}|${stableHash(outcome.questionId).toString(36)}`,
    skill: outcome.skill,
    item,
    at: outcome.at,
    firstTry: outcome.firstTry,
    helpedBefore: outcome.helpedBefore,
    errors: outcome.firstTry ? [] : [...new Set(outcome.errors)].slice(0, 8),
    maxHint: outcome.hint,
    review: outcome.review ?? isDueReview(memory, outcome.at, item),
    ...(level ? { level } : {}),
  }
}
