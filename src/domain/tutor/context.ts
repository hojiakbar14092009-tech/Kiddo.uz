import type { Language } from '@/content/languages'
import type { ChallengeLevel } from '@/domain/learner'
import { preferredHint, relevantMisconceptions, type SkillMemory } from '@/domain/learningMemory'
import { bandForLevel } from './ladder'
import type {
  Intent,
  Persona,
  TutorHintLevel,
  TutorItem,
  TutorMemorySlice,
  TutorRequest,
} from './types'

/*
 * TutorContextBuilder (docs/architecture/ai-tutor.md §3): the only place that
 * turns what Kiddo knows into what the tutor may see. It takes the exercise
 * (numbers and codes from the game engine) and at most three relevant
 * misconceptions of this one skill; never the profile, the name, the age, the
 * family or the rest of the memory. The child id goes to Kiddo's server only
 * (consent check) and is never put into a prompt.
 */

export function memorySlice(memory: SkillMemory | undefined): TutorMemorySlice | undefined {
  if (!memory || memory.evidence === 0) return undefined
  const misconceptions = relevantMisconceptions(memory, 3).map((m) => ({
    code: m.code,
    count: Math.min(999, m.count),
    status: m.status as TutorMemorySlice['misconceptions'][number]['status'],
  }))
  const slice: TutorMemorySlice = {
    mastery: Math.round(memory.mastery * 100) / 100,
    misconceptions,
  }
  const style = preferredHint(memory)
  if (style) slice.preferredHint = style
  return slice
}

export function buildTutorRequest(input: {
  childId: string
  language: Language
  level: ChallengeLevel
  persona: Persona
  intent: Intent
  hintLevel: TutorHintLevel
  item: TutorItem
  memory?: SkillMemory
}): TutorRequest {
  const item: TutorItem = {
    skill: input.item.skill,
    task: input.item.task,
    expression: input.item.expression,
    answer: input.item.answer,
  }
  if (input.item.learnerAnswer !== undefined) item.learnerAnswer = input.item.learnerAnswer
  if (input.item.errorCode !== undefined) item.errorCode = input.item.errorCode
  const request: TutorRequest = {
    v: 1,
    childId: input.childId,
    language: input.language,
    band: bandForLevel(input.level),
    persona: input.persona,
    intent: input.intent,
    hintLevel: input.hintLevel,
    item,
  }
  const memory = memorySlice(input.memory)
  if (memory) request.memory = memory
  return request
}
