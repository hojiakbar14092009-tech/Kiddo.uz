import { act, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  BUILDINGS,
  buildingView,
  claimDailyQuest,
  findBuilding,
  grantResource,
  universeChild,
  useUniverseStore,
  type ResourceId,
} from '@/domain/universe'
import { grantReward, rewardHistory, useRewardStore } from '@/domain/rewards'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { claimQuest, costRows } from './cityModel'
import { dayKey } from '@/features/tasks/rules'

let seedCounter = 0
function give(resource: ResourceId, amount: number) {
  seedCounter += 1
  grantResource({
    childKey: GUEST_KEY,
    resource,
    amount,
    reason: 'test',
    refId: `seed-${seedCounter}`,
  })
}

/** Yong‘oq (nuts), the one currency buildings are paid with. */
function giveNuts(coins: number) {
  seedCounter += 1
  grantReward({ childKey: GUEST_KEY, coins, reason: 'admin', refId: `nuts-${seedCounter}` })
}

const nutsOf = () => useProgressStore.getState().byChild[GUEST_KEY]?.coins ?? 0

function finish(type: 'find-letter' | 'find-picture' | 'trace') {
  useProgressStore
    .getState()
    .completeTask(GUEST_KEY, { type, language: 'uz', letterIds: ['a'], mistakeDetails: [] })
}

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
})

describe('Kiddo City', () => {
  it('shows every building as an open door, plus the writing school and the map', async () => {
    await renderRoute('/home')
    expect(screen.getByRole('heading', { name: 'Kiddo shahri' })).toBeInTheDocument()
    // the buildings (the writing school is one of them) and the map
    expect(screen.getAllByTestId(/^building-/)).toHaveLength(BUILDINGS.length + 1)
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toHaveAttribute(
      'href',
      '/math-lab',
    )
    expect(screen.getByRole('link', { name: 'Ijod ustaxonasi' })).toHaveAttribute('href', '/studio')
    expect(screen.getByRole('link', { name: 'Yozuv maktabi' })).toHaveAttribute('href', '/trace')
    expect(screen.getByRole('link', { name: 'Do‘stlik uyi' })).toHaveAttribute('href', '/feelings')
    expect(screen.getByRole('link', { name: 'Sarguzashtlar xaritasi' })).toHaveAttribute(
      'href',
      '/adventure',
    )
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toHaveAccessibleDescription(
      'Kichik maktab, 1-daraja',
    )
  })

  it('shows the treasures and links them to the collection', async () => {
    give('star', 4)
    giveNuts(12)
    await renderRoute('/home')
    const bar = screen.getByTestId('resource-bar')
    expect(bar).toHaveAttribute('href', '/collection')
    expect(bar).toHaveAccessibleName(
      'Boyliklarim: Yulduzlar: 4, Yong‘oqlar: 12. Kolleksiyani ochish',
    )
  })

  it('upgrades a building with nuts, then shows what the next level still needs', async () => {
    giveNuts(25)
    const { user } = await renderRoute('/home')

    await user.click(screen.getByRole('button', { name: 'Matematika shahri: kattalashtirish' }))
    let sheet = screen.getByRole('dialog', { name: 'Matematika shahri' })
    expect(sheet).toHaveTextContent('2-darajaga ko‘tarish uchun kerak:')
    expect(sheet).toHaveTextContent('Bor: 25 / 10')
    expect(sheet).toHaveTextContent('Yetarli')
    // entering is always offered, the upgrade never blocks it
    expect(within(sheet).getByRole('link', { name: 'Binoga kirish' })).toHaveAttribute(
      'href',
      '/math-lab',
    )
    await user.click(within(sheet).getByRole('button', { name: 'Kattalashtirish' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(universeChild(GUEST_KEY).buildings['math-land']).toBe(1)
    expect(nutsOf()).toBe(15)
    expect(rewardHistory(GUEST_KEY)[0]).toMatchObject({
      reason: 'purchase',
      refId: 'upgrade|math-land|1',
      coins: -10,
    })
    expect(await screen.findByText('Matematika shahri endi 2-darajada!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toHaveAccessibleDescription(
      'Matematika maktabi, 2-daraja',
    )

    // level 3 costs 20 nuts and needs 10 stars collected
    await user.click(screen.getByRole('button', { name: 'Matematika shahri: kattalashtirish' }))
    sheet = screen.getByRole('dialog', { name: 'Matematika shahri' })
    expect(sheet).toHaveTextContent('Bor: 15 / 20')
    expect(sheet).toHaveTextContent('Yana 5 ta')
    expect(sheet).toHaveTextContent('Bor: 0 / 10')
    expect(sheet).toHaveTextContent('Yana 10 ta')
    expect(sheet).toHaveTextContent('Yulduzlar sarflanmaydi')
    expect(within(sheet).getByRole('button', { name: 'Kattalashtirish' })).toBeDisabled()
    await user.click(within(sheet).getByRole('button', { name: 'Keyinroq' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(universeChild(GUEST_KEY).buildings['math-land']).toBe(1)
    expect(nutsOf()).toBe(15)
  })

  it('shows only a quiet level badge until the nuts are half way to the price', async () => {
    give('star', 3)
    giveNuts(4)
    await renderRoute('/home')
    expect(
      screen.queryByRole('button', { name: 'Matematika shahri: kattalashtirish' }),
    ).not.toBeInTheDocument()
    act(() => giveNuts(1))
    expect(
      screen.getByRole('button', { name: 'Matematika shahri: kattalashtirish' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toHaveAccessibleDescription(
      'Kichik maktab, 1-daraja',
    )
  })

  it('asks workshops for more nuts (what their parts were worth), and stars as a threshold', () => {
    const def = findBuilding('robot-workshop')!
    // held crystals and parts no longer pay for anything
    const wallet = { star: 4, crystal: 3, part: 3, nut: 10 }
    const first = buildingView(def, 0, wallet)
    expect(first.next).toEqual({ cost: { nut: 15 }, missing: { nut: 5 } })
    expect(costRows(first, wallet)).toEqual([{ resource: 'nut', need: 15, have: 10, missing: 5 }])
    const second = buildingView(def, 1, wallet)
    expect(costRows(second, wallet)).toEqual([
      { resource: 'nut', need: 30, have: 10, missing: 20 },
      { resource: 'star', need: 10, have: 4, missing: 6 },
    ])
    expect(costRows(buildingView(def, 3, wallet), wallet)).toEqual([])
  })

  it('hides the upgrade button at the top level', async () => {
    useUniverseStore.setState({
      byChild: {
        [GUEST_KEY]: { ...universeChild(GUEST_KEY), buildings: { museum: 3 } },
      },
    })
    await renderRoute('/home')
    expect(screen.queryByRole('button', { name: 'Muzey: kattalashtirish' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Muzey' })).toHaveAccessibleDescription(
      'Eng katta daraja',
    )
  })
})

describe('Daily quest', () => {
  it('shows the treasure up front while the plan is not done', async () => {
    await renderRoute('/home')
    const card = screen.getByTestId('daily-quest')
    expect(within(card).getByRole('heading', { name: 'Bugungi xazina' })).toBeInTheDocument()
    // one prize: the crystal (10) and the coins (5) together, in nuts
    expect(card).toHaveTextContent('Yong‘oqlar: +15')
    expect(card).not.toHaveTextContent('Kristall')
    expect(card).toHaveTextContent('Yana 3 ta vazifa qoldi')
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
  })

  it('claims the day it shows, once, and says why a claim fails', () => {
    const day = dayKey()
    expect(claimQuest(GUEST_KEY, day)).toEqual({ reason: 'not-done' })
    finish('find-letter')
    finish('find-picture')
    finish('trace')
    const first = claimQuest(GUEST_KEY, day)
    expect('award' in first && first.award.nuts).toBe(15)
    expect(claimQuest(GUEST_KEY, day)).toEqual({ reason: 'claimed' })
  })

  it('is claimed once, then suggests a rest without locking anything', async () => {
    finish('find-letter')
    finish('find-picture')
    finish('trace')
    const { user } = await renderRoute('/home')
    const card = screen.getByTestId('daily-quest')
    expect(card).toHaveTextContent('Bugungi reja bajarildi!')
    const coinsBefore = nutsOf()

    await user.click(within(card).getByRole('button', { name: 'Xazinani ochish' }))
    expect(within(card).getByRole('heading', { name: 'Xazina olindi!' })).toBeInTheDocument()
    expect(within(card).getByRole('status')).toHaveTextContent('dam olsang ham bo‘ladi')
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
    expect(nutsOf()).toBe(coinsBefore + 15)
    expect(universeChild(GUEST_KEY).balances.crystal).toBe(0)
    expect(await screen.findByText('Barakalla! Yong‘oqlar seniki.')).toBeInTheDocument()

    // a second claim pays nothing
    act(() => {
      expect(claimDailyQuest(GUEST_KEY)).toBeNull()
    })
    expect(nutsOf()).toBe(coinsBefore + 15)
    // the city stays open
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toBeInTheDocument()
  })
})
