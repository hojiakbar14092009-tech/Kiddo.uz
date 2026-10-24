import type { AwardSummary, ResourceEntry, Strand, Tier } from '../types'

/*
 * The domain events of the Kiddo Universe: one vocabulary for everything a
 * child does that changes the shared world. Features publish them (or the
 * universe functions do it for them); rules and sync listen. No UI here.
 *
 * Earning and spending travel as `resource.changed` (amount > 0: a reward
 * earned, < 0: a resource spent), the one event the cloud sync already
 * mirrors to the server's ledger.
 */
export type DomainEvent =
  | {
      type: 'activity.completed'
      childKey: string
      activityId: string
      activity: string
      award: AwardSummary
    }
  | { type: 'resource.changed'; childKey: string; entry: ResourceEntry }
  | { type: 'achievement.reached'; childKey: string; id: string; tier: Tier }
  | { type: 'quest.claimed'; childKey: string; day: string; award: AwardSummary }
  | { type: 'building.upgraded'; childKey: string; id: string; level: number }
  | {
      type: 'mistake.made'
      childKey: string
      skill: string
      strand: Strand
      activityId?: string
      at?: string
    }
  /** A misconception seen often enough to be real (learning memory). */
  | { type: 'mistake.confirmed'; childKey: string; skill: string; code: string }
  /** A confirmed misconception the child got past (learning memory). */
  | { type: 'mistake.resolved'; childKey: string; skill: string; code: string }
  | { type: 'skill.mastered'; childKey: string; skill: string }
  | { type: 'world.unlocked'; childKey: string; id: string }
  | { type: 'artifact.discovered'; childKey: string; id: string }
  | { type: 'seed.planted'; childKey: string; plot: string }
  | { type: 'plant.grew'; childKey: string; plot: string; stage: number }
  | { type: 'journey.step'; childKey: string; journey: string; step: string }
  | { type: 'quest.completed'; childKey: string; quest: string }

export type DomainEventType = DomainEvent['type']
