import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { ACHIEVEMENTS, BUILDINGS, emitActivity, useUniverseStore, WORLDS } from '@/domain/universe'
import { LearnResult } from '@/features/learn/LearnResult'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { AwardLines } from './AwardLines'

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
})

describe('AwardLines', () => {
  it('says what was earned, with one calm line per medal', () => {
    render(
      <AwardLines
        award={{
          stars: 3,
          starGain: 2,
          crystals: 1,
          parts: 1,
          scrolls: 0,
          achievements: ['first-steps|bronze'],
        }}
      />,
    )
    const list = screen.getByRole('list', { name: 'Sen yutding' })
    expect(list).toHaveTextContent('Yulduz: +2')
    expect(list).toHaveTextContent('Kristall: +1')
    expect(list).toHaveTextContent('Detal: +1')
    expect(list).not.toHaveTextContent('O‘ram')
    expect(screen.getByText('Yangi medal: Birinchi qadamlar (Bronza)')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows nothing for a run that brought nothing new', () => {
    const { container } = render(
      <AwardLines
        award={{ stars: 3, starGain: 0, crystals: 0, parts: 0, scrolls: 0, achievements: [] }}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('result screens', () => {
  it('the task reward screen shows the stars and crystal of a first perfect game', async () => {
    const { router } = await renderRoute('/home')
    const outcome = useProgressStore.getState().completeTask(GUEST_KEY, {
      type: 'find-letter',
      language: 'uz',
      letterIds: ['a'],
      mistakeDetails: [],
    })
    expect(outcome.resultId).toBeTruthy()
    await act(() => router.navigate('/reward', { state: { taskType: 'find-letter', outcome } }))
    const lines = await screen.findByTestId('award-lines')
    expect(lines).toHaveTextContent('Yulduz: +3')
    expect(lines).toHaveTextContent('Kristall: +1')
  })

  it('the learning result shows what the session earned', () => {
    emitActivity({
      id: 'session-1',
      childKey: GUEST_KEY,
      activity: 'tale:fox',
      strand: 'language',
      correct: 3,
      total: 3,
      independent: 2,
    })
    render(
      <MemoryRouter>
        <LearnResult
          result={{
            id: 'session-1',
            mode: 'test',
            coins: 3,
            summary: {
              total: 3,
              independent: 2,
              helped: 0,
              wrong: 1,
              weakSkills: [],
              strongSkills: [],
            },
          }}
          onAgain={() => {}}
        />
      </MemoryRouter>,
    )
    const lines = screen.getByTestId('award-lines')
    expect(lines).toHaveTextContent('Yulduz: +2')
    expect(lines).toHaveTextContent('O‘ram: +1')
  })
})

describe('universe texts', () => {
  const keys = [
    ...BUILDINGS.map((building) => building.nameKey),
    ...WORLDS.flatMap((world) => [world.nameKey, ...world.activities.map((a) => a.labelKey)]),
    ...ACHIEVEMENTS.flatMap((achievement) => [achievement.titleKey, achievement.descKey]),
  ]
  it.each(['uz', 'ru', 'en'])('has every building, world, activity and medal text in %s', (lng) => {
    expect(keys.filter((key) => !i18n.exists(key, { lng, fallbackLng: false }))).toEqual([])
  })
})
