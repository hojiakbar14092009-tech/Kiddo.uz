import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { TOURS, type TourId } from './tour'

describe('every tour step has its words in all three languages', () => {
  it.each([
    ['uz', uz],
    ['ru', ru],
    ['en', en],
  ])('%s', (_, locale) => {
    const tour = (
      locale as unknown as { tour: Record<string, Record<string, Record<string, string>>> }
    ).tour
    for (const id of Object.keys(TOURS) as TourId[]) {
      for (const step of TOURS[id]) {
        for (const field of ['title', 'text', 'short']) {
          expect(tour[id]?.[step.id]?.[field], `${id}.${step.id}.${field}`).toBeTruthy()
        }
      }
    }
  })
})
