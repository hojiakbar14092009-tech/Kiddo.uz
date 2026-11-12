import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GUEST_KEY } from '@/domain/childKey'
import { recordEvidence, useLearningMemoryStore } from '@/domain/learningMemory'
import { useRewardStore } from '@/domain/rewards'
import { emitActivity, upgradeBuilding, useUniverseStore } from '@/domain/universe'
import { installProgression } from '@/domain/universe/progression'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

let stop: () => void
beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
  useLearningMemoryStore.setState({ byChild: {} })
  stop = installProgression()
})
afterEach(() => stop())

describe('Next adventure on the home screen (extras in O‘rgan)', () => {
  it('no optional quest without a growing plant (no quest wall)', async () => {
    await renderRoute('/home')
    expect(screen.getByTestId('journey-card')).toBeInTheDocument()
    expect(screen.queryByTestId('quest-extras')).toBeNull()
  })

  it('a garden plant becomes a positive optional practice quest', async () => {
    for (const [n, item] of [
      [1, 'add:3+4'],
      [2, 'add:2+5'],
    ] as const) {
      recordEvidence(GUEST_KEY, {
        id: `r${n}|q`,
        skill: 'math:add:within10',
        item,
        at: new Date(Date.UTC(2026, 9, 24, 9, n)).toISOString(),
        firstTry: false,
        helpedBefore: false,
        review: false,
        errors: ['off-by-one'],
        maxHint: 0,
        level: 2,
      })
    }
    await renderRoute('/learn')
    const quest = screen.getByTestId('quest-optional')
    expect(quest).toHaveTextContent('O‘simligingga yordam ber: 10 gacha qo‘shish')
    expect(within(quest).getByRole('link', { name: 'Boshlash' })).toHaveAttribute(
      'href',
      '/math-lab?practice=add%3Awithin10&from=garden',
    )
    expect(document.body.textContent).not.toMatch(/xato/i)
  })

  it('the rocket step says what is missing, not just "locked"', async () => {
    act(() => {
      emitActivity({
        id: 'math-1',
        childKey: GUEST_KEY,
        activity: 'math-lab:count:L1',
        strand: 'number',
        correct: 5,
        total: 5,
        independent: 5,
        at: new Date().toISOString(),
      })
    })
    // the run paid 15 nuts, the rocket's price; 10 went to the Friendship House, so 10 more are needed
    expect(useProgressStore.getState().byChild[GUEST_KEY]?.coins).toBe(15)
    act(() => {
      expect(upgradeBuilding(GUEST_KEY, 'friendship-house')).toBe('ok')
    })
    await renderRoute('/home')
    const needs = screen.getByTestId('quest-needs')
    expect(needs).toHaveTextContent('Yana 10 ta yong‘oq kerak')
  })
})
