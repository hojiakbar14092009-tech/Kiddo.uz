import type { TFunction } from 'i18next'
import type { Language } from '@/content/languages'
import type { ChoiceStatus } from '@/features/learn/ChoiceGrid'
import type { TutorItem } from '@/domain/tutor'
import type { LabQuestion } from './generators'
import { equationText, optionLabel } from './text'

/*
 * What the tutor needs from a Math Lab question (docs/architecture/ai-tutor.md
 * §4). The game engine (generators.ts) decides what is right; these helpers
 * only describe the question in symbols, never in words about the child.
 */

/** The learning-memory key of a question's skill, e.g. `math:sub:within10`. */
export function labSkillKey(q: Pick<LabQuestion, 'skill'>): string {
  return `math:${q.skill}`
}

/** Written in symbols, so an explanation in words can add something (pictures are their own help). */
export function isSymbolic(q: LabQuestion): boolean {
  return ['equation', 'objects', 'compare', 'sequence', 'word'].includes(q.scene.type)
}

function wordOp(q: LabQuestion): '+' | '-' {
  return q.skill === 'word:sub' ? '-' : '+'
}

/** The exercise in symbols with `?` for the answer, e.g. `8 + 7 = ?`. */
export function expressionOf(q: LabQuestion): string {
  const scene = q.scene
  switch (scene.type) {
    case 'equation':
      return scene.tokens.join(' ')
    case 'objects':
      return `${scene.a} ${scene.op} ${scene.b} = ?`
    case 'compare':
      return `${scene.a} ? ${scene.b}`
    case 'sequence':
      return scene.cells.join(', ')
    case 'word':
      return `${scene.a} ${wordOp(q)} ${Number(q.prompt.params.b)} = ?`
    case 'group':
      return scene.change ? `${scene.count} ${scene.change > 0 ? '+' : '-'} 1 = ?` : '?'
    case 'basket':
      return `? = ${scene.target}`
    default:
      return '?'
  }
}

/** The task for the tutor: numbers and codes only. */
export function tutorItem(q: LabQuestion, learnerAnswer?: string, errorCode?: string): TutorItem {
  const item: TutorItem = {
    skill: q.skill,
    task: q.kind,
    expression: expressionOf(q),
    answer: q.answer,
  }
  if (learnerAnswer !== undefined && /^([0-9]{1,3}|[<>=])$/.test(learnerAnswer)) {
    item.learnerAnswer = learnerAnswer
  }
  if (errorCode && /^[a-z][a-z0-9-]{0,31}$/.test(errorCode)) item.errorCode = errorCode
  return item
}

/** The worked solution, shown only at the last hint step, e.g. `8 + 7 = 15`. */
export function solutionText(t: TFunction, language: Language, q: LabQuestion): string {
  const scene = q.scene
  const answer = q.answer
  const minus = (op: string) => (op === '-' ? '−' : op)
  switch (scene.type) {
    case 'equation':
      return equationText(scene.tokens.map((token) => (token === '?' ? answer : token)))
    case 'objects':
      return `${scene.a} ${minus(scene.op)} ${scene.b} = ${answer}`
    case 'compare':
      return `${scene.a} ${answer} ${scene.b}`
    case 'sequence':
      return scene.cells.map((cell) => (cell === '?' ? answer : cell)).join(', ')
    case 'word':
      return `${scene.a} ${minus(wordOp(q))} ${Number(q.prompt.params.b)} = ${answer}`
    case 'group':
      return scene.change
        ? `${scene.count} ${scene.change > 0 ? '+' : '−'} 1 = ${answer}`
        : optionText(t, language, q)
    default:
      return optionText(t, language, q)
  }
}

function optionText(t: TFunction, language: Language, q: LabQuestion): string {
  const option = q.options.find((o) => o.id === q.answer)
  return option ? optionLabel(t, language, q, option) : q.answer
}

/**
 * The wrong card to take away at the partial-solution step: the first wrong
 * option the child has not tried yet (null when none is left).
 */
export function cardToRemove(
  q: LabQuestion,
  statuses: Readonly<Record<string, ChoiceStatus>>,
): string | null {
  const option = q.options.find((o) => o.id !== q.answer && (statuses[o.id] ?? 'idle') === 'idle')
  return option?.id ?? null
}
