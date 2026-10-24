import type { SkillMemory } from '@/domain/learningMemory'
import type { DomainEvent } from './events'

/*
 * Learning memory changes as domain events (pure): a misconception that just
 * got confirmed or resolved, a skill that just became mastered. The memory
 * rules decide; this only notices the change and puts it on the universe bus
 * (for rules and later consumers; the Practice Garden page itself reads the
 * memory's garden stages directly, the memory being their source of truth).
 */
export function memoryEvents(
  childKey: string,
  before: SkillMemory | undefined,
  after: SkillMemory,
): DomainEvent[] {
  const events: DomainEvent[] = []
  for (const [code, now] of Object.entries(after.misconceptions)) {
    const was = before?.misconceptions[code]?.status
    if (now.status === was) continue
    if (now.status === 'confirmed' && was !== 'improving') {
      events.push({ type: 'mistake.confirmed', childKey, skill: after.skill, code })
    } else if (now.status === 'resolved') {
      events.push({ type: 'mistake.resolved', childKey, skill: after.skill, code })
    }
  }
  if (after.masteredAt && !before?.masteredAt) {
    events.push({ type: 'skill.mastered', childKey, skill: after.skill })
  }
  return events
}
