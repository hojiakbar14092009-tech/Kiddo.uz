import { levelOf, MOVE_AFTER } from '@/domain/learner/profile'
import type { ChallengeLevel, LearnerStrands } from '@/domain/learner/profile'
import { ACHIEVEMENTS } from '@/domain/universe/achievements'
import type { UniverseChild } from '@/domain/universe/store'
import type { MistakeRecord, RecentRun } from '@/domain/universe/history'
import { isCreative } from '@/domain/universe/rules'
import { STRANDS, type ResourceEntry, type Strand, type Tier } from '@/domain/universe/types'
import { learnActivity, taskActivity } from '@/domain/universe/wiring'
import { BUILDINGS } from '@/domain/universe/world'
import type { LearnChild } from '@/features/learn/learnStore'
import { dayKey, ROUNDS_PER_TASK } from '@/features/tasks/rules'
import type { ChildProgress } from '@/store/progressStore'
import { weeklyCoins } from '../report'
import { activityName, skillFamily, STRAND_ROUTES, type SkillFamily } from './activityNames'
import { parentSkillNameKey, parentSkillRoute } from './skillLabel'

/*
 * Pure selectors of the parent dashboard ("Insights"). Everything is built
 * from what the stores already keep for one child – no invented numbers:
 * progressStore (results, minutesByDay), learnStore (sessions), the universe
 * child (recent runs, ledger, strands, stats, achievements, buildings,
 * mistakes). No ranking against other children; no failure wording.
 */

// ------------------------------------------------------------ played runs

/** One finished run, whichever feature it came from. */
export interface PlayedRun {
  id: string
  activity: string
  strand: Strand
  /** ISO time. */
  at: string
  independent: number
  total: number
}

function validTime(at: string): boolean {
  return !Number.isNaN(new Date(at).getTime())
}

/**
 * Every finished run known for the child, newest first, each id once. The
 * universe log (`recent`) covers every feature since it exists; letter games
 * and learning sessions are also read from their own stores, so older play
 * still shows.
 */
export function collectRuns(
  childKey: string,
  sources: {
    progress: Pick<ChildProgress, 'results'>
    learn: Pick<LearnChild, 'sessions'>
    recent: readonly RecentRun[] | undefined
  },
): PlayedRun[] {
  const byId = new Map<string, PlayedRun>()
  for (const run of sources.recent ?? []) {
    if (!run?.id || !validTime(run.at)) continue
    byId.set(run.id, {
      id: run.id,
      activity: run.activity,
      strand: run.strand,
      at: run.at,
      independent: run.independent,
      total: run.total,
    })
  }
  for (const result of sources.progress.results) {
    if (byId.has(result.id) || !validTime(result.finishedAt)) continue
    const event = taskActivity(childKey, result, ROUNDS_PER_TASK)
    byId.set(result.id, {
      id: result.id,
      activity: event.activity,
      strand: event.strand,
      at: result.finishedAt,
      independent: event.independent,
      total: event.total,
    })
  }
  for (const session of sources.learn.sessions) {
    if (byId.has(session.id) || !validTime(session.at)) continue
    const event = learnActivity(childKey, session)
    byId.set(session.id, {
      id: session.id,
      activity: event.activity,
      strand: event.strand,
      at: session.at,
      independent: event.independent,
      total: event.total,
    })
  }
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at))
}

// ------------------------------------------------------------ this week

export interface WeekDay {
  /** Local day, YYYY-MM-DD. */
  day: string
  minutes: number
  activities: number
  /** Coins from finished letter games and tests (as the Today panel counts them). */
  coins: number
}

export interface WeekSummary {
  /** The last seven local days, oldest first, today last. */
  days: WeekDay[]
  totalMinutes: number
  totalActivities: number
  totalCoins: number
  /** Resources earned (positive ledger entries) during these seven days. */
  earned: { star: number; crystal: number; scroll: number }
  /** Days with any minutes or activities. */
  activeDays: number
}

/** Noon of a local day (YYYY-MM-DD): a stable "now" for the selectors, the day the Today panel uses. */
export function dateOfDay(day: string): Date {
  const date = new Date(`${day}T12:00:00`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function lastSevenDays(today: Date = new Date()): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return dayKey(date)
  })
}

export function weekSummary(
  input: {
    minutesByDay: Readonly<Record<string, number>>
    runs: readonly PlayedRun[]
    ledger: readonly ResourceEntry[]
    results?: Pick<ChildProgress, 'results'>['results']
  },
  today: Date = new Date(),
): WeekSummary {
  const coins = new Map(
    weeklyCoins({ results: input.results ?? [] }, today).map((item) => [item.day, item.coins]),
  )
  const keys = lastSevenDays(today)
  const inWeek = new Set(keys)
  const counts = new Map<string, number>()
  for (const run of input.runs) {
    const day = dayKey(new Date(run.at))
    if (inWeek.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  const days = keys.map((day) => ({
    day,
    minutes: Math.max(0, Math.round(Number(input.minutesByDay[day]) || 0)),
    activities: counts.get(day) ?? 0,
    coins: coins.get(day) ?? 0,
  }))
  const earned = { star: 0, crystal: 0, scroll: 0 }
  for (const entry of input.ledger) {
    // a grown-up's manual grant (admin) is not something the child earned
    if (!(entry.amount > 0) || entry.reason === 'admin' || !validTime(entry.at)) continue
    if (!inWeek.has(dayKey(new Date(entry.at)))) continue
    if (entry.resource === 'star' || entry.resource === 'crystal' || entry.resource === 'scroll') {
      earned[entry.resource] += entry.amount
    }
  }
  return {
    days,
    totalMinutes: days.reduce((sum, item) => sum + item.minutes, 0),
    totalActivities: days.reduce((sum, item) => sum + item.activities, 0),
    totalCoins: days.reduce((sum, item) => sum + item.coins, 0),
    earned,
    activeDays: days.filter((item) => item.minutes > 0 || item.activities > 0).length,
  }
}

// ------------------------------------------------------------ skills

/** Words parents understand for the challenge levels 1–5 (`parent.insights.levels.<n>`). */
export const LEVEL_WORD_KEYS: Readonly<Record<ChallengeLevel, string>> = {
  1: 'gettingStarted',
  2: 'practising',
  3: 'confident',
  4: 'strong',
  5: 'advanced',
}

export function strandLevelWord(level: number): string {
  const clamped = Math.min(5, Math.max(1, Math.round(Number(level) || 1))) as ChallengeLevel
  return LEVEL_WORD_KEYS[clamped]
}

/** Answers and runs needed before a strand's accuracy is used for strengths or suggestions. */
export const MIN_SAMPLE = 15
export const MIN_RUNS = 3
export const WEAK_ACCURACY = 0.6
export const STRONG_ACCURACY = 0.8

/**
 * Activities whose score is not "first answers right": creative work, the
 * memory game (mismatched pairs are part of playing it) and tracing (a path
 * score). They count as activities but never for accuracy.
 */
export function countsForAccuracy(activity: string): boolean {
  if (isCreative(activity)) return false
  const { key } = activityName(activity)
  return !(
    key === 'memory' ||
    key === 'traceLetters' ||
    key === 'traceNumbers' ||
    key === 'traceShapes' ||
    key === 'studio'
  )
}

export interface StrandRow {
  strand: Strand
  /** Finished runs in this strand. */
  runs: number
  /**
   * The challenge level, only when the child's own results set it (an
   * adaptive strand with at least MOVE_AFTER runs); null otherwise, so no
   * age default is ever shown as if it were measured. Never set for art.
   */
  level: ChallengeLevel | null
  /** First answers right without help, 0–1 (null: no scored questions, e.g. drawing). */
  accuracy: number | null
  /** Questions behind `accuracy`. */
  answered: number
  /** Runs behind `accuracy` (the same runs as `answered`). */
  scoredRuns: number
  /** Where `accuracy` comes from: the adaptive profile or the strand's finished runs. */
  source: 'adaptive' | 'runs' | null
}

export interface SkillsView {
  active: StrandRow[]
  untouched: Strand[]
}

export function skillRows(input: {
  strands: LearnerStrands | undefined
  byStrand: Partial<Record<Strand, number>> | undefined
  runs: readonly PlayedRun[]
  age: number | null
}): SkillsView {
  const active: StrandRow[] = []
  const untouched: Strand[] = []
  for (const strand of STRANDS) {
    const own = input.runs.filter((run) => run.strand === strand)
    const state = input.strands?.[strand]
    const stateRuns = Math.max(0, Number(state?.runs) || 0)
    const runs = Math.max(Number(input.byStrand?.[strand]) || 0, own.length, stateRuns)
    if (runs === 0) {
      untouched.push(strand)
      continue
    }
    let answered = 0
    let right = 0
    let scoredRuns = 0
    let source: StrandRow['source'] = null
    if (state && Number(state.total) > 0) {
      // the adaptive profile: its own runs, its own answers
      answered = Number(state.total)
      right = Math.min(answered, Math.max(0, Number(state.independent) || 0))
      scoredRuns = stateRuns
      source = 'adaptive'
    } else {
      for (const run of own) {
        if (!countsForAccuracy(run.activity) || !(run.total > 0)) continue
        answered += run.total
        right += Math.min(run.total, Math.max(0, run.independent))
        scoredRuns += 1
      }
      source = answered > 0 ? 'runs' : null
    }
    const measured = strand !== 'art' && stateRuns >= MOVE_AFTER
    active.push({
      strand,
      runs,
      level: measured ? levelOf(input.strands, strand, input.age) : null,
      accuracy: answered > 0 ? right / answered : null,
      answered,
      scoredRuns,
      source,
    })
  }
  return { active, untouched }
}

/** Enough scored answers and runs to say anything about a strand. */
function enoughData(row: StrandRow): boolean {
  return row.accuracy !== null && row.answered >= MIN_SAMPLE && row.scoredRuns >= MIN_RUNS
}

// ------------------------------------------------------------ suggestions & strengths

export type Suggestion =
  | {
      kind: 'skill'
      strand: Strand
      skill: SkillFamily
      /** i18n key of the skill's name (maths by family, other areas by the registry). */
      nameKey: string
      count: number
      route: string
    }
  | { kind: 'strand'; strand: Strand; route: string }
  | { kind: 'explore'; strand: Strand; route: string }

/** Mistakes this recent count (days) feed the suggestions. */
export const MISTAKE_WINDOW_DAYS = 14

/**
 * Up to three gentle ideas: the most frequent recent mistake skills first,
 * then strands where first answers are often not yet right, then one strand
 * not tried yet. Each strand at most once.
 */
export function suggestions(
  input: {
    rows: readonly StrandRow[]
    untouched: readonly Strand[]
    mistakes?: readonly MistakeRecord[]
  },
  now: Date = new Date(),
  limit = 3,
): Suggestion[] {
  const out: Suggestion[] = []
  const used = new Set<Strand>()
  const since = now.getTime() - MISTAKE_WINDOW_DAYS * 24 * 60 * 60 * 1000

  const families = new Map<
    string,
    { strand: Strand; skill: SkillFamily; nameKey: string; route?: string; count: number }
  >()
  for (const mistake of input.mistakes ?? []) {
    const time = new Date(mistake.at).getTime()
    if (Number.isNaN(time) || time < since) continue
    const skill = skillFamily(mistake.skill.replace(/^math:/, ''))
    const nameKey = parentSkillNameKey(mistake.skill)
    const key = `${mistake.strand}|${nameKey}`
    const entry = families.get(key)
    if (entry) entry.count += 1
    else {
      const route = parentSkillRoute(mistake.skill)
      families.set(key, {
        strand: mistake.strand,
        skill,
        nameKey,
        count: 1,
        ...(route ? { route } : {}),
      })
    }
  }
  const ranked = [...families.values()].sort((a, b) => b.count - a.count)
  for (const entry of ranked) {
    if (out.length >= limit || used.has(entry.strand)) continue
    used.add(entry.strand)
    out.push({ kind: 'skill', ...entry, route: entry.route ?? STRAND_ROUTES[entry.strand] })
  }

  const weak = input.rows
    .filter((row) => enoughData(row) && (row.accuracy ?? 1) < WEAK_ACCURACY)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
  for (const row of weak) {
    if (out.length >= limit || used.has(row.strand)) continue
    used.add(row.strand)
    out.push({ kind: 'strand', strand: row.strand, route: STRAND_ROUTES[row.strand] })
  }

  const fresh = input.untouched.find((strand) => !used.has(strand))
  if (out.length < limit && fresh) {
    out.push({ kind: 'explore', strand: fresh, route: STRAND_ROUTES[fresh] })
  }
  return out
}

/**
 * Up to three strands the child does well in: high first-answer accuracy on
 * enough answers, or a measured level of 4–5. A strand among the practice
 * suggestions (`exclude`) is never also a strength.
 */
export function strengths(
  rows: readonly StrandRow[],
  exclude: readonly Strand[] = [],
  limit = 3,
): StrandRow[] {
  return rows
    .filter((row) => !exclude.includes(row.strand))
    .filter(
      (row) =>
        (enoughData(row) && (row.accuracy ?? 0) >= STRONG_ACCURACY) ||
        (row.level !== null && row.level >= 4),
    )
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0) || (b.level ?? 0) - (a.level ?? 0))
    .slice(0, limit)
}

// ------------------------------------------------------------ healthy play

export interface HealthyPlay {
  /** Average minutes on the days the child played (last 7 days), rounded. */
  averageMinutes: number
  daysPlayed: number
}

export function healthyPlay(days: readonly WeekDay[]): HealthyPlay {
  const played = days.filter((day) => day.minutes > 0)
  const total = played.reduce((sum, day) => sum + day.minutes, 0)
  return {
    averageMinutes: played.length > 0 ? Math.round(total / played.length) : 0,
    daysPlayed: played.length,
  }
}

// ------------------------------------------------------------ medals & city

export interface MedalsAndCity {
  medals: Record<Tier, number>
  medalsTotal: number
  medalsPossible: number
  /** Buildings upgraded at least once, highest level first. */
  buildings: { id: string; nameKey: string; level: number; maxLevel: number }[]
  upgrades: number
}

export function medalsAndCity(
  child: Pick<UniverseChild, 'achievements' | 'buildings'> | undefined,
): MedalsAndCity {
  const medals: Record<Tier, number> = { bronze: 0, silver: 0, gold: 0 }
  for (const achievement of ACHIEVEMENTS) {
    const tier = child?.achievements?.[achievement.id]
    if (tier === 'bronze' || tier === 'silver' || tier === 'gold') medals[tier] += 1
  }
  const buildings = BUILDINGS.map((def) => {
    const maxLevel = def.levels.length - 1
    const level = Math.min(
      maxLevel,
      Math.max(0, Math.floor(Number(child?.buildings?.[def.id]) || 0)),
    )
    return { id: def.id, nameKey: def.nameKey, level, maxLevel }
  })
    .filter((item) => item.level > 0)
    .sort((a, b) => b.level - a.level)
  return {
    medals,
    medalsTotal: medals.bronze + medals.silver + medals.gold,
    medalsPossible: ACHIEVEMENTS.length,
    buildings,
    upgrades: buildings.reduce((sum, item) => sum + item.level, 0),
  }
}
