import { render, screen, within } from '@testing-library/react'
import i18n from 'i18next'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { clearLearningMemory, recordEvidence, type Evidence } from '@/domain/learningMemory'
import { useUniverseStore } from '@/domain/universe/store'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { FocusPanel } from './FocusPanel'

const CHILD: ChildProfile = {
  id: 'kid',
  name: 'Ali',
  birthDate: '2016-01-01',
  celebratedLevel: 6,
  gender: 'boy',
  mascot: 'boy',
  dailyLimitMinutes: 60,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
let n = 0
function ev(item: string, h: number): Evidence {
  n += 1
  return {
    id: `f${n}|q`,
    skill: 'math:sub:within10',
    item,
    at: hoursAgo(h),
    firstTry: false,
    helpedBefore: false,
    errors: ['wrong-operation'],
    maxHint: 1,
    review: false,
    level: 3,
  }
}

describe('parent: learning focus (adaptive plan)', () => {
  afterAll(async () => {
    await i18n.changeLanguage('uz')
  })
  beforeEach(async () => {
    useSettingsStore.setState({ language: 'en' })
    await i18n.changeLanguage('en')
    clearLearningMemory('kid')
    useUniverseStore.setState({ byChild: {} })
    useFamilyStore.setState({ children: [CHILD], activeChildId: 'kid' })
  })

  it('an older child with no answers yet starts from the age band, not capped by it', () => {
    render(<FocusPanel child={CHILD} />)
    const current = screen.getByTestId('focus-current')
    expect(current).toHaveTextContent('Maths: level 5')
    expect(current).toHaveTextContent('Age band 10-12')
    expect(screen.getByTestId('focus-reasons')).toHaveTextContent('started from the age')
    expect(within(screen.getByTestId('focus-needs')).getByText('Nothing yet')).toBeInTheDocument()
  })

  it('a repeated difficulty is shown as a skill to practise and a review, never a label', () => {
    recordEvidence('kid', ev('sub:9-3', 50))
    recordEvidence('kid', ev('sub:8-5', 49))
    render(<FocusPanel child={CHILD} />)
    expect(within(screen.getByTestId('focus-needs')).getByText('Taking away')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('focus-reviewSoon')).getByText('Taking away'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('focus-reasons')).toHaveTextContent('A repeated difficulty')
    expect(document.body.textContent).not.toMatch(/slow|weak|lazy|bad at/i)
  })
})
