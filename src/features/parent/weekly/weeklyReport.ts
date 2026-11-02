import type { TFunction } from 'i18next'
import { findLetter } from '@/content/alphabet'
import type { Language } from '@/content/languages'
import type { SkillMemory } from '@/domain/learningMemory/memory'
import type { RecentRun } from '@/domain/universe/history'
import type { Strand } from '@/domain/universe/types'
import { homeworkStatus } from '@/features/homework/status'
import { dayKey } from '@/features/tasks/rules'
import { tDynamic } from '@/lib/tDynamic'
import type { ChildProfile, Homework } from '@/store/familyStore'
import { MIN_TREND_DAYS, recentlyMastered, type ActivityTrend } from '../dashboard/glance'
import { strandName } from '../insights/insightText'
import {
  lastSevenDays,
  weekSummary,
  type PlayedRun,
  type StrandRow,
  type Suggestion,
} from '../insights/insights'
import { parentSkillNameKey } from '../insights/skillLabel'
import type { StrugglingLetter } from '../report'

/*
 * The weekly report (Phase 47): the last seven local days (the same rolling
 * window as `lastSevenDays` / the week panel) for one child, built only from
 * the selectors the parent dashboard already uses. Pure and deterministic, so
 * the planned Telegram bot (Phase 56) can build the same report on a server.
 * No invented numbers: what is not known stays empty.
 */

/** The week's report covers this many days; "newly mastered" reaches as far back. */
export const WEEK_DAYS = 7
/** At most this many strengths and things to practise. */
export const WEEKLY_LIMIT = 3
/** Struggling letters named in one "practise" line. */
export const WEEKLY_LETTERS = 4

export interface WeeklyReportInput {
  /** The child's finished runs (`collectRuns` for this child only). */
  runs: readonly PlayedRun[]
  /** The child's minutes per local day (progress store). */
  minutesByDay: Readonly<Record<string, number>>
  /** `strengths()` of the dashboard (already excludes strands to practise). */
  strengths?: readonly StrandRow[]
  /** `suggestions()` of the dashboard. */
  suggestions?: readonly Suggestion[]
  /** The child's learning memory skills (`useChildMemory(id).skills`). */
  memory?: Readonly<Record<string, SkillMemory>>
  /** `strugglingLetters()` in `language`. */
  struggling?: readonly StrugglingLetter[]
  language?: Language
  /** The homework the parent set for this child. */
  homeworks?: readonly Homework[]
  /** The child's universe log, for activity homework status. */
  recent?: readonly RecentRun[]
}

export type WeeklyPractice =
  | { kind: 'letters'; language: Language; letterIds: string[] }
  | { kind: 'skill'; nameKey: string }
  | { kind: 'strand'; strand: Strand }

export interface WeeklyReport {
  /** Local days covered, oldest first, today last. */
  days: string[]
  /** Nothing played or timed in these seven days. */
  empty: boolean
  /** Days with play, 0–7. */
  activeDays: number
  totalMinutes: number
  activitiesFinished: number
  /** i18n keys of skills mastered (or a difficulty that came right) this week, one per name. */
  mastered: string[]
  /** Up to three strands the child does well in. */
  strengths: Strand[]
  /** Up to three things worth practising. */
  practice: WeeklyPractice[]
  /** Homework set or finished this week; null when there was none. */
  homework: { assigned: number; done: number } | null
  /**
   * Active days in these seven local days against the seven before, counted
   * the same way as `activeDays` (minutes or a finished run on the day), with
   * the dashboard's `MIN_TREND_DAYS` rule.
   */
  trend: ActivityTrend
}

function dayOf(at: string | null | undefined): string | null {
  if (!at) return null
  const date = new Date(at)
  return Number.isNaN(date.getTime()) ? null : dayKey(date)
}

/** Days among `days` with minutes or a finished run. */
function activeIn(
  days: readonly string[],
  minutesByDay: Readonly<Record<string, number>>,
  runDays: ReadonlySet<string>,
): number {
  // minutes rounded as `weekSummary` rounds them, so both counts agree
  return days.filter((day) => Math.round(Number(minutesByDay[day]) || 0) > 0 || runDays.has(day))
    .length
}

/**
 * The trend over the same calendar days as the report: these seven local days
 * against the seven before. A direction only with play in both and at least
 * `MIN_TREND_DAYS` active days in all (never guessed).
 */
export function weeklyTrend(
  input: Pick<WeeklyReportInput, 'runs' | 'minutesByDay'>,
  now: Date,
): ActivityTrend {
  const before = new Date(now)
  before.setDate(now.getDate() - WEEK_DAYS)
  const runDays = new Set(
    input.runs.map((run) => dayOf(run.at)).filter((day): day is string => day !== null),
  )
  const a = activeIn(lastSevenDays(now), input.minutesByDay, runDays)
  const b = activeIn(lastSevenDays(before), input.minutesByDay, runDays)
  if (b === 0 || a + b < MIN_TREND_DAYS) return { thisWeek: a, lastWeek: b, direction: 'none' }
  return { thisWeek: a, lastWeek: b, direction: a > b ? 'more' : a < b ? 'less' : 'same' }
}

export function weeklyReport(input: WeeklyReportInput, now: Date = new Date()): WeeklyReport {
  const days = lastSevenDays(now)
  const inWeek = new Set(days)
  const week = weekSummary({ minutesByDay: input.minutesByDay, runs: input.runs, ledger: [] }, now)

  // skills that came right this week; a name still being practised is not "mastered"
  const memory = recentlyMastered(input.memory ?? {}, now, WEEK_DAYS)
  const practising = new Set(memory.practising.map(parentSkillNameKey))
  const mastered = [...new Set(memory.mastered.map(parentSkillNameKey))].filter(
    (key) => !practising.has(key),
  )

  const practice: WeeklyPractice[] = []
  const letters = (input.struggling ?? []).slice(0, WEEKLY_LETTERS).map((entry) => entry.letterId)
  if (letters.length > 0 && input.language) {
    practice.push({ kind: 'letters', language: input.language, letterIds: letters })
  }
  const named = new Set<string>()
  for (const idea of input.suggestions ?? []) {
    if (idea.kind === 'skill' && !named.has(idea.nameKey)) {
      named.add(idea.nameKey)
      practice.push({ kind: 'skill', nameKey: idea.nameKey })
    } else if (idea.kind === 'strand') {
      practice.push({ kind: 'strand', strand: idea.strand })
    }
  }
  for (const key of practising) {
    if (named.has(key)) continue
    named.add(key)
    practice.push({ kind: 'skill', nameKey: key })
  }

  let homework: WeeklyReport['homework'] = null
  const thisWeek = (input.homeworks ?? []).filter((item) => {
    const set = dayOf(item.assignedAt)
    const done = dayOf(item.completedAt)
    return (set !== null && inWeek.has(set)) || (done !== null && inWeek.has(done))
  })
  if (thisWeek.length > 0) {
    const done = thisWeek.filter((item) => {
      const day = dayOf(item.completedAt)
      if (day === null || !inWeek.has(day)) return false
      const status = homeworkStatus(item, input.recent ?? [])
      return status === 'completed' || status === 'practice'
    }).length
    homework = { assigned: thisWeek.length, done }
  }

  return {
    days,
    empty: week.totalMinutes === 0 && week.totalActivities === 0,
    activeDays: week.activeDays,
    totalMinutes: week.totalMinutes,
    activitiesFinished: week.totalActivities,
    mastered,
    strengths: (input.strengths ?? []).slice(0, WEEKLY_LIMIT).map((row) => row.strand),
    practice: practice.slice(0, WEEKLY_LIMIT),
    homework,
    trend: weeklyTrend(input, now),
  }
}

// ------------------------------------------------------------ text

/** The first name only: a report that may be forwarded never carries a surname. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

export function practiceText(t: TFunction, item: WeeklyPractice): string {
  if (item.kind === 'letters') {
    return item.letterIds.map((id) => findLetter(item.language, id)?.upper ?? id).join(', ')
  }
  if (item.kind === 'skill') return tDynamic(t, item.nameKey)
  return strandName(t, item.strand)
}

/** The report's lines (name, numbers, mastered, strengths, practice, homework, trend). */
export function weeklyReportLines(
  t: TFunction,
  child: Pick<ChildProfile, 'name'>,
  report: WeeklyReport,
): string[] {
  const name = firstName(child.name)
  if (report.empty) return [t('parent.weekly.text.empty', { name })]
  const lines = [
    t('parent.weekly.text.summary', {
      name,
      days: report.activeDays,
      minutes: report.totalMinutes,
      activities: report.activitiesFinished,
    }),
  ]
  if (report.mastered.length > 0) {
    const list = report.mastered.map((key) => tDynamic(t, key)).join(', ')
    lines.push(t('parent.weekly.text.mastered', { list }))
  }
  if (report.strengths.length > 0) {
    const list = report.strengths.map((strand) => strandName(t, strand)).join(', ')
    lines.push(t('parent.weekly.text.strengths', { list }))
  }
  if (report.practice.length > 0) {
    const list = report.practice.map((item) => practiceText(t, item)).join('; ')
    lines.push(t('parent.weekly.text.practice', { list }))
  }
  if (report.homework) {
    lines.push(
      t('parent.weekly.text.homework', {
        done: report.homework.done,
        assigned: report.homework.assigned,
      }),
    )
  }
  if (report.trend.direction !== 'none') {
    lines.push(tDynamic(t, `parent.weekly.text.trend_${report.trend.direction}`))
  }
  return lines
}

/**
 * The weekly message in the current UI language, at most seven short lines:
 * the text a parent shares and the Telegram bot (Phase 56) will send.
 */
export function weeklyReportText(
  t: TFunction,
  child: Pick<ChildProfile, 'name'>,
  report: WeeklyReport,
): string {
  return weeklyReportLines(t, child, report).join('\n')
}
