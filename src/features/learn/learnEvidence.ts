import { HINT, type LearningOutcome } from '@/domain/learning'
import { errorCode } from '@/domain/learning/evidence'
import type { SectionId } from './learnStore'
import type { AnswerRecord } from './session'

/*
 * Evidence adapter of the shared learning sections (Phase 17): a closed
 * question of Words, Tales, Space or the classic Math section becomes one
 * normalized outcome for the learning memory. Section skills are folded into
 * the registry's skills (many words or planets → one skill, one plant).
 * Not mapped (no outcome): the Garden section (every tap there counts as
 * found, so it has no wrong first answer to learn from) and Help Kiddo (the
 * child corrects the robot's mistake; that is not the child's difficulty).
 */

interface SectionRule {
  /** Raw section skill (its first part) → registry skill key. */
  skills: Readonly<Record<string, string>>
  /** Error labels that already are meaningful codes in this section. */
  codes: readonly string[]
  /** The code for any other wrong answer (one pattern per skill). */
  generic: string
  /** Section labels renamed to the codes other modules use for the same thing. */
  aliases?: Readonly<Record<string, string>>
  /** Challenge level (1–5) of a registry skill, where the section knows it. */
  levels?: Readonly<Record<string, number>>
}

const RULES: Partial<Record<SectionId, SectionRule>> = {
  words: {
    skills: {
      initial: 'language:first-sound',
      missing: 'language:missing-letter',
      build: 'language:word-building',
      'read:word': 'language:reading-words',
      'read:sentence': 'language:reading-sentences',
    },
    codes: ['wrong-initial', 'letter-order', 'misread-word', 'misread-sentence', 'wrong-letter'],
    generic: 'wrong-choice',
  },
  tales: {
    skills: {
      who: 'language:story-questions',
      what: 'language:story-questions',
      where: 'language:story-questions',
    },
    codes: [],
    generic: 'wrong-choice',
  },
  space: {
    skills: {
      identify: 'science:planet-names',
      feature: 'science:planet-facts',
      order: 'science:planet-order',
      kind: 'science:sky-objects',
    },
    codes: [],
    generic: 'wrong-choice',
  },
  math: {
    skills: {
      'add:sum3': 'math:add:within5',
      'add:sum5': 'math:add:within5',
      'add:sum10': 'math:add:within10',
      'add:to10': 'math:add:within10',
      'add:make10': 'math:add:make10',
      'add:over10': 'math:add:within20',
    },
    codes: ['off-by-one', 'forgot-ten', 'wrong-operation'],
    // an unclassified wrong sum says nothing about a misconception ('other' is ignored)
    generic: 'other',
    aliases: { subtracted: 'wrong-operation' },
    // the Math Lab level each fact range is asked at (so a review from Math Lab can serve it)
    levels: { 'math:add:within10': 2, 'math:add:within20': 4 },
  },
}

/** The registry skill of a section skill (`initial:a` → `language:first-sound`), or null. */
export function learnSkillKey(section: SectionId, rawSkill: string): string | null {
  const rule = RULES[section]
  if (!rule) return null
  const [head = '', second = ''] = rawSkill.split(':')
  return rule.skills[`${head}:${second}`] ?? rule.skills[head] ?? null
}

/** One closed question as a learning outcome (null for sections that give no evidence). */
export function learnOutcome(
  section: SectionId,
  sessionId: string,
  record: AnswerRecord,
  at: string,
): LearningOutcome | null {
  const rule = RULES[section]
  const skill = learnSkillKey(section, record.skill)
  if (!rule || !skill) return null
  const label = record.errorType ? (rule.aliases?.[record.errorType] ?? record.errorType) : null
  return {
    skill,
    sessionId,
    questionId: record.questionId,
    item: `${record.skill}|${record.questionId}`,
    firstTry: record.firstCorrect,
    helpedBefore: record.helped,
    errors: record.firstCorrect ? [] : [errorCode(label, rule.codes, rule.generic)],
    // the sections' help is a guided hint (help before answering is never independent anyway)
    hint: record.helped ? HINT.guided : HINT.none,
    at,
    ...(rule.levels?.[skill] ? { level: rule.levels[skill] } : {}),
  }
}
