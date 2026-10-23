import type { Strand } from '@/domain/universe/types'

/*
 * Friendly names of played activities for the parent dashboard. One pure
 * mapper from the universe activity id (`math-lab:count:L1`, `story:lost-lamb`,
 * `find-letter:uz`, `tale:fox`, …) to a translation key under
 * `parent.insights.names` and its parameters. Unknown or malformed ids get the
 * generic name; nothing here throws.
 */

export type ActivityNameKey =
  | 'findLetter'
  | 'findPicture'
  | 'memory'
  | 'traceLetters'
  | 'exam'
  | 'words'
  | 'math'
  | 'space'
  | 'garden'
  | 'help'
  | 'tale'
  | 'mathLab'
  | 'feelingsFaces'
  | 'feelingsScenes'
  | 'feelingsKindness'
  | 'feelings'
  | 'story'
  | 'dinoDig'
  | 'dinoQuiz'
  | 'dino'
  | 'uzMap'
  | 'uzTable'
  | 'uzPatterns'
  | 'uzbekistan'
  | 'traceNumbers'
  | 'traceShapes'
  | 'studio'
  | 'other'

export const ACTIVITY_NAME_KEYS: readonly ActivityNameKey[] = [
  'findLetter',
  'findPicture',
  'memory',
  'traceLetters',
  'exam',
  'words',
  'math',
  'space',
  'garden',
  'help',
  'tale',
  'mathLab',
  'feelingsFaces',
  'feelingsScenes',
  'feelingsKindness',
  'feelings',
  'story',
  'dinoDig',
  'dinoQuiz',
  'dino',
  'uzMap',
  'uzTable',
  'uzPatterns',
  'uzbekistan',
  'traceNumbers',
  'traceShapes',
  'studio',
  'other',
]

/** Story Engine stories with their own title key (`parent.insights.stories.<id>`). */
export const STORY_IDS = [
  'lost-lamb',
  'grandma-garden',
  'navruz-sumalak',
  'bazaar-kindness',
  'star-night',
  'mahalla-hashar',
] as const
export type StoryId = (typeof STORY_IDS)[number]

const LANGUAGES = ['uz', 'ru', 'en'] as const
export type PlayLanguage = (typeof LANGUAGES)[number]

export interface ActivityName {
  key: ActivityNameKey
  /** A known story's id: shown as "Story: <title>". */
  storyId?: StoryId
  /** The level played at (adaptive activities), 1–5. */
  level?: number
  /** The language of a letter game. */
  language?: PlayLanguage
}

const TASKS: Record<string, ActivityNameKey> = {
  'find-letter': 'findLetter',
  'find-picture': 'findPicture',
  memory: 'memory',
  trace: 'traceLetters',
  exam: 'exam',
}

const LEARN: Record<string, ActivityNameKey> = {
  words: 'words',
  math: 'math',
  space: 'space',
  garden: 'garden',
  help: 'help',
  tale: 'tale',
}

const FEELINGS: Record<string, ActivityNameKey> = {
  faces: 'feelingsFaces',
  scenes: 'feelingsScenes',
  kindness: 'feelingsKindness',
}

const DINO: Record<string, ActivityNameKey> = { dig: 'dinoDig', quiz: 'dinoQuiz' }

const UZBEKISTAN: Record<string, ActivityNameKey> = {
  map: 'uzMap',
  table: 'uzTable',
  patterns: 'uzPatterns',
}

function levelPart(part: string | undefined): number | undefined {
  const match = /^L([1-5])$/.exec(part ?? '')
  return match ? Number(match[1]) : undefined
}

function own<T>(map: Record<string, T>, key: string | undefined): T | undefined {
  return key !== undefined && Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined
}

/** The friendly name of an activity id. Never throws; unknown ids are 'other'. */
export function activityName(activity: unknown): ActivityName {
  if (typeof activity !== 'string' || activity.length === 0) return { key: 'other' }
  const [base, second, third] = activity.split(':')

  switch (base) {
    case 'math-lab': {
      const level = levelPart(third)
      return level ? { key: 'mathLab', level } : { key: 'mathLab' }
    }
    case 'feelings':
      return { key: own(FEELINGS, second) ?? 'feelings' }
    case 'story': {
      const id = STORY_IDS.find((item) => item === second)
      return id ? { key: 'story', storyId: id } : { key: 'story' }
    }
    case 'dino': {
      const level = levelPart(third)
      const key = own(DINO, second) ?? 'dino'
      return level ? { key, level } : { key }
    }
    case 'uzbekistan':
      return { key: own(UZBEKISTAN, second) ?? 'uzbekistan' }
    case 'studio':
      return { key: 'studio' }
    case 'trace':
      // `trace:number:7` / `trace:shape:circle` are the tracing pages,
      // `trace:uz` the letter tracing game.
      if (second === 'number') return { key: 'traceNumbers' }
      if (second === 'shape') return { key: 'traceShapes' }
      break
    default:
      break
  }

  const task = own(TASKS, base)
  if (task) {
    const language = LANGUAGES.find((item) => item === second)
    return language ? { key: task, language } : { key: task }
  }
  const learn = own(LEARN, base)
  if (learn) return { key: learn }
  return { key: 'other' }
}

/** Where a parent can open the activity a strand is practised in (gentle suggestions). */
export const STRAND_ROUTES: Readonly<Record<Strand, string>> = {
  letters: '/alphabet',
  reading: '/learn/words',
  number: '/math-lab',
  logic: '/learn/help',
  language: '/stories',
  science: '/worlds/dino',
  space: '/learn/space',
  art: '/studio',
  social: '/feelings',
}

/** Math Lab skill families (`sub:within10` → 'sub') with their own name key. */
export const SKILL_FAMILIES = [
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
] as const
export type SkillFamily = (typeof SKILL_FAMILIES)[number] | 'other'

export function skillFamily(skill: unknown): SkillFamily {
  if (typeof skill !== 'string') return 'other'
  const base = skill.split(':')[0]
  return SKILL_FAMILIES.find((item) => item === base) ?? 'other'
}
