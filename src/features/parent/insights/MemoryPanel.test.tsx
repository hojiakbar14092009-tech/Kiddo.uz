import { render, screen, within } from '@testing-library/react'
import i18n from 'i18next'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { clearLearningMemory, recordEvidence, type Evidence } from '@/domain/learningMemory'
import { AiTutorPanel } from '@/features/parent/dashboard/AiTutorPanel'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { MemoryPanel } from './MemoryPanel'

const CHILD: ChildProfile = {
  id: 'kid',
  name: 'Ali',
  birthDate: '2020-01-01',
  celebratedLevel: 6,
  gender: 'boy',
  mascot: 'boy',
  dailyLimitMinutes: 60,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
let n = 0
function ev(skill: string, item: string, h: number, partial: Partial<Evidence> = {}): Evidence {
  n += 1
  return {
    id: `t${n}|q`,
    skill,
    item,
    at: hoursAgo(h),
    firstTry: false,
    helpedBefore: false,
    errors: ['off-by-one'],
    maxHint: 1,
    review: false,
    ...partial,
  }
}

describe('parent: what Kiddo remembers', () => {
  afterAll(async () => {
    await i18n.changeLanguage('uz')
  })
  beforeEach(async () => {
    useSettingsStore.setState({ language: 'en' })
    await i18n.changeLanguage('en')
    clearLearningMemory('kid')
    useFamilyStore.setState({ children: [CHILD], activeChildId: 'kid' })
  })

  it('says nothing is remembered after one accidental mistake', () => {
    recordEvidence('kid', ev('math:add:within10', 'add:3+4', 1))
    render(<MemoryPanel child={CHILD} />)
    expect(screen.getByTestId('memory-empty')).toHaveTextContent('Nothing to remember yet.')
  })

  it('lists skills that need practice and skills that improved, never labels for the child', () => {
    recordEvidence('kid', ev('math:add:within10', 'add:3+4', 50))
    recordEvidence('kid', ev('math:add:within10', 'add:5+4', 49))
    const sub = 'math:sub:within10'
    recordEvidence('kid', ev(sub, 'sub:9-3', 50))
    recordEvidence('kid', ev(sub, 'sub:8-3', 49))
    recordEvidence('kid', ev(sub, 'sub:7-3', 48, { firstTry: true, errors: [], maxHint: 0 }))
    recordEvidence('kid', ev(sub, 'sub:6-3', 47, { firstTry: true, errors: [], maxHint: 0 }))
    recordEvidence(
      'kid',
      ev(sub, 'sub:5-3', 2, { firstTry: true, errors: [], maxHint: 0, review: true }),
    )
    render(<MemoryPanel child={CHILD} />)
    const needs = screen.getByTestId('memory-needs')
    expect(within(needs).getByText('Adding')).toBeInTheDocument()
    expect(needs).toHaveTextContent('practising')
    expect(screen.getByTestId('memory-improved')).toHaveTextContent('Taking away')
    expect(screen.getByTestId('memory-improved')).toHaveTextContent('got past the difficulty')
    expect(document.body.textContent).not.toMatch(/weak|lazy|slow|bad at/i)
  })

  it('AI helper: this build has no Kiddo server, so it says so and offers no switch', () => {
    render(<AiTutorPanel />)
    const row = screen.getByTestId('ai-tutor-child')
    expect(row).toHaveAttribute('data-availability', 'no-server')
    expect(row).toHaveTextContent('The AI helper is not connected in this app.')
    expect(within(row).queryByRole('switch')).not.toBeInTheDocument()
    // nothing is sent anywhere, so the panel does not describe a provider
    expect(screen.queryByText(/Google Gemini/)).not.toBeInTheDocument()
  })
})
