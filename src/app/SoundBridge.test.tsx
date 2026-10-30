import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { grantReward } from '@/domain/rewards'
import { useRewardStore } from '@/domain/rewards/rewardStore'
import { publish } from '@/domain/universe/progression'
import { useFamilyStore } from '@/store/familyStore'
import { SoundBridge } from './SoundBridge'

const queueCue = vi.hoisted(() => vi.fn())
vi.mock('@/services/audio/soundLanguage', () => ({ queueCue }))

type Event = Parameters<typeof publish>[0]

describe('SoundBridge', () => {
  beforeEach(() => {
    queueCue.mockReset()
    useFamilyStore.setState({ children: [], activeChildId: null })
    useRewardStore.setState({ byChild: {} })
  })

  it('answers moments of progress of the child at the screen with their sound', () => {
    render(<SoundBridge />)
    publish({
      type: 'resource.changed',
      childKey: 'guest',
      entry: { resource: 'star', amount: 2 },
    } as unknown as Event)
    publish({
      type: 'resource.changed',
      childKey: 'guest',
      entry: { resource: 'crystal', amount: -1 },
    } as unknown as Event)
    publish({ type: 'world.unlocked', childKey: 'guest', id: 'ocean' })
    publish({ type: 'plant.grew', childKey: 'guest', plot: 'p', stage: 2 })
    publish({ type: 'building.upgraded', childKey: 'guest', id: 'math-land', level: 2 })
    publish({ type: 'artifact.discovered', childKey: 'guest', id: 'a' })
    expect(queueCue.mock.calls.map(([cue]) => cue)).toEqual([
      'star',
      'spend',
      'unlock',
      'grow',
      'levelUp',
      'discovery',
    ])
  })

  it('stays quiet for another profile and for events that are not progress', () => {
    render(<SoundBridge />)
    publish({ type: 'world.unlocked', childKey: 'someone-else', id: 'ocean' })
    publish({ type: 'mistake.confirmed', childKey: 'guest', skill: 's', code: 'c' })
    expect(queueCue).not.toHaveBeenCalled()
  })

  it('coins earned ring, a parent’s fine does not; only the active profile is heard', () => {
    useFamilyStore.setState({ activeChildId: 'kid' })
    render(<SoundBridge />)
    grantReward({ childKey: 'kid', coins: 3, reason: 'task', refId: 'r1' })
    grantReward({ childKey: 'kid', coins: -2, reason: 'penalty', refId: 'p1' })
    grantReward({ childKey: 'other', coins: 3, reason: 'task', refId: 'r2' })
    expect(queueCue.mock.calls.map(([cue]) => cue)).toEqual(['coin'])
  })
})
