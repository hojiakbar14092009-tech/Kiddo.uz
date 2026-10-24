import { domainOf, skillDef, skillNameKey } from '@/domain/learning'
import { skillFamily } from './activityNames'

/**
 * The parent-facing name of a learning-memory skill: maths by family
 * ("Adding", "Taking away", as before), every other area by the skill
 * registry's name ("Knowing the letters"). Never a raw key.
 */
export function parentSkillNameKey(skill: string): string {
  const domain = domainOf(skill)
  if (domain === null || domain === 'math') {
    return `parent.insights.skillNames.${skillFamily(skill.replace(/^math:/, ''))}`
  }
  return skillNameKey(skill)
}

/** Where a parent can open practice for a non-maths skill (the registry's activity), else none. */
export function parentSkillRoute(skill: string): string | undefined {
  const def = skillDef(skill)
  return def && def.domain !== 'math' ? def.practice.path : undefined
}
