import { beforeEach, describe, expect, it } from 'vitest'
import { recordProPurchase } from '@/features/pro/purchase'
import { getLearnChild, useLearnStore } from '@/features/learn/learnStore'
import { useAppSettingsStore } from '@/store/appSettingsStore'
import { useFamilyStore } from '@/store/familyStore'
import { EMPTY_PROGRESS, GUEST_KEY, useProgressStore } from '@/store/progressStore'
import {
  grantReward,
  ledgerTotal,
  REWARD_LIMITS,
  rewardHistory,
  spendCoins,
  subscribeRewards,
  useRewardStore,
  wasRewarded,
  type RewardEntry,
} from '.'

const KID = 'kid-1'
const MORNING = new Date(2026, 9, 18, 9, 0)
const EVENING = new Date(2026, 9, 18, 19, 0)

const coins = (key = KID) => useProgressStore.getState().byChild[key]?.coins ?? 0

/** What a page reload does: memory is gone, the stores read localStorage again. */
async function reload() {
  // Clearing memory writes the empty state back, so keep what was saved and put it back.
  const saved = Object.fromEntries(
    ['kiddo.progress', 'kiddo.rewards', 'kiddo.learn'].map((key) => [
      key,
      localStorage.getItem(key),
    ]),
  )
  useProgressStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
  useLearnStore.setState({ byChild: {} })
  expect(useProgressStore.getState().byChild[KID]).toBeUndefined()
  for (const [key, value] of Object.entries(saved)) {
    if (value !== null) localStorage.setItem(key, value)
  }
  await useProgressStore.persist.rehydrate()
  await useRewardStore.persist.rehydrate()
  await useLearnStore.persist.rehydrate()
}

function reset() {
  useProgressStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
  useLearnStore.setState({ byChild: {} })
  useFamilyStore.setState({ children: [], activeChildId: null })
}

describe('grantReward', () => {
  beforeEach(reset)

  it('pays once per (child, reason, refId) and records the entry', () => {
    const entry = grantReward({ childKey: KID, coins: 5, reason: 'quest', refId: 'q1' })
    expect(entry).toMatchObject({ childKey: KID, coins: 5, reason: 'quest', refId: 'q1' })
    expect(entry?.id).toBeTruthy()
    expect(grantReward({ childKey: KID, coins: 5, reason: 'quest', refId: 'q1' })).toBeNull()
    expect(coins()).toBe(5)
    expect(rewardHistory(KID)).toHaveLength(1)
  })

  it('keeps the same refId apart per reason and per child', () => {
    grantReward({ childKey: KID, coins: 1, reason: 'quest', refId: 'x' })
    expect(
      grantReward({ childKey: KID, coins: 1, reason: 'achievement', refId: 'x' }),
    ).not.toBeNull()
    expect(grantReward({ childKey: 'kid-2', coins: 1, reason: 'quest', refId: 'x' })).not.toBeNull()
    expect(coins()).toBe(2)
    expect(coins('kid-2')).toBe(1)
  })

  it('pays only once when the same refId arrives at the same time', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        Promise.resolve().then(() =>
          grantReward({ childKey: KID, coins: 3, reason: 'admin', refId: 'same' }),
        ),
      ),
    )
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(coins()).toBe(3)
  })

  it('stays idempotent after old entries were trimmed from the history', () => {
    const total = REWARD_LIMITS.maxEntries + 10
    for (let i = 0; i < total; i++) {
      grantReward({ childKey: KID, coins: 1, reason: 'task', refId: `t${i}` })
    }
    expect(rewardHistory(KID)).toHaveLength(REWARD_LIMITS.maxEntries)
    expect(rewardHistory(KID).some((entry) => entry.refId === 't0')).toBe(false)
    expect(grantReward({ childKey: KID, coins: 1, reason: 'task', refId: 't0' })).toBeNull()
    expect(coins()).toBe(total)
  })

  it('refuses zero, non-finite and negative amounts except for a penalty', () => {
    expect(grantReward({ childKey: KID, coins: 0, reason: 'task', refId: 'a' })).toBeNull()
    expect(grantReward({ childKey: KID, coins: Number.NaN, reason: 'task', refId: 'b' })).toBeNull()
    expect(grantReward({ childKey: KID, coins: -3, reason: 'admin', refId: 'c' })).toBeNull()
    expect(grantReward({ childKey: KID, coins: -3, reason: 'purchase', refId: 'd' })).toBeNull()
    expect(rewardHistory(KID)).toHaveLength(0)
  })

  it('never takes the balance below zero; the entry shows what was really taken', () => {
    grantReward({ childKey: KID, coins: 4, reason: 'admin', refId: 'gift' })
    const penalty = grantReward({ childKey: KID, coins: -10, reason: 'penalty', refId: 'p1' })
    expect(coins()).toBe(0)
    expect(penalty?.coins).toBe(-4)
    expect(ledgerTotal(KID)).toBe(0)
  })

  it('tells subscribers about every new entry, and only new ones', () => {
    const seen: RewardEntry[] = []
    const stop = subscribeRewards((entry) => seen.push(entry))
    const failing = subscribeRewards(() => {
      throw new Error('sync is down')
    })
    grantReward({ childKey: KID, coins: 2, reason: 'quest', refId: 'q' })
    grantReward({ childKey: KID, coins: 2, reason: 'quest', refId: 'q' })
    stop()
    failing()
    grantReward({ childKey: KID, coins: 2, reason: 'quest', refId: 'q2' })
    expect(seen.map((entry) => entry.refId)).toEqual(['q'])
    expect(coins()).toBe(4)
  })
})

describe('spendCoins and the shop', () => {
  beforeEach(reset)

  it('refuses when the balance is too small and changes nothing', () => {
    grantReward({ childKey: KID, coins: 10, reason: 'admin', refId: 'g' })
    expect(spendCoins({ childKey: KID, coins: 11, refId: 'buy-1' })).toBeNull()
    expect(spendCoins({ childKey: KID, coins: 0, refId: 'buy-2' })).toBeNull()
    expect(coins()).toBe(10)
    const entry = spendCoins({ childKey: KID, coins: 10, refId: 'buy-3' })
    expect(entry).toMatchObject({ coins: -10, reason: 'purchase' })
    expect(spendCoins({ childKey: KID, coins: 0, refId: 'buy-3' })).toBeNull()
    expect(coins()).toBe(0)
  })

  it('records shop purchases in the ledger', () => {
    useProgressStore.setState({ byChild: { [KID]: { ...EMPTY_PROGRESS, coins: 100 } } })
    expect(useProgressStore.getState().buyOutfit(KID, 'cap')).toBe(true)
    expect(useProgressStore.getState().buyPet(KID, 'cat')).toBe(true)
    const purchases = rewardHistory(KID).filter((entry) => entry.reason === 'purchase')
    expect(purchases.map((entry) => entry.coins)).toEqual([-75, -15])
    expect(coins()).toBe(10)
  })
})

describe('coin paths pay exactly once', () => {
  beforeEach(reset)

  const task = { type: 'memory' as const, language: 'uz' as const, letterIds: ['a'] }

  it('completeTask pays the task and one daily bonus, also after a reload', async () => {
    const first = useProgressStore
      .getState()
      .completeTask(KID, { ...task, mistakeDetails: [] }, MORNING)
    expect(first).toMatchObject({ coins: 5, bonus: 2 })
    await reload()
    expect(coins()).toBe(7)
    expect(wasRewarded(KID, 'daily-bonus', 'daily|2026-10-18')).toBe(true)

    const second = useProgressStore
      .getState()
      .completeTask(KID, { ...task, mistakeDetails: [] }, EVENING)
    expect(second).toMatchObject({ coins: 5, bonus: 0 })
    expect(coins()).toBe(12)
    expect(rewardHistory(KID).map((entry) => entry.reason)).toEqual(['task', 'daily-bonus', 'task'])
    expect(ledgerTotal(KID)).toBe(12)
  })

  it('finishSession pays a session once, also after a reload', async () => {
    const session = {
      id: 'session-1',
      section: 'math' as const,
      stage: '4',
      language: 'any' as const,
      mode: 'learn' as const,
      total: 3,
      independent: 2,
      helped: 0,
      wrong: 1,
      weakSkills: ['x'],
      strongSkills: ['y', 'z'],
    }
    expect(useLearnStore.getState().finishSession(KID, session)).toBe(3)
    await reload()
    expect(useLearnStore.getState().finishSession(KID, session)).toBe(0)
    expect(coins()).toBe(3)
    expect(getLearnChild(KID).sessions).toHaveLength(1)
  })

  it('still honours sessions paid before the ledger existed', () => {
    useLearnStore.setState({
      byChild: { [KID]: { ...getLearnChild(KID), rewarded: ['old-session'] } },
    })
    const paid = useLearnStore.getState().finishSession(KID, {
      id: 'old-session',
      section: 'words',
      stage: '4',
      language: 'uz',
      mode: 'learn',
      total: 1,
      independent: 1,
      helped: 0,
      wrong: 0,
      weakSkills: [],
      strongSkills: ['a'],
    })
    expect(paid).toBe(0)
    expect(coins()).toBe(0)
  })

  it('gives each child the PRO gift once per payment', () => {
    useAppSettingsStore.setState({ proGiftCoins: 50 })
    const a = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: '2021-01-01', gender: 'boy' })
    const b = useFamilyStore
      .getState()
      .addChild({ name: 'Lola', birthDate: '2021-01-01', gender: 'girl' })
    recordProPurchase('monthly', 'click', 1000)
    expect(coins(a.id)).toBe(50)
    expect(coins(b.id)).toBe(50)
    expect(rewardHistory(a.id)[0]).toMatchObject({ reason: 'pro-gift', coins: 50 })
  })

  it('does not keep a guest ledger between visits', () => {
    grantReward({ childKey: GUEST_KEY, coins: 2, reason: 'task', refId: 'g' })
    grantReward({ childKey: KID, coins: 2, reason: 'task', refId: 'k' })
    const saved = JSON.parse(localStorage.getItem('kiddo.rewards') ?? '{}') as {
      state: { byChild: Record<string, unknown> }
    }
    expect(Object.keys(saved.state.byChild)).toEqual([KID])
    useProgressStore.getState().startGuest()
    expect(rewardHistory(GUEST_KEY)).toHaveLength(0)
  })
})

describe('removing a child', () => {
  beforeEach(reset)

  it('clears the child’s ledger and learning record, and nobody else’s', () => {
    const family = useFamilyStore.getState()
    const ali = family.addChild({ name: 'Ali', birthDate: '2021-01-01', gender: 'boy' })
    const lola = family.addChild({ name: 'Lola', birthDate: '2021-01-01', gender: 'girl' })
    for (const child of [ali, lola]) {
      grantReward({ childKey: child.id, coins: 2, reason: 'quest', refId: 'q' })
      useLearnStore.getState().markStage(child.id, 'math', 'any', '4')
    }

    useFamilyStore.getState().removeChild(ali.id)

    expect(rewardHistory(ali.id)).toHaveLength(0)
    expect(useRewardStore.getState().byChild[ali.id]).toBeUndefined()
    expect(useLearnStore.getState().byChild[ali.id]).toBeUndefined()
    expect(rewardHistory(lola.id)).toHaveLength(1)
    expect(getLearnChild(lola.id).stages).toEqual({ 'math|any': ['4'] })
  })
})
