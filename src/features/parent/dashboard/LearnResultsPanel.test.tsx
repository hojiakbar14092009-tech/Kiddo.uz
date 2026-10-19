import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { useLearnStore } from '@/features/learn/learnStore'
import type { ChildProfile } from '@/store/familyStore'
import { LearnResultsPanel } from './LearnResultsPanel'

const child = { id: 'lola', name: 'Lola' } as ChildProfile

describe('parent results for the new sections', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz')
    useLearnStore.setState({ byChild: {} })
  })

  it('says when nothing has been done yet', () => {
    render(<LearnResultsPanel child={child} />)
    expect(screen.getByText('Farzandingiz yangi bo‘limlarni hali boshlamagan.')).toBeTruthy()
  })

  it('shows the last check, help used and topics to practise, per child', () => {
    const store = useLearnStore.getState()
    store.recordAttempt('lola', {
      section: 'math',
      language: 'any',
      mode: 'test',
      questionId: 'q1',
      skill: 'add:make10',
      first: '9',
      firstCorrect: false,
      final: '10',
      finalCorrect: true,
      helped: false,
      errorType: 'off-by-one',
    })
    store.finishSession('lola', {
      id: 's1',
      section: 'math',
      stage: '6',
      language: 'any',
      mode: 'test',
      total: 5,
      independent: 3,
      helped: 1,
      wrong: 1,
      weakSkills: ['add:make10'],
      strongSkills: [],
    })
    // another child's results never show here
    store.finishSession('other', {
      id: 's2',
      section: 'space',
      stage: '4',
      language: 'uz',
      mode: 'test',
      total: 3,
      independent: 3,
      helped: 0,
      wrong: 0,
      weakSkills: [],
      strongSkills: [],
    })
    render(<LearnResultsPanel child={child} />)
    const math = within(screen.getByTestId('learn-row-math'))
    expect(math.getByText('Mustaqil to‘g‘ri javoblar: 3/5')).toBeTruthy()
    expect(math.getByText('Yordam bilan bajarildi: 1')).toBeTruthy()
    expect(math.getByText('Takrorlash kerak bo‘lgan mavzular: 1')).toBeTruthy()
    expect(
      within(screen.getByTestId('learn-row-space')).getByText('Hali boshlanmagan'),
    ).toBeTruthy()
  })
})
