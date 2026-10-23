import { useCallback, useRef, useState } from 'react'
import { useChallengeLevel, type ChallengeLevel } from '@/domain/learner'
import { emitActivity } from '@/domain/universe'
import { useMascot } from '@/features/mascot/useMascot'
import { newId } from '@/lib/id'
import { useChildKey } from '@/store/progressStore'
import { GAME_STRAND, runResult, uzbekistanActivity, type GameKind } from './generators'

export const HUB = '/worlds/uzbekistan'

export interface Reward {
  stars: number
  crystals: number
}

/**
 * One run of a scored game: the level is fixed when the run starts (finishing
 * may move it), and `finish` reports the run to the universe exactly once,
 * with that level, so only a run at the child's current level moves the profile.
 */
export function useGameRun(kind: GameKind, doneText: string) {
  const childKey = useChildKey()
  const current = useChallengeLevel(GAME_STRAND[kind])
  const [level] = useState<ChallengeLevel>(current)
  const [reward, setReward] = useState<Reward | null>(null)
  const emitted = useRef(false)
  const { react } = useMascot()

  const finish = useCallback(
    (firstTries: readonly boolean[]) => {
      if (emitted.current) return
      emitted.current = true
      react('celebrate', { text: doneText }, { speak: false })
      try {
        const gained = emitActivity({
          id: newId(),
          childKey,
          activity: uzbekistanActivity(kind, level),
          strand: GAME_STRAND[kind],
          level,
          ...runResult(firstTries),
        })
        setReward({ stars: gained.stars, crystals: gained.crystals })
      } catch {
        // the praise stays; the universe keeps its own state
        setReward({ stars: 0, crystals: 0 })
      }
    },
    [childKey, doneText, kind, level, react],
  )

  return { level, reward, finish }
}
