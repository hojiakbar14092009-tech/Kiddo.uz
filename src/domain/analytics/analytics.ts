/*
 * Anonymous product analytics (Phase 37): which steps families reach and
 * where they leave, so every later change is checked against real use. An
 * event carries only its name, the day, the time, a random id of the install
 * and, for leaving, the coarse screen (the first two parts of the path). No
 * child, name, answer, photo or account is ever part of it.
 */

export const ANALYTICS_EVENTS = [
  'first_opened',
  'app_opened',
  'onboarding_done',
  'activity_opened',
  'activity_finished',
  'journey_done',
  'returned_day2',
  'returned_day7',
  'app_closed',
  // the attention helper (Phase 71): only that it happened, never what the camera saw
  'attention_yes',
  'attention_no',
  'attention_camera',
  'attention_nudge',
  'attention_offer',
  'attention_offer_taken',
] as const
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

export interface AnalyticsEvent {
  id: string
  name: AnalyticsEventName
  /** A random id of this install (never tied to a person). */
  install: string
  /** Local day `YYYY-MM-DD`. */
  day: string
  /** ISO time. */
  at: string
  /** For `app_closed` and `activity_opened`: the coarse screen, e.g. `/worlds/dino`. */
  screen?: string
}

/**
 * How often each event may be recorded (keeps the queue small and the counts
 * honest). `each`: every time (leaving: the server keeps the last one a day).
 */
export const ANALYTICS_ONCE: Record<AnalyticsEventName, 'ever' | 'day' | 'each'> = {
  first_opened: 'ever',
  app_opened: 'day',
  onboarding_done: 'ever',
  activity_opened: 'day',
  activity_finished: 'day',
  journey_done: 'day',
  returned_day2: 'ever',
  returned_day7: 'ever',
  app_closed: 'each',
  attention_yes: 'ever',
  attention_no: 'ever',
  attention_camera: 'day',
  attention_nudge: 'day',
  attention_offer: 'day',
  attention_offer_taken: 'day',
}

/**
 * The steps of a family's way into Kiddo, in order (the admin's funnel). A
 * cohort: only installs first opened in the period are counted, so a later
 * step never holds families the first step does not.
 */
export const FUNNEL_STEPS: readonly AnalyticsEventName[] = [
  'first_opened',
  'onboarding_done',
  'activity_opened',
  'activity_finished',
  'journey_done',
  'returned_day2',
  'returned_day7',
]

/** The places a child plays in: opening one counts as starting an activity. */
const ACTIVITY_PREFIXES = [
  '/tasks',
  '/alphabet',
  '/learn',
  '/math-lab',
  '/worlds',
  '/stories',
  '/scale-portal',
  '/shadow-lab',
  '/mistake-garden',
  '/exam',
  '/studio',
  '/adventure',
  '/spaceport',
  '/science-lab',
]

/**
 * The coarse screen of a path: its first two parts, letters, digits and dashes
 * only (ids and anything personal never pass). `/` is `/start`.
 */
export function screenOf(path: string): string {
  const parts = path
    .split(/[?#]/)[0]!
    .split('/')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.toLowerCase())
  if (parts.length === 0) return '/start'
  if (!parts.every((part) => /^[a-z][a-z0-9-]{0,30}$/.test(part))) return '/other'
  return `/${parts.join('/')}`
}

export function isActivityPath(path: string): boolean {
  const screen = screenOf(path)
  return ACTIVITY_PREFIXES.some((prefix) => screen === prefix || screen.startsWith(`${prefix}/`))
}

const DAY_MS = 86_400_000

function dayNumber(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS)
}

/**
 * Return events due on `today` for an install first opened on `firstDay`:
 * the next day counts as the day-2 return, a visit 7–13 days later as the
 * day-7 return.
 */
export function returnEventsFor(firstDay: string, today: string): AnalyticsEventName[] {
  const days = dayNumber(today) - dayNumber(firstDay)
  if (days === 1) return ['returned_day2']
  if (days >= 7 && days <= 13) return ['returned_day7']
  return []
}

/** The key that says an event was already recorded in its window (`null`: never limited). */
export function onceKey(name: AnalyticsEventName, day: string): string | null {
  const window = ANALYTICS_ONCE[name]
  return window === 'ever' ? name : window === 'day' ? `${name}|${day}` : null
}

export interface FunnelRow {
  step: AnalyticsEventName
  /** Installs that reached this step. */
  installs: number
}

/** Installs per funnel step, among the installs first opened in these events (the cohort). */
export function funnelOf(events: readonly AnalyticsEvent[]): FunnelRow[] {
  const cohort = new Set(
    events.filter((event) => event.name === 'first_opened').map((event) => event.install),
  )
  const reached = new Map<AnalyticsEventName, Set<string>>()
  for (const event of events) {
    if (!cohort.has(event.install)) continue
    const set = reached.get(event.name) ?? new Set<string>()
    set.add(event.install)
    reached.set(event.name, set)
  }
  return FUNNEL_STEPS.map((step) => ({ step, installs: reached.get(step)?.size ?? 0 }))
}

export interface ExitRow {
  screen: string
  count: number
}

/** Where the app was left: the last leaving of each install each day, most often first. */
export function exitsOf(events: readonly AnalyticsEvent[], limit = 8): ExitRow[] {
  const last = new Map<string, AnalyticsEvent>()
  for (const event of events) {
    if (event.name !== 'app_closed' || !event.screen) continue
    const key = `${event.install}|${event.day}`
    const seen = last.get(key)
    if (!seen || event.at >= seen.at) last.set(key, event)
  }
  const counts = new Map<string, number>()
  for (const event of last.values()) {
    counts.set(event.screen!, (counts.get(event.screen!) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([screen, count]) => ({ screen, count }))
    .sort((a, b) => b.count - a.count || a.screen.localeCompare(b.screen))
    .slice(0, limit)
}

/** Events of the last `days` days up to `today` (inclusive). */
export function withinDays(
  events: readonly AnalyticsEvent[],
  today: string,
  days: number,
): AnalyticsEvent[] {
  const end = dayNumber(today)
  return events.filter((event) => {
    const n = dayNumber(event.day)
    return n <= end && n > end - days
  })
}
