/*
 * Child-friendly names of the skills a plant stands for. The internal key
 * (`math:add:within10`) is never shown: it maps to
 * `practiceGarden.skills.add-within10`; a skill without its own name falls
 * back to a general one. Tests keep this list equal to Math Lab's skills.
 */

export const NAMED_MATH_SKILLS = [
  'drag:to5',
  'drag:to10',
  'count:to5',
  'more:one',
  'less:one',
  'compare:groups',
  'compare:numbers',
  'add:within5',
  'add:within10',
  'add:within20',
  'sub:within5',
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
] as const

const NAMED: ReadonlySet<string> = new Set(NAMED_MATH_SKILLS)

/** The translation key of a skill's name (never the raw key). */
export function skillNameKey(skillKey: string): string {
  const skill = skillKey.startsWith('math:') ? skillKey.slice(5) : ''
  return NAMED.has(skill)
    ? `practiceGarden.skills.${skill.replace(':', '-')}`
    : 'practiceGarden.skills.fallback'
}
