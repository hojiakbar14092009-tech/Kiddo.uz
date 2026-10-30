import { beforeEach, describe, expect, it } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { markTourSeen, resetTours, stepsFor, TOURS } from './tour'

describe('guided tours', () => {
  beforeEach(() => {
    useFamilyStore.setState({ children: [], activeChildId: null })
    useSettingsStore.setState({ guestTours: {} })
    window.localStorage.removeItem('kiddo.e2e.tours')
  })

  it('first time the full tour, the second time a short reminder, then nothing', () => {
    expect(stepsFor('home', 0)).toEqual(TOURS.home)
    const brief = stepsFor('home', 1)
    expect(brief.length).toBeGreaterThan(0)
    expect(brief.length).toBeLessThan(TOURS.home.length)
    expect(stepsFor('home', 2)).toEqual([])
    expect(stepsFor('play', 1).map((step) => step.id)).toEqual(['answer'])
  })

  it('each child keeps their own count; a parent replay starts only that child over', () => {
    const family = useFamilyStore.getState()
    const ali = family.addChild({
      name: 'Ali',
      birthDate: birthDateForAge(5, dayKey()),
      gender: 'boy',
    })
    const lola = family.addChild({
      name: 'Lola',
      birthDate: birthDateForAge(8, dayKey()),
      gender: 'girl',
    })
    family.setActiveChild(ali.id)
    markTourSeen('home')
    markTourSeen('home')
    markTourSeen('play')
    const of = (id: string) => useFamilyStore.getState().children.find((c) => c.id === id)?.tours
    expect(of(ali.id)).toEqual({ home: 2, play: 1 })
    expect(of(lola.id)).toBeUndefined()
    // the guest's count is separate too
    expect(useSettingsStore.getState().guestTours).toEqual({})
    resetTours()
    expect(of(ali.id)).toEqual({})
  })

  it('a guest has their own count', () => {
    markTourSeen('play')
    expect(useSettingsStore.getState().guestTours).toEqual({ play: 1 })
  })

  it('browser tests of other features can switch the tours off', () => {
    window.localStorage.setItem('kiddo.e2e.tours', 'off')
    expect(stepsFor('home', 0)).toEqual([])
    window.localStorage.removeItem('kiddo.e2e.tours')
  })
})
