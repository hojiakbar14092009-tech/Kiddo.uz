import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useRewardStore } from '@/domain/rewards'
import { birthDateForAge } from '@/features/age/ageLevel'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import {
  BIRTHDAY_COINS,
  birthdayDue,
  birthdayIn,
  birthdayWeekYear,
  claimBirthdayGift,
  giftablePets,
  giftOfYear,
  tashkentDay,
} from './birthday'

/*
 * Phase 24: the birthday gift — exactly 50 coins and one chosen pet, once a
 * year, in the birthday week; never twice, only for that child.
 */

const coinsOf = (id: string) => useProgressStore.getState().byChild[id]?.coins ?? 0
const petsOf = (id: string) => useProgressStore.getState().byChild[id]?.pets ?? []

function kid(name: string, birthDate: string, celebratedLevel: 4 | 5 | 6 = 6) {
  const child = useFamilyStore.getState().addChild({ name, birthDate, gender: 'girl' })
  useFamilyStore.getState().updateChild(child.id, { celebratedLevel })
  return child
}

beforeEach(() => {
  useSettingsStore.setState({ language: 'en' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
})

describe('the birthday week', () => {
  it('starts on the birthday and lasts seven days; 29 February is the 28th in other years', () => {
    expect(birthdayIn('2020-02-29', 2027)).toBe('2027-02-28')
    expect(birthdayIn('2020-02-29', 2028)).toBe('2028-02-29')
    expect(birthdayWeekYear('2020-05-10', '2026-05-10')).toBe(2026)
    expect(birthdayWeekYear('2020-05-10', '2026-05-16')).toBe(2026)
    expect(birthdayWeekYear('2020-05-10', '2026-05-17')).toBeNull()
    expect(birthdayWeekYear('2020-05-10', '2026-05-09')).toBeNull()
    // a late-December birthday reaches into January
    expect(birthdayWeekYear('2019-12-30', '2027-01-03')).toBe(2026)
    // the day of birth itself is no birthday party
    expect(birthdayWeekYear('2026-05-10', '2026-05-10')).toBeNull()
    expect(birthdayWeekYear('garbage', '2026-05-10')).toBeNull()
  })
})

describe('the gift', () => {
  it('is exactly 50 coins and one pet, once a year, only for that child', () => {
    const today = tashkentDay()
    const a = kid('Aziza', birthDateForAge(6, today))
    const b = kid('Bobur', birthDateForAge(6, today))
    const year = birthdayDue(a, today)!
    expect(year).toBe(Number(today.slice(0, 4)))
    expect(claimBirthdayGift(a.id, year, 'cat')).toBe(true)
    expect(coinsOf(a.id)).toBe(BIRTHDAY_COINS)
    expect(petsOf(a.id)).toEqual(['cat'])
    // never twice: again, and with another pet
    expect(claimBirthdayGift(a.id, year, 'bunny')).toBe(false)
    expect(coinsOf(a.id)).toBe(50)
    expect(petsOf(a.id)).toEqual(['cat'])
    expect(birthdayDue(useFamilyStore.getState().children[0]!, today)).toBeNull()
    // the sister's gift is still waiting, untouched
    expect(coinsOf(b.id)).toBe(0)
    expect(birthdayDue(b, today)).toBe(year)
  })

  it('a lost profile write never brings a second gift or a second pet', () => {
    const today = tashkentDay()
    const a = kid('Aziza', birthDateForAge(6, today))
    const year = birthdayDue(a, today)!
    claimBirthdayGift(a.id, year, 'hamster')
    expect(giftOfYear(a.id, year)).toBe('hamster')
    // the profile forgot the year (full storage, a stale tab): the ledger remembers
    useFamilyStore.getState().updateChild(a.id, { birthdayGifts: [] })
    const fresh = useFamilyStore.getState().children[0]!
    expect(birthdayDue(fresh, today)).toBeNull()
    expect(claimBirthdayGift(a.id, year, 'bunny')).toBe(false)
    expect(coinsOf(a.id)).toBe(50)
    expect(petsOf(a.id)).toEqual(['hamster'])
  })

  it('counts the day in Tashkent, whatever the device says', () => {
    // 22:00 UTC is already the next day in Tashkent (UTC+5)
    expect(tashkentDay(new Date('2026-05-09T22:00:00Z'))).toBe('2026-05-10')
    expect(tashkentDay(new Date('2026-05-09T12:00:00Z'))).toBe('2026-05-09')
  })

  it('never offers a pet the child already has', () => {
    expect(giftablePets(['cat', 'bunny'])).toEqual(['parrot', 'hamster', 'guinea-pig'])
    expect(giftablePets(['cat', 'parrot', 'hamster', 'guinea-pig', 'bunny'])).toEqual([])
  })
})

describe('the party on the home screen', () => {
  it('asks for a pet, gives the present and does not come back', async () => {
    const a = kid('Aziza', birthDateForAge(6, tashkentDay()))
    act(() => useFamilyStore.getState().setActiveChild(a.id))
    const first = await renderRoute('/home')
    expect(screen.getByTestId('birthday-celebration')).toBeInTheDocument()
    expect(screen.getByTestId('birthday-claim')).toBeDisabled()
    await first.user.click(screen.getByTestId('birthday-pet-parrot'))
    await first.user.click(screen.getByTestId('birthday-claim'))
    expect(screen.queryByTestId('birthday-celebration')).not.toBeInTheDocument()
    expect(coinsOf(a.id)).toBe(50)
    expect(petsOf(a.id)).toEqual(['parrot'])
    first.unmount()
    await renderRoute('/home')
    expect(screen.queryByTestId('birthday-celebration')).not.toBeInTheDocument()
  })

  it('waits for the new-age unlock party first', async () => {
    const a = kid('Aziza', birthDateForAge(6, tashkentDay()), 5)
    act(() => useFamilyStore.getState().setActiveChild(a.id))
    await renderRoute('/home')
    expect(screen.getByTestId('unlock-celebration')).toBeInTheDocument()
    expect(screen.queryByTestId('birthday-celebration')).not.toBeInTheDocument()
  })
})
