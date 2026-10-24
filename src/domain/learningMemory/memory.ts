/*
 * Learning memory (Phase 10, docs/architecture/ai-tutor.md §4). Pure logic,
 * no store, no React, no AI: the game engine decides what was right; this
 * module only remembers what the child's answers showed, so it works the
 * same with or without an AI provider and survives a change of provider.
 *
 * Three layers:
 * - session memory: the current question, its mistakes and hints (component
 *   state of the activity, never stored);
 * - learning memory: per skill, misconceptions with an evidence threshold and
 *   a review schedule (this module);
 * - mastery: one score per skill, 0–1, from every finished question.
 *
 * What is stored is observable evidence only (skill keys, error codes, item
 * ids such as `add:3+4`, counts and times), never labels about the child.
 */

export const MEMORY_POLICY = {
  /** A misconception seen on this many different items, in as many sessions, is confirmed. */
  confirmItems: 2,
  /** An observation that never got confirmed is forgotten after this many days. */
  observedTtlDays: 14,
  /** Independent successes in a row that resolve a misconception (with a retention check). */
  resolveStreak: 3,
  /** A retention check is a review answered independently at least this long after the last error. */
  retentionGapHours: 20,
  /** Weight of the newest question in the mastery score. */
  masteryAlpha: 0.3,
  masteredScore: 0.85,
  masteredEvidence: 5,
  /** Below this a mastered skill is no longer called mastered. */
  unmasterScore: 0.6,
  /** Days until the next review, by review step. */
  reviewDays: [1, 3, 7, 14] as const,
  maxSkills: 120,
  maxItems: 5,
  maxCodes: 6,
  recentHints: 10,
  maxProcessed: 600,
} as const

/** Hint ladder levels (domain/tutor): 0 = no hint was shown. */
export type HintLevel = 0 | 1 | 2 | 3 | 4

export type MisconceptionStatus = 'observed' | 'confirmed' | 'improving' | 'resolved'
export type SkillStatus = 'new' | MisconceptionStatus

export interface Misconception {
  /** The game engine's error code, e.g. `off-by-one`, `wrong-operation`. */
  code: string
  count: number
  /** Different items it happened on, newest last (capped). */
  items: string[]
  /** Runs (sessions) it happened in, newest last (capped). */
  runs?: string[]
  firstAt: string
  lastAt: string
  status: MisconceptionStatus
  resolvedAt?: string
}

export interface SkillMemory {
  /** `math:sub:within10` – a namespace and the engine's skill key. */
  skill: string
  /** The challenge level the skill was last practised at (for reviews). */
  level?: number
  /** 0–1. */
  mastery: number
  /** Finished questions of this skill. */
  evidence: number
  /** Independent first-try successes in a row. */
  successStreak: number
  firstAt: string
  lastPracticedAt: string
  lastErrorAt: string | null
  /** A spaced review answered on its own after the last error. */
  retained: boolean
  nextReviewAt: string | null
  reviewStep: number
  reviewCount: number
  misconceptions: Record<string, Misconception>
  /** Highest hint level per question, oldest first (capped). */
  hintsRecent: HintLevel[]
  /** Mistakes put right before the full explanation was needed. */
  correctedAfterHint: number
  masteredAt: string | null
}

/** One finished question, as the game engine saw it. */
export interface Evidence {
  /** Unique per question and run, e.g. `<runId>|<questionId>`: counted once. */
  id: string
  skill: string
  /** The item, e.g. `add:3+4` (no free text). */
  item: string
  level?: number
  /** ISO time. */
  at: string
  /** The first answer was right. */
  firstTry: boolean
  /** Help was opened before the first answer. */
  helpedBefore: boolean
  /** Error codes of the wrong answers, in order (empty when the first answer was right). */
  errors: string[]
  /** Highest hint level shown for this question. */
  maxHint: HintLevel
  /** The question was a spaced review of this skill. */
  review: boolean
}

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString()
}

/** Three decimals, half up like SQL `round(x, 3)` (the tiny nudge undoes binary float error). */
function round(n: number): number {
  return Math.round(n * 1000 + 1e-7) / 1000
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/** The question's score for the mastery average. */
export function evidenceScore(e: Pick<Evidence, 'firstTry' | 'helpedBefore' | 'maxHint'>): number {
  if (e.firstTry && !e.helpedBefore) return 1
  if (e.firstTry) return 0.6
  if (e.maxHint <= 2) return 0.5
  return 0.25
}

export function isIndependent(e: Pick<Evidence, 'firstTry' | 'helpedBefore'>): boolean {
  return e.firstTry && !e.helpedBefore
}

/** Error codes that say something about the skill ('other' does not). */
export function meaningfulCodes(errors: readonly string[]): string[] {
  const out: string[] = []
  for (const code of errors) {
    if (!/^[a-z][a-z0-9-]{0,31}$/.test(code) || code === 'other') continue
    if (!out.includes(code)) out.push(code)
  }
  return out
}

function emptySkill(skill: string, at: string): SkillMemory {
  return {
    skill,
    mastery: 0,
    evidence: 0,
    successStreak: 0,
    firstAt: at,
    lastPracticedAt: at,
    lastErrorAt: null,
    retained: false,
    nextReviewAt: null,
    reviewStep: 0,
    reviewCount: 0,
    misconceptions: {},
    hintsRecent: [],
    correctedAfterHint: 0,
    masteredAt: null,
  }
}

const ACTIVE: ReadonlySet<MisconceptionStatus> = new Set(['confirmed', 'improving'])

export function isActive(m: Misconception): boolean {
  return ACTIVE.has(m.status)
}

/**
 * Forgets observations that were never confirmed and are older than the
 * policy allows: one accidental tap does not stay forever.
 */
export function forgetStale(memory: SkillMemory, now: string): SkillMemory {
  const limit = new Date(now).getTime() - MEMORY_POLICY.observedTtlDays * DAY_MS
  let changed = false
  const kept: Record<string, Misconception> = {}
  for (const [code, m] of Object.entries(memory.misconceptions)) {
    if (m.status === 'observed' && new Date(m.lastAt).getTime() < limit) {
      changed = true
      // a slip on something already got past: it was a slip, the skill stays learned
      if (m.resolvedAt) kept[code] = { ...m, status: 'resolved' }
      continue
    }
    kept[code] = m
  }
  return changed ? { ...memory, misconceptions: kept } : memory
}

/** The run (session) of an evidence id `<runId>|<question>`. */
export function runOf(evidenceId: string): string {
  return evidenceId.split('|')[0] ?? evidenceId
}

function withError(
  previous: Misconception | undefined,
  code: string,
  item: string,
  run: string,
  at: string,
) {
  // a slip after the child got past it starts again as a single observation
  const m = previous?.status === 'resolved' ? undefined : previous
  const items = m ? [...m.items.filter((i) => i !== item), item] : [item]
  const capped = items.slice(-MEMORY_POLICY.maxItems)
  const runs = m ? [...(m.runs ?? []).filter((r) => r !== run), run] : [run]
  const cappedRuns = runs.slice(-MEMORY_POLICY.maxItems)
  const count = (m?.count ?? 0) + 1
  // Different items in different sessions: a slip on one item, or a few
  // hurried taps in one sitting, stay an observation.
  const confirmed =
    (new Set(capped).size >= MEMORY_POLICY.confirmItems &&
      new Set(cappedRuns).size >= MEMORY_POLICY.confirmItems) ||
    m?.status === 'confirmed' ||
    m?.status === 'improving'
  return {
    code,
    count,
    items: capped,
    runs: cappedRuns,
    firstAt: m?.firstAt ?? at,
    lastAt: at,
    status: confirmed ? 'confirmed' : 'observed',
    // the child got past it once: kept (the garden shows a flower, not nothing)
    ...(previous?.resolvedAt ? { resolvedAt: previous.resolvedAt } : {}),
  } satisfies Misconception
}

/** Keeps at most `maxCodes` misconceptions: active ones and the newest first. */
function capCodes(list: Record<string, Misconception>): Record<string, Misconception> {
  const entries = Object.values(list)
  if (entries.length <= MEMORY_POLICY.maxCodes) return list
  entries.sort((a, b) => {
    const active = Number(isActive(b)) - Number(isActive(a))
    if (active !== 0) return active
    const newer = b.lastAt.localeCompare(a.lastAt)
    return newer !== 0 ? newer : a.code.localeCompare(b.code)
  })
  return Object.fromEntries(entries.slice(0, MEMORY_POLICY.maxCodes).map((m) => [m.code, m]))
}

function hasActive(list: Record<string, Misconception>): boolean {
  return Object.values(list).some(isActive)
}

/**
 * The skill after one finished question. Pure; the caller makes it
 * idempotent by evidence id. Order of the rules:
 * 1. mastery moves towards the question's score;
 * 2. a wrong first answer adds evidence to each error code: one item →
 *    `observed`, two different items → `confirmed` (a review is scheduled);
 *    a relapse re-opens an improving or resolved misconception;
 * 3. an independent success raises the streak: active misconceptions become
 *    `improving`, and `resolved` after `resolveStreak` successes in a row that
 *    include a retention check (a review answered alone ≥ 20 h after the last
 *    error);
 * 4. a review moves the review step on (right) or back to the start (wrong).
 */
export function applyEvidence(previous: SkillMemory | undefined, e: Evidence): SkillMemory {
  const at = e.at
  let memory = forgetStale(previous ?? emptySkill(e.skill, at), at)
  const score = evidenceScore(e)
  const mastery =
    memory.evidence === 0
      ? score
      : memory.mastery + MEMORY_POLICY.masteryAlpha * (score - memory.mastery)
  const independent = isIndependent(e)
  const codes = e.firstTry ? [] : meaningfulCodes(e.errors)

  memory = {
    ...memory,
    level: e.level ?? memory.level,
    mastery: round(clamp01(mastery)),
    evidence: memory.evidence + 1,
    lastPracticedAt: at,
    hintsRecent: [...memory.hintsRecent, e.maxHint].slice(-MEMORY_POLICY.recentHints),
    correctedAfterHint:
      memory.correctedAfterHint + (!e.firstTry && e.maxHint > 0 && e.maxHint < 4 ? 1 : 0),
  }

  if (!e.firstTry) {
    const misconceptions = { ...memory.misconceptions }
    const wasActive = hasActive(misconceptions)
    for (const code of codes) {
      misconceptions[code] = withError(misconceptions[code], code, e.item, runOf(e.id), at)
    }
    const nowActive = hasActive(misconceptions)
    memory = {
      ...memory,
      misconceptions: capCodes(misconceptions),
      successStreak: 0,
      lastErrorAt: at,
      retained: false,
    }
    // the first confirmation, or a missed review: the next review is tomorrow
    if (nowActive && (!wasActive || e.review || memory.nextReviewAt === null)) {
      memory = { ...memory, reviewStep: 0, nextReviewAt: addDays(at, MEMORY_POLICY.reviewDays[0]) }
    }
    if (e.review) memory = { ...memory, reviewCount: memory.reviewCount + 1 }
  } else if (independent) {
    const streak = memory.successStreak + 1
    const retention =
      memory.retained ||
      (e.review &&
        memory.lastErrorAt !== null &&
        new Date(at).getTime() - new Date(memory.lastErrorAt).getTime() >=
          MEMORY_POLICY.retentionGapHours * HOUR_MS)
    const misconceptions: Record<string, Misconception> = {}
    for (const [code, m] of Object.entries(memory.misconceptions)) {
      if (!isActive(m)) {
        misconceptions[code] = m
        continue
      }
      if (streak >= MEMORY_POLICY.resolveStreak && retention) {
        misconceptions[code] = { ...m, status: 'resolved', resolvedAt: at }
      } else {
        misconceptions[code] = { ...m, status: 'improving' }
      }
    }
    memory = { ...memory, successStreak: streak, retained: retention, misconceptions }
    if (e.review) {
      const step = Math.min(memory.reviewStep + 1, MEMORY_POLICY.reviewDays.length - 1)
      memory = {
        ...memory,
        reviewCount: memory.reviewCount + 1,
        reviewStep: step,
        nextReviewAt: hasActive(misconceptions)
          ? addDays(at, MEMORY_POLICY.reviewDays[step] ?? 14)
          : null,
      }
    } else if (!hasActive(misconceptions)) {
      memory = { ...memory, nextReviewAt: null }
    }
  }

  // positive memory: a skill the child is sure of, and losing that again
  if (
    memory.masteredAt === null &&
    memory.mastery >= MEMORY_POLICY.masteredScore &&
    memory.evidence >= MEMORY_POLICY.masteredEvidence &&
    !hasActive(memory.misconceptions)
  ) {
    memory = { ...memory, masteredAt: at }
  } else if (memory.masteredAt !== null && memory.mastery < MEMORY_POLICY.unmasterScore) {
    memory = { ...memory, masteredAt: null }
  }
  return memory
}

/** The skill's overall state, for screens and the parent summary. */
export function skillStatus(memory: SkillMemory): SkillStatus {
  const list = Object.values(memory.misconceptions)
  if (list.some((m) => m.status === 'confirmed')) return 'confirmed'
  if (list.some((m) => m.status === 'improving')) return 'improving'
  if (list.some((m) => m.status === 'resolved')) return 'resolved'
  if (list.some((m) => m.status === 'observed')) return 'observed'
  return 'new'
}

/** Mistake Garden (Phase 16): a confirmed misconception is a seed that grows as the child practises. */
export type GardenStage = 'none' | 'seed' | 'sprout' | 'plant' | 'bloom'

/** Independent successes in a row that make a sprout a growing plant (bloom needs `resolveStreak` + retention). */
export const GARDEN_GROW_STREAK = 2

/**
 * The one stage calculator of the Mistake Garden, from evidence only:
 * - nothing confirmed (a single slip, or no difficulty at all): no plant;
 * - confirmed: a seed; once the child practised the skill after the last
 *   error (even with help), a sprout;
 * - improving (an independent success): a sprout, a growing plant from
 *   `GARDEN_GROW_STREAK` independent successes in a row;
 * - resolved (`resolveStreak` in a row including a retention check a day
 *   later): a bloom. One lucky answer never makes a flower, and a later
 *   one-off slip (only observed) does not take the flower away; if the
 *   difficulty really comes back (confirmed again), the plant is a sprout.
 */
export function gardenStage(memory: SkillMemory): GardenStage {
  const status = skillStatus(memory)
  const learnedBefore = Object.values(memory.misconceptions).some((m) => Boolean(m.resolvedAt))
  if (status === 'confirmed') {
    const practisedSince =
      memory.lastErrorAt !== null && memory.lastPracticedAt > memory.lastErrorAt
    // relearning something the child got past once starts as a sprout, never a bare seed
    return practisedSince || learnedBefore ? 'sprout' : 'seed'
  }
  if (status === 'improving') {
    return memory.successStreak >= GARDEN_GROW_STREAK ? 'plant' : 'sprout'
  }
  if (status === 'resolved') return 'bloom'
  // a single slip after a bloom (only observed): the flower stays
  if (status === 'observed' && learnedBefore) return 'bloom'
  return 'none'
}

/**
 * Is the child leaning on hints less than before? Compares the last five
 * questions with the five before them (null until there are ten).
 */
export function hintTrend(memory: SkillMemory): 'less' | 'same' | 'more' | null {
  const list = memory.hintsRecent
  if (list.length < 10) return null
  const avg = (part: readonly number[]) => part.reduce((s, n) => s + n, 0) / part.length
  const before = avg(list.slice(-10, -5))
  const after = avg(list.slice(-5))
  if (after < before - 0.4) return 'less'
  if (after > before + 0.4) return 'more'
  return 'same'
}

/** The hint style that worked: the lowest level that usually was enough (null when unclear). */
export function preferredHint(memory: SkillMemory): 'verbal' | 'visual' | 'partial' | null {
  const used = memory.hintsRecent.filter((h) => h > 0)
  if (used.length < 3) return null
  const sorted = [...used].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  if (median <= 1) return 'verbal'
  if (median === 2) return 'visual'
  return 'partial'
}

/** Skills whose review is due at `now`, the most important first. */
export function dueReviews(
  skills: Readonly<Record<string, SkillMemory>>,
  now: string,
  limit = 3,
): SkillMemory[] {
  const time = new Date(now).getTime()
  return Object.values(skills)
    .filter((s) => s.nextReviewAt !== null && new Date(s.nextReviewAt).getTime() <= time)
    .filter((s) => hasActive(s.misconceptions))
    .sort((a, b) => {
      const rank = (s: SkillMemory) => (skillStatus(s) === 'confirmed' ? 0 : 1)
      const byRank = rank(a) - rank(b)
      return byRank !== 0 ? byRank : (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? '')
    })
    .slice(0, Math.max(0, limit))
}

/** The 1–3 misconceptions of a skill that matter now: active first, then by count. */
export function relevantMisconceptions(
  memory: SkillMemory | undefined,
  limit = 3,
): Misconception[] {
  if (!memory) return []
  return Object.values(memory.misconceptions)
    .filter((m) => m.status !== 'resolved')
    .sort((a, b) => {
      const active = Number(isActive(b)) - Number(isActive(a))
      return active !== 0 ? active : b.count - a.count
    })
    .slice(0, Math.max(0, Math.min(3, limit)))
}

/** Keeps at most `maxSkills` skills, the most recently practised. */
export function capSkills(
  skills: Readonly<Record<string, SkillMemory>>,
): Record<string, SkillMemory> {
  const list = Object.values(skills)
  if (list.length <= MEMORY_POLICY.maxSkills) return { ...skills }
  list.sort((a, b) => b.lastPracticedAt.localeCompare(a.lastPracticedAt))
  return Object.fromEntries(list.slice(0, MEMORY_POLICY.maxSkills).map((s) => [s.skill, s]))
}

// ------------------------------------------------------------ parent summary

export interface MemorySummary {
  /** Skills with a confirmed or improving misconception, the most recent first. */
  needsPractice: { skill: string; status: 'confirmed' | 'improving' }[]
  /** Skills resolved or mastered within `days`. */
  improved: { skill: string; why: 'resolved' | 'mastered' }[]
}

export function memorySummary(
  skills: Readonly<Record<string, SkillMemory>>,
  now: string,
  days = 30,
): MemorySummary {
  const since = new Date(now).getTime() - days * DAY_MS
  const needsPractice: MemorySummary['needsPractice'] = []
  const improved: MemorySummary['improved'] = []
  const ordered = Object.values(skills).sort((a, b) =>
    b.lastPracticedAt.localeCompare(a.lastPracticedAt),
  )
  for (const memory of ordered) {
    const status = skillStatus(forgetStale(memory, now))
    if (status === 'confirmed' || status === 'improving') {
      needsPractice.push({ skill: memory.skill, status })
      continue
    }
    const resolvedRecently = Object.values(memory.misconceptions).some(
      (m) => m.status === 'resolved' && m.resolvedAt && new Date(m.resolvedAt).getTime() >= since,
    )
    if (resolvedRecently) improved.push({ skill: memory.skill, why: 'resolved' })
    else if (memory.masteredAt && new Date(memory.masteredAt).getTime() >= since) {
      improved.push({ skill: memory.skill, why: 'mastered' })
    }
  }
  return { needsPractice, improved }
}
