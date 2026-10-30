import {
  GARDEN_GROW_STREAK,
  gardenStage,
  MEMORY_POLICY,
  type GardenStage,
  type SkillMemory,
} from '@/domain/learningMemory/memory'
import {
  domainOf,
  LEARNING_DOMAINS,
  practiceRoute,
  type LearningDomain,
} from '@/domain/learning/skills'
import { stableHash } from '@/lib/stableHash'

/*
 * Mistake Garden (Phase 16, docs/architecture/mistake-garden.md). Pure and
 * deterministic: the garden is a view of the learning memory, never a store
 * of its own. One skill is one plant; its stage comes from `gardenStage`
 * (the only stage calculator); its look comes from the skill key, so the
 * same skill always grows the same plant. Nothing here pays anything: the
 * plant growing is the reward.
 */

export type PlantStage = Exclude<GardenStage, 'none'>

export const PLANT_STAGES: readonly PlantStage[] = ['seed', 'sprout', 'plant', 'bloom']

/** 0 (no plant) … 4 (bloom): a stage change upwards is growth. */
export function stageRank(stage: GardenStage): number {
  return stage === 'none' ? 0 : PLANT_STAGES.indexOf(stage) + 1
}

export const PLANT_FAMILIES = ['flower', 'leaf', 'tree', 'cactus', 'crystal', 'vine'] as const
export type PlantFamily = (typeof PLANT_FAMILIES)[number]

/** Petal / fruit colour sets of a family (see the art). */
export const PLANT_HUES = 4

export interface PlantLook {
  family: PlantFamily
  /** 0 … PLANT_HUES − 1. */
  hue: number
  /** Drawn mirrored, so two plants of one family still differ. */
  mirrored: boolean
}

export { stableHash }

/**
 * Families each domain grows: maths keeps all six (Phase 16 looks never
 * change); language grows leafy, climbing and flowering plants, science
 * natural botanical ones. The domain only shapes the character; it is one
 * garden in one style.
 */
const DOMAIN_FAMILIES: Record<LearningDomain, readonly PlantFamily[]> = {
  math: PLANT_FAMILIES,
  language: ['leaf', 'vine', 'flower'],
  science: ['tree', 'flower', 'leaf'],
}

/** The plant a skill always grows into (never random per render or session). */
export function plantLook(skillKey: string): PlantLook {
  const hash = stableHash(skillKey)
  const families = DOMAIN_FAMILIES[domainOf(skillKey) ?? 'math']
  return {
    family: families[hash % families.length]!,
    hue: Math.floor(hash / PLANT_FAMILIES.length) % PLANT_HUES,
    mirrored: Math.floor(hash / (PLANT_FAMILIES.length * PLANT_HUES)) % 2 === 1,
  }
}

/** What makes the plant grow next, in words a child understands (no scores). */
export type NextStep =
  /** A seed: practise the skill once (even with help) and it sprouts. */
  | { kind: 'practise' }
  /** Answer this many on your own, in a row, and it grows. */
  | { kind: 'grow'; count: number }
  /** Answer this many on your own, in a row, and it blooms. */
  | { kind: 'bloom'; count: number }
  /** Answer this many in a row; the look a day after the last error then makes it bloom. */
  | { kind: 'bloom-later'; count: number }
  /** Enough in a row; only the look a day later (a review) is still to come. */
  | { kind: 'check-later' }
  /** Learned. */
  | { kind: 'learned' }

const HOUR_MS = 3_600_000

/**
 * The next step, true to the memory's rules: a bloom needs `resolveStreak`
 * independent answers in a row including a review answered alone at least
 * `retentionGapHours` after the last error (practice from the garden is such a
 * review). Before that gap has passed, the plant can only bloom later.
 */
export function nextStep(memory: SkillMemory, stage: PlantStage, now: string): NextStep {
  const streak = Math.max(0, memory.successStreak)
  switch (stage) {
    case 'seed':
      return { kind: 'practise' }
    case 'sprout':
      return { kind: 'grow', count: Math.max(1, GARDEN_GROW_STREAK - streak) }
    case 'plant': {
      const remaining = Math.max(0, MEMORY_POLICY.resolveStreak - streak)
      const lastError = memory.lastErrorAt ? Date.parse(memory.lastErrorAt) : Number.NaN
      const lookPossible =
        memory.retained ||
        (Number.isFinite(lastError) &&
          Date.parse(now) - lastError >= MEMORY_POLICY.retentionGapHours * HOUR_MS)
      if (lookPossible) return { kind: 'bloom', count: Math.max(1, remaining) }
      return remaining > 0 ? { kind: 'bloom-later', count: remaining } : { kind: 'check-later' }
    }
    case 'bloom':
      return { kind: 'learned' }
  }
}

export interface GardenPlant {
  /** The learning-memory skill key, e.g. `math:add:within10` (never shown to the child). */
  skillKey: string
  /** The learning area (registry); null for a skill the registry does not know. */
  domain: LearningDomain | null
  stage: PlantStage
  look: PlantLook
  next: NextStep
  /** The activity that practises this skill; null for a bloom or an unknown skill. */
  practice: string | null
}

/**
 * The child's garden: one plant per skill with a stage, in a stable order
 * (the skill first practised first), so plants never swap places.
 */
export function gardenPlants(
  skills: Readonly<Record<string, SkillMemory>>,
  now: string = new Date().toISOString(),
): GardenPlant[] {
  const rows: { since: string; plant: GardenPlant }[] = []
  for (const memory of Object.values(skills)) {
    if (!isUsableMemory(memory)) continue
    const stage = gardenStage(memory)
    if (stage === 'none') continue
    rows.push({
      since: memory.firstAt,
      plant: {
        skillKey: memory.skill,
        domain: domainOf(memory.skill),
        stage,
        look: plantLook(memory.skill),
        next: nextStep(memory, stage, now),
        practice: stage === 'bloom' ? null : practiceRoute(memory.skill),
      },
    })
  }
  // one patch per area (maths, language, science), the skill first practised first
  const area = (plant: GardenPlant) =>
    plant.domain ? LEARNING_DOMAINS.indexOf(plant.domain) : LEARNING_DOMAINS.length
  rows.sort(
    (a, b) =>
      area(a.plant) - area(b.plant) ||
      a.since.localeCompare(b.since) ||
      a.plant.skillKey.localeCompare(b.plant.skillKey),
  )
  return rows.map((row) => row.plant)
}

/** Saved memory from an older or damaged state never breaks the garden: such a skill is skipped. */
export function isUsableMemory(memory: SkillMemory | undefined): memory is SkillMemory {
  return (
    typeof memory === 'object' &&
    memory !== null &&
    typeof memory.skill === 'string' &&
    typeof memory.firstAt === 'string' &&
    typeof memory.lastPracticedAt === 'string' &&
    typeof memory.misconceptions === 'object' &&
    memory.misconceptions !== null &&
    Object.values(memory.misconceptions).every(
      (m) => typeof m === 'object' && m !== null && typeof m.status === 'string',
    )
  )
}

export interface GardenSummary {
  total: number
  /** Plants still growing (seed, sprout, plant). */
  growing: number
  bloom: number
  seed: number
}

export function gardenSummary(plants: readonly GardenPlant[]): GardenSummary {
  const bloom = plants.filter((plant) => plant.stage === 'bloom').length
  return {
    total: plants.length,
    growing: plants.length - bloom,
    bloom,
    seed: plants.filter((plant) => plant.stage === 'seed').length,
  }
}

/** A filter is offered only when the garden is big and mixed (never for a few plants). */
export const FILTER_FROM_PLANTS = 7

/** The learning areas present in a garden, in the registry's order (no empty area). */
export function gardenAreas(plants: readonly GardenPlant[]): LearningDomain[] {
  const present = new Set(plants.map((plant) => plant.domain))
  return LEARNING_DOMAINS.filter((domain) => present.has(domain))
}
