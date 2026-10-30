import { activityName, type ActivityNameKey } from '@/features/parent/insights/activityNames'

/*
 * Advanced homework (Phase 23): besides letters, a parent can give any
 * learning activity as homework ("Math Lab, 3 times by Friday"). The child
 * opens it from the home screen; every finished run of that activity counts
 * once (by its run id, so a reload or a double event never counts twice),
 * and the homework is done when the count is reached. Deterministic, local,
 * no AI; the same child profile list as the letter homework.
 */

export interface HomeworkActivity {
  /** The activity name family a finished run must have (parent insights names). */
  key: ActivityNameKey
  /** Where the child opens it. */
  route: string
  emoji: string
  /** Youngest age it makes sense for (only a suggestion order; nothing locks by age). */
  fromAge: number
  /** The letter game behind it, when it is one (a parent sees only games open for the child). */
  game?: 'find-letter' | 'find-picture' | 'trace'
}

/** What a parent can give, in the order shown (free activities only: homework never needs a purchase). */
export const HOMEWORK_ACTIVITIES: readonly HomeworkActivity[] = [
  // alphabet, reading, writing: the letter games (the letters the child is learning)
  { key: 'findLetter', route: '/tasks/find-letter', emoji: '🅰️', fromAge: 5, game: 'find-letter' },
  {
    key: 'findPicture',
    route: '/tasks/find-picture',
    emoji: '📖',
    fromAge: 4,
    game: 'find-picture',
  },
  { key: 'traceLetters', route: '/tasks/trace', emoji: '✏️', fromAge: 6, game: 'trace' },
  { key: 'traceNumbers', route: '/trace/numbers', emoji: '✍️', fromAge: 4 },
  { key: 'mathLab', route: '/math-lab', emoji: '🔢', fromAge: 4 },
  { key: 'math', route: '/learn/math', emoji: '➕', fromAge: 4 },
  { key: 'words', route: '/learn/words', emoji: '🔤', fromAge: 5 },
  { key: 'tale', route: '/learn/tales', emoji: '📖', fromAge: 4 },
  { key: 'story', route: '/stories', emoji: '📚', fromAge: 4 },
  { key: 'space', route: '/learn/space', emoji: '🪐', fromAge: 5 },
  // science: the garden lessons (the Science Lab opens later, on the journey)
  { key: 'garden', route: '/learn/garden', emoji: '🌻', fromAge: 4 },
  { key: 'help', route: '/learn/help', emoji: '🤖', fromAge: 4 },
  { key: 'dinoQuiz', route: '/worlds/dino/quiz', emoji: '🦕', fromAge: 4 },
  { key: 'dinoDig', route: '/worlds/dino/dig', emoji: '🦴', fromAge: 4 },
  { key: 'uzMap', route: '/worlds/uzbekistan/map', emoji: '🗺️', fromAge: 5 },
  { key: 'uzTable', route: '/worlds/uzbekistan/table', emoji: '🍽️', fromAge: 4 },
  { key: 'feelings', route: '/feelings', emoji: '💛', fromAge: 4 },
]

export const MAX_HOMEWORK_TIMES = 5
export const MAX_HOMEWORK_NOTE = 120

export function homeworkActivity(key: string): HomeworkActivity | undefined {
  return HOMEWORK_ACTIVITIES.find((item) => item.key === key)
}

/** Activities a single lesson of which can be given (their lesson ids look like `5-1`). */
const TOPIC_TARGETS: ReadonlySet<string> = new Set(['space'])

/** A topic the store accepts: only for activities with lessons, a short lesson id. */
export function acceptsTopic(target: string, topic: string): boolean {
  return TOPIC_TARGETS.has(target) && /^[0-9]{1,2}(-[0-9]{1,2})?$/.test(topic)
}

/** The stage a topic homework's own check is saved under (e.g. `space:focus-5-1`). */
export function focusStage(topic: string): string {
  return `focus-${topic}`
}

/** Where a homework opens: its topic's lesson first, when it has one. */
export function homeworkRoute(item: HomeworkActivity, topic?: string): string {
  return topic ? `${item.route}?lesson=${encodeURIComponent(topic)}` : item.route
}

/**
 * Does a finished run (its activity id string) count for this homework target?
 * With a topic, only the check of that very lesson counts.
 */
export function countsFor(target: ActivityNameKey, activity: string, topic?: string): boolean {
  if (topic && !activity.endsWith(`:${focusStage(topic)}`)) return false
  const name = activityName(activity).key
  if (name === target) return true
  // the feelings games all count for "Feelings"
  return target === 'feelings' && name.startsWith('feelings')
}

/** Clamp what a parent typed: 1–5 times, a short note, a real day or none. */
export function cleanHomeworkInput(input: {
  times: number
  note?: string
  dueDay?: string | null
}): {
  times: number
  note: string
  dueDay: string | null
} {
  const times = Math.min(MAX_HOMEWORK_TIMES, Math.max(1, Math.round(Number(input.times) || 1)))
  const note = (input.note ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_HOMEWORK_NOTE)
  const dueDay = input.dueDay && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDay) ? input.dueDay : null
  return { times, note, dueDay }
}

/** Is an unfinished homework past its day (`today` as YYYY-MM-DD)? Never a punishment, only a note. */
export function isOverdue(
  homework: { dueDay?: string | null; completedAt: string | null },
  today: string,
) {
  return !homework.completedAt && !!homework.dueDay && homework.dueDay < today
}
