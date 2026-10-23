import type { TFunction } from 'i18next'
import type { Language } from '@/content/languages'
import { groupLabel } from '@/features/math/content'
import { tDynamic } from '@/lib/tDynamic'
import type { LabOption, LabQuestion, Sign } from './generators'

/*
 * The words of a Math Lab question in the current language. Object names
 * after a number ("3 ta olma", "3 яблока", "3 apples") come from the
 * Matematika section's own grammar (math/content), so both sections agree.
 */

export const SIGN_NAME: Record<Sign, 'less' | 'greater' | 'equal'> = {
  '<': 'less',
  '>': 'greater',
  '=': 'equal',
}

export function objectWord(t: TFunction, q: Pick<LabQuestion, 'object'>): string {
  return tDynamic(t, `mathLab.objects.${q.object}`)
}

/** The instruction of a question, e.g. "Savatga 3 ta olma sol." */
export function promptText(t: TFunction, language: Language, q: LabQuestion): string {
  const params: Record<string, string | number> = { ...q.prompt.params, noun: objectWord(t, q) }
  if (q.prompt.key === 'drag') params.group = groupLabel(language, q.object, Number(q.answer))
  if (q.prompt.key === 'wordAdd' || q.prompt.key === 'wordSub') {
    params.group = groupLabel(language, q.object, Number(q.prompt.params.a))
  }
  return tDynamic(t, `mathLab.prompts.${q.prompt.key}`, params)
}

export function helpText(t: TFunction, q: LabQuestion): string {
  return tDynamic(t, `mathLab.help.${q.help.text.key}`, q.help.text.params)
}

/** The accessible name of an answer card. */
export function optionLabel(
  t: TFunction,
  language: Language,
  q: LabQuestion,
  option: LabOption,
): string {
  if (option.show === 'sign') return tDynamic(t, `mathLab.signs.${SIGN_NAME[option.value as Sign]}`)
  if (option.show === 'group') return groupLabel(language, q.object, Number(option.value))
  return String(option.value)
}

/** The written example as it is read: "3 + ? = 5", with a real minus sign. */
export function equationText(tokens: readonly (number | string)[]): string {
  return tokens.map((token) => (token === '-' ? '−' : String(token))).join(' ')
}
