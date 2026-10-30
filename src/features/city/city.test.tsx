import { act, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  BUILDINGS,
  claimDailyQuest,
  grantResource,
  universeChild,
  useUniverseStore,
  type ResourceId,
} from '@/domain/universe'
import { useRewardStore } from '@/domain/rewards'
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
    give('crystal', 2)
    await renderRoute('/home')
    const bar = screen.getByTestId('resource-bar')
    expect(bar).toHaveAttribute('href', '/collection')
    expect(bar).toHaveAccessibleName(
      'Boyliklarim: Yulduzlar: 4, Kristallar: 2, Detallar: 0, O‘ramlar: 0. Kolleksiyani ochish',
    )
  })

  it('upgrades a building with crystals, then shows what the next level still needs', async () => {
    give('crystal', 2)
    const { user } = await renderRoute('/home')

    await user.click(screen.getByRole('button', { name: 'Matematika shahri: kattalashtirish' }))
    let sheet = screen.getByRole('dialog', { name: 'Matematika shahri' })
    expect(sheet).toHaveTextContent('2-darajaga ko‘tarish uchun kerak:')
    expect(sheet).toHaveTextContent('Bor: 2 / 1')
    expect(sheet).toHaveTextContent('Yetarli')
    // entering is always offered, the upgrade never blocks it
    expect(within(sheet).getByRole('link', { name: 'Binoga kirish' })).toHaveAttribute(
      'href',
      '/math-lab',
    )
    await user.click(within(sheet).getByRole('button', { name: 'Kattalashtirish' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(universeChild(GUEST_KEY).buildings['math-land']).toBe(1)
    expect(universeChild(GUEST_KEY).balances.crystal).toBe(1)
    expect(await screen.findByText('Matematika shahri endi 2-darajada!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toHaveAccessibleDescription(
      'Matematika maktabi, 2-daraja',
    )

    // level 3 costs 2 crystals and needs 10 stars collected
    await user.click(screen.getByRole('button', { name: 'Matematika shahri: kattalashtirish' }))
    sheet = screen.getByRole('dialog', { name: 'Matematika shahri' })
    expect(sheet).toHaveTextContent('Bor: 1 / 2')
    expect(sheet).toHaveTextContent('Yana 1 ta')
    expect(sheet).toHaveTextContent('Bor: 0 / 10')
    expect(sheet).toHaveTextContent('Yana 10 ta')
    expect(sheet).toHaveTextContent('Yulduzlar sarflanmaydi')
    expect(within(sheet).getByRole('button', { name: 'Kattalashtirish' })).toBeDisabled()
    await user.click(within(sheet).getByRole('button', { name: 'Keyinroq' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(universeChild(GUEST_KEY).buildings['math-land']).toBe(1)
  })

  it('shows only a quiet level badge while there is no crystal yet', async () => {
    give('star', 3)
    await renderRoute('/home')
    expect(
      screen.queryByRole('button', { name: 'Matematika shahri: kattalashtirish' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toHaveAccessibleDescription(
      'Kichik maktab, 1-daraja',
    )
  })

  it('asks workshops for parts as well', () => {
    const workshop = {
      id: 'robot-workshop',
      nameKey: 'universe.buildings.robot-workshop',
      icon3d: 'clock',
      route: '/learn/help',
      level: 0,
      maxLevel: 3,
      locked: false,
      next: { cost: { crystal: 1, part: 1 }, missing: { part: 1 } },
    }
    expect(
      costRows(workshop, { star: 0, crystal: 3, part: 0, scroll: 0, seed: 0, key: 0 }),
    ).toEqual([
      { resource: 'crystal', need: 1, have: 3, missing: 0 },
      { resource: 'part', need: 1, have: 0, missing: 1 },
    ])
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
    expect(card).toHaveTextContent('Kristall: +1')
    expect(card).toHaveTextContent('Coinlar: +5')
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
    expect('award' in first && first.award.crystals).toBe(1)
    expect(claimQuest(GUEST_KEY, day)).toEqual({ reason: 'claimed' })
  })

  it('is claimed once, then suggests a rest without locking anything', async () => {
    finish('find-letter')
    finish('find-picture')
    finish('trace')
    const { user } = await renderRoute('/home')
    const card = screen.getByTestId('daily-quest')
    expect(card).toHaveTextContent('Bugungi reja bajarildi!')
    const crystalsBefore = universeChild(GUEST_KEY).balances.crystal
    const coinsBefore = useProgressStore.getState().byChild[GUEST_KEY]?.coins ?? 0

    await user.click(within(card).getByRole('button', { name: 'Xazinani ochish' }))
    expect(within(card).getByRole('heading', { name: 'Xazina olindi!' })).toBeInTheDocument()
    expect(within(card).getByRole('status')).toHaveTextContent('dam olsang ham bo‘ladi')
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
    expect(universeChild(GUEST_KEY).balances.crystal).toBe(crystalsBefore + 1)
    expect(useProgressStore.getState().byChild[GUEST_KEY]?.coins ?? 0).toBe(coinsBefore + 5)
    expect(await screen.findByText('Barakalla! Kristall va coinlar seniki.')).toBeInTheDocument()

    // a second claim pays nothing
    act(() => {
      expect(claimDailyQuest(GUEST_KEY)).toBeNull()
    })
    expect(universeChild(GUEST_KEY).balances.crystal).toBe(crystalsBefore + 1)
    // the city stays open
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toBeInTheDocument()
  })
})
