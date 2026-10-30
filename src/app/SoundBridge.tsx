import { useEffect } from 'react'
import { subscribeRewards } from '@/domain/rewards/rewardStore'
import { subscribeDomainEvents } from '@/domain/universe/progression'
import { queueCue, type SoundCue } from '@/services/audio/soundLanguage'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY } from '@/store/progressStore'

const QUIET_REASONS: ReadonlySet<string> = new Set(['penalty', 'pro-gift', 'admin'])

/** Only the child at the screen is heard (never a sync or another profile's change). */
function isActive(childKey: string): boolean {
  return childKey === (useFamilyStore.getState().activeChildId ?? GUEST_KEY)
}

/**
 * The sound language (Phase 29), app-wide: moments of progress — coins,
 * stars, growth, an unlock — each answer with their own short sound. Sounds
 * only react; they never change progress.
 */
export function SoundBridge() {
  useEffect(() => {
    const stopRewards = subscribeRewards((entry) => {
      if (!isActive(entry.childKey) || entry.coins === 0) return
      // a parent's fine or gift is not a moment of the child's play
      if (QUIET_REASONS.has(entry.reason)) return
      queueCue(entry.coins > 0 ? 'coin' : 'spend')
    })
    const stopDomain = subscribeDomainEvents((event) => {
      if (!isActive(event.childKey)) return
      let cue: SoundCue | null = null
      switch (event.type) {
        case 'resource.changed':
          if (event.entry.amount < 0) cue = 'spend'
          else if (event.entry.amount > 0) cue = event.entry.resource === 'star' ? 'star' : 'coin'
          break
        case 'plant.grew':
          cue = 'grow'
          break
        case 'skill.mastered':
        case 'building.upgraded':
          cue = 'levelUp'
          break
        case 'artifact.discovered':
          cue = 'discovery'
          break
        case 'world.unlocked':
        case 'achievement.reached':
        case 'quest.claimed':
          cue = 'unlock'
          break
        default:
          break
      }
      if (cue) queueCue(cue)
    })
    return () => {
      stopRewards()
      stopDomain()
    }
  }, [])
  return null
}
