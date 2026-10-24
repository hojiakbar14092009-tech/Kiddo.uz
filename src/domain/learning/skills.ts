import type { Strand } from '@/domain/universe/types'

/*
 * The skill registry (Phase 17): every skill that may enter the learning
 * memory, in one place. A skill key is stable, language-independent and
 * never translated: `<domain>:<skill>` (the learning-memory key format, the
 * same the server checks). The registry says which domain a skill belongs
 * to, how it is named for a child (an i18n key), which existing activity
 * practises it, and which universe strand it counts for. Pure data: the
 * garden, the parent dashboard and the evidence adapters read it; nothing
 * here imports a feature.
 */

/** Learning areas with measurable, deterministic evidence today. */
export const LEARNING_DOMAINS = ['math', 'language', 'science'] as const
export type LearningDomain = (typeof LEARNING_DOMAINS)[number]

/** How a skill is practised: an existing route; `param` passes the skill (Math Lab). */
export interface PracticeTarget {
  path: string
  /** Query parameter that receives the skill (without its domain), e.g. `practice`. */
  param?: string
}

export interface SkillDef {
  key: string
  domain: LearningDomain
  /** Universe strand (journal, parent suggestions). */
  strand: Strand
  practice: PracticeTarget
}

const MATH_LAB: PracticeTarget = { path: '/math-lab', param: 'practice' }
const WORDS: PracticeTarget = { path: '/learn/words' }
const SPACE: PracticeTarget = { path: '/learn/space' }
const DINO_QUIZ: PracticeTarget = { path: '/worlds/dino/quiz' }

function defs(
  domain: LearningDomain,
  strand: Strand,
  practice: PracticeTarget,
  skills: readonly string[],
): SkillDef[] {
  return skills.map((skill) => ({ key: `${domain}:${skill}`, domain, strand, practice }))
}

export const SKILLS: readonly SkillDef[] = [
  // Math Lab (Phase 5/10) and the classic Math section (mapped onto the same skills)
  ...defs('math', 'number', MATH_LAB, [
    'drag:to5',
    'drag:to10',
    'count:to5',
    'more:one',
    'less:one',
    'compare:groups',
    'compare:numbers',
    'add:within10',
    'add:within20',
    'sub:within10',
    'sub:within20',
    'missing:add',
    'missing:sub',
    'neighbor:before',
    'neighbor:after',
    'neighbor:between',
    'two-step:within20',
    'word:add',
    'word:sub',
  ]),
  // only the classic Math section practises these (Math Lab never asks them)
  ...defs('math', 'number', { path: '/learn/math' }, ['add:within5', 'add:make10']),
  // letters and words
  ...defs('language', 'letters', { path: '/tasks/find-letter' }, ['letter-recognition']),
  ...defs('language', 'letters', { path: '/tasks/find-picture' }, ['first-sound']),
  ...defs('language', 'reading', WORDS, [
    'missing-letter',
    'word-building',
    'reading-words',
    'reading-sentences',
  ]),
  ...defs('language', 'reading', { path: '/learn/tales' }, ['story-questions']),
  // science: space and dinosaurs
  ...defs('science', 'space', SPACE, [
    'planet-names',
    'planet-facts',
    'planet-order',
    'sky-objects',
  ]),
  ...defs('science', 'science', DINO_QUIZ, ['dino-diet', 'dino-facts', 'dino-size']),
]

const BY_KEY: ReadonlyMap<string, SkillDef> = new Map(SKILLS.map((skill) => [skill.key, skill]))

export function skillDef(key: string): SkillDef | undefined {
  return BY_KEY.get(key)
}

export function isRegisteredSkill(key: string): boolean {
  return BY_KEY.has(key)
}

/** The domain of any memory key (its namespace), registered or not. */
export function domainOf(key: string): LearningDomain | null {
  const domain = key.split(':')[0]
  return (LEARNING_DOMAINS as readonly string[]).includes(domain ?? '')
    ? (domain as LearningDomain)
    : null
}

/** The i18n key of a skill's child-facing name (`learning.skills.<domain>-<skill>`). */
export function skillNameKey(key: string): string {
  return BY_KEY.has(key) ? `learning.skills.${key.replace(/:/g, '-')}` : 'learning.skills.fallback'
}

/** Marks a practice started from the Mistake Garden (the activity offers the way back). */
export const FROM_GARDEN = 'from=garden'

/**
 * The route that practises a skill, from the garden (null when the skill is
 * not registered: nothing is guessed).
 */
export function practiceRoute(key: string): string | null {
  const def = BY_KEY.get(key)
  if (!def) return null
  const { path, param } = def.practice
  const skill = key.slice(def.domain.length + 1)
  return param
    ? `${path}?${param}=${encodeURIComponent(skill)}&${FROM_GARDEN}`
    : `${path}?${FROM_GARDEN}`
}
