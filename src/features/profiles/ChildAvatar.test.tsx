import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import { tashkentDay } from '@/lib/dates'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { ChildAvatar } from './ChildAvatar'

/* Phase 31: each child's robot matures with that child's own age, not the active child's. */

const child = (id: string, age: number): ChildProfile => ({
  id,
  name: id,
  birthDate: birthDateForAge(age, tashkentDay()),
  celebratedLevel: 6,
  gender: 'girl',
  mascot: 'girl',
  dailyLimitMinutes: 60,
  createdAt: '2026-01-01T00:00:00.000Z',
})

describe('ChildAvatar', () => {
  it('draws each child at their own stage', () => {
    const little = child('little', 5)
    const teen = child('teen', 14)
    useFamilyStore.setState({ children: [little, teen], activeChildId: 'teen' })
    const { container } = render(
      <>
        <ChildAvatar child={little} size={80} />
        <ChildAvatar child={teen} size={80} />
      </>,
    )
    const stages = [...container.querySelectorAll('svg[data-stage]')].map((svg) =>
      svg.getAttribute('data-stage'),
    )
    expect(stages).toEqual(['young', 'older'])
  })
})
