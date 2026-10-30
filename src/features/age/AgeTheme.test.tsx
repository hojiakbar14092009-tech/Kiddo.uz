import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import { tashkentDay } from '@/lib/dates'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

/*
 * Phase 22: difficulty (data-age) and visual maturity (data-band) are separate.
 * A 14-year-old beginner gets the calm older look, never the preschool one.
 */

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz', onboarded: true })
})

afterEach(() => {
  act(() => useFamilyStore.setState({ children: [], activeChildId: null }))
  delete document.documentElement.dataset.age
  delete document.documentElement.dataset.band
})

function childOf(age: number) {
  const child = useFamilyStore
    .getState()
    .addChild({ name: 'Kid', birthDate: birthDateForAge(age, tashkentDay()), gender: 'boy' })
  useFamilyStore.getState().updateChild(child.id, {
    birthdayGifts: [Number(tashkentDay().slice(0, 4))],
  })
  act(() => useFamilyStore.getState().setActiveChild(child.id))
}

describe('the age look', () => {
  it.each([
    [3, '4', '3-4'],
    [4, '4', '3-4'],
    [5, '5', '5-6'],
    [8, '6', '7-9'],
    [11, '6', '10-12'],
    // a beginner of 14: workbook difficulty level 6, an older look
    [14, '6', '13-15'],
    [17, '6', '16+'],
  ])('age %i: difficulty %s, look %s', async (age, level, band) => {
    childOf(age)
    await renderRoute('/alphabet')
    expect(document.documentElement.dataset.age).toBe(level)
    expect(document.documentElement.dataset.band).toBe(band)
  })

  it('a guest: the young middle look', async () => {
    await renderRoute('/alphabet')
    expect(document.documentElement.dataset.age).toBe('6')
    expect(document.documentElement.dataset.band).toBe('5-6')
  })

  it('a 14-year-old sees their real age on Home, not the level', async () => {
    childOf(14)
    await renderRoute('/home')
    expect(screen.getByText('14 yosh')).toBeInTheDocument()
    expect(screen.queryByText('6 yosh')).not.toBeInTheDocument()
  })

  it('the parent area keeps the neutral look', async () => {
    childOf(14)
    await renderRoute('/parent')
    expect(document.documentElement.dataset.band).toBeUndefined()
    expect(document.documentElement.dataset.age).toBeUndefined()
  })
})
