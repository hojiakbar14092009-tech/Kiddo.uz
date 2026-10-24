import { getSkillMemory, recordEvidence } from '@/domain/learningMemory/store'
import { emitUniverse } from '@/domain/universe/store'
import { toEvidence, type LearningOutcome } from './evidence'
import { skillDef } from './skills'

/*
 * The one way a learning module reports a finished question (Phase 17):
 * outcome → evidence → the learning memory (idempotent by evidence id, so a
 * re-render, a remount, a double tap or a retry is counted once). A wrong
 * first answer is also noted once per session in the mistake journal (the
 * parent's practice ideas), as Math Lab does at the end of its run. Nothing
 * here pays anything: rewards stay with the universe rules.
 */
export function recordLearning(childKey: string, outcome: LearningOutcome): boolean {
  if (!childKey) return false
  const def = skillDef(outcome.skill)
  const evidence = toEvidence(outcome, getSkillMemory(childKey, outcome.skill))
  if (!def || !evidence) return false
  const counted = recordEvidence(childKey, evidence)
  if (counted && !evidence.firstTry) {
    emitUniverse({
      type: 'mistake.made',
      childKey,
      skill: def.key,
      strand: def.strand,
      activityId: outcome.sessionId,
      at: evidence.at,
    })
  }
  return counted
}
