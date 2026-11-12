import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { ACHIEVEMENTS, BUILDINGS, emitActivity, useUniverseStore } from '@/domain/universe'
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
          nuts: 15,
          achievements: ['first-steps|bronze'],
        }}
      />,
    )
    const list = screen.getByRole('list', { name: 'Sen yutding' })
    expect(list).toHaveTextContent('Yulduz: +2')
    expect(list).toHaveTextContent('Yong‘oq: +15')
    expect(list).not.toHaveTextContent('Kristall')
    expect(screen.getByText('Yangi medal: Birinchi qadamlar (Bronza)')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('names a Star Path step by its own name and announces the sticker it unlocks', () => {
    render(
      <AwardLines
        award={{
          stars: 0,
          starGain: 0,
          nuts: 0,
          achievements: ['number-path|bronze', 'first-steps|silver'],
        }}
      />,
    )
    expect(screen.getByText('Yangi medal: Sonlar sayyorasi (Uchqun)')).toBeInTheDocument()
    expect(screen.getByText('Yangi medal: Birinchi qadamlar (Kumush)')).toBeInTheDocument()
    expect(screen.getByTestId('award-sticker-discovery-map')).toHaveTextContent(
      'Yangi stiker: Kashfiyot xaritasi',
    )
  })

  it('shows nothing for a run that brought nothing new', () => {
    const { container } = render(
      <AwardLines award={{ stars: 3, starGain: 0, nuts: 0, achievements: [] }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('result screens', () => {
  it('the task reward screen shows the stars and the nuts of a first perfect game', async () => {
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
    // the first 3 stars pay a crystal's worth: 10 nuts
    expect(lines).toHaveTextContent('Yong‘oq: +10')
    expect(lines).not.toHaveTextContent('Kristall')
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
    // a tale read for the first time: a scroll's worth, 5 nuts (2 stars pay no crystal)
    expect(lines).toHaveTextContent('Yong‘oq: +5')
    expect(lines).not.toHaveTextContent('O‘ram')
  })
})

describe('universe texts', () => {
  const keys = [
    ...BUILDINGS.map((building) => building.nameKey),
    ...ACHIEVEMENTS.flatMap((achievement) => [achievement.titleKey, achievement.descKey]),
  ]
  it.each(['uz', 'ru', 'en'])('has every building and medal text in %s', (lng) => {
    expect(keys.filter((key) => !i18n.exists(key, { lng, fallbackLng: false }))).toEqual([])
  })
})
