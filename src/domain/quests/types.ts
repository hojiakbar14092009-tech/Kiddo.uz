import type { RewardReason } from '@/domain/rewards'

/*
 * Phase 4 (Daily Quest, Adventure Map): types only. A quest is a short list
 * of steps; finishing it pays its reward once through `grantReward`
 * (reason 'quest', refId = `${quest.id}|${day}` for daily quests).
 */

/** What one step asks for: finish an activity of a kind, a number of times. */
export interface QuestStep {
  id: string
  /** A task type or learning section id, e.g. 'memory' or 'math'. */
  activity: string
  count: number
}

export interface QuestReward {
  coins: number
  reason: Extract<RewardReason, 'quest' | 'achievement'>
}

export interface Quest {
  id: string
  /** i18n key of the quest title. */
  titleKey: string
  steps: QuestStep[]
  reward: QuestReward
  /** 'daily' quests reset every local day; 'once' quests are done for good. */
  repeat: 'daily' | 'once'
}
