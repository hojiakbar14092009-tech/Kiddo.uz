import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { emitActivity, useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useChildInsights } from '../insights/useChildInsights'
import { GlanceSection } from './GlanceSection'

function Glance({ child }: { child: ChildProfile }) {
  const insights = useChildInsights(child)
  return <GlanceSection child={child} insights={insights} />
}

function show(child: ChildProfile) {
  return render(
    <MemoryRouter>
      <Glance child={child} />
    </MemoryRouter>,
  )
}

describe('Parent Center first view', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
    useUniverseStore.setState({ byChild: {} })
  })

  it('answers the eight questions in plain words, and never guesses without play', () => {
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(6, dayKey()), gender: 'boy' })
    show(ali)
    for (const title of [
      'Farzandim',
      'Bugungi holat',
      'O‘rganayotgan mavzular',
      'Kuchayib borayotgan ko‘nikmalar',
      'Mashq kerak',
      'Uyga vazifalar',
      'Yutuqlar',
      'Faoliyat tarixi',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(within(screen.getByTestId('glance-child')).getByText('Ali')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('glance-learning')).getByText(/yana bir necha/),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('glance-homework')).getByText('Uyga vazifa berilmagan.'),
    ).toBeInTheDocument()
    // no raw keys anywhere
    expect(screen.getByTestId('parent-glance').textContent).not.toMatch(/parent\.|glance\./)
  })

  it('shows each child only their own play', () => {
    const family = useFamilyStore.getState()
    const ali = family.addChild({
      name: 'Ali',
      birthDate: birthDateForAge(6, dayKey()),
      gender: 'boy',
    })
    const lola = family.addChild({
      name: 'Lola',
      birthDate: birthDateForAge(5, dayKey()),
      gender: 'girl',
    })
    emitActivity({
      id: 'run-1',
      childKey: ali.id,
      activity: 'math-lab:count:L1',
      strand: 'number',
      correct: 5,
      total: 5,
      independent: 5,
    })
    const first = show(ali)
    expect(within(screen.getByTestId('glance-history')).getAllByRole('listitem')).toHaveLength(1)
    first.unmount()
    show(lola)
    expect(within(screen.getByTestId('glance-history')).queryAllByRole('listitem')).toHaveLength(0)
  })
})
