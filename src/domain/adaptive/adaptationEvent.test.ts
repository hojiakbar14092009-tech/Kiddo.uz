import { afterEach, describe, expect, it } from 'vitest'
import { rewardHistory, useRewardStore } from '@/domain/rewards'
import {
  emitActivity,
  getResources,
  subscribeUniverse,
  useUniverseStore,
  type UniverseEvent,
} from '@/domain/universe'
import { useProgressStore } from '@/store/progressStore'

describe('adaptation is published, never paid', () => {
  afterEach(() => {
    useUniverseStore.setState({ byChild: {} })
    useRewardStore.setState({ byChild: {} })
    useProgressStore.setState({ byChild: {} })
  })

  it('two strong runs at the current level move it up and publish adaptation.updated', () => {
    const seen: UniverseEvent[] = []
    const stop = subscribeUniverse((event) => seen.push(event))
    const run = (n: number) =>
      emitActivity({
        id: `adapt-${n}`,
        childKey: 'adapt-kid',
        activity: `math-lab:count:L2:${n}`,
        strand: 'number',
        correct: 5,
        total: 5,
        independent: 5,
        level: 2,
      })
    run(1)
    expect(seen.filter((e) => e.type === 'adaptation.updated')).toHaveLength(0)
    const before = getResources('adapt-kid')
    const paidBefore = rewardHistory('adapt-kid').length
    const award = run(2)
    stop()
    const moved = seen.filter((e) => e.type === 'adaptation.updated')
    expect(moved).toEqual([
      { type: 'adaptation.updated', childKey: 'adapt-kid', strand: 'number', from: 2, to: 3 },
    ])
    // the second run pays what any run pays (stars; a crystal's and a part's worth in
    // nuts): nothing for the move
    const after = getResources('adapt-kid')
    expect(after.star - before.star).toBe(3)
    expect(award.nuts).toBe(15)
    const paid = rewardHistory('adapt-kid')
      .slice(0, rewardHistory('adapt-kid').length - paidBefore)
      .filter((entry) => entry.reason !== 'achievement')
    expect(paid.map((entry) => [entry.refId, entry.coins]).sort()).toEqual([
      ['crystal|three-stars|math-lab:count:L2:2', 10],
      [expect.stringMatching(/^part\|number-3star\|math-lab:count:L2:2\|/), 5],
    ])
  })
})
