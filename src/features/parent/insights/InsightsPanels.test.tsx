import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emitActivity, useUniverseStore } from '@/domain/universe'
import { emitUniverse } from '@/domain/universe/store'
import { birthDateForAge } from '@/features/age/ageLevel'
import { useLearnStore } from '@/features/learn/learnStore'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useParentGateStore, useParentStore } from '@/store/parentStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

function addChild(name = 'Ali') {
  return useFamilyStore
    .getState()
    .addChild({ name, birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
}

function section(name: string): HTMLElement {
  return screen.getByRole('heading', { name, level: 2 }).closest('section')!
}

describe('Parent dashboard insights', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useParentGateStore.setState({ openedAt: Date.now() })
    useParentStore.setState({ session: { mode: 'demo' } })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
    useLearnStore.setState({ byChild: {} })
    useUniverseStore.setState({ byChild: {} })
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows calm empty states for a child who has not played', async () => {
    addChild()
    await renderRoute('/parent/dashboard')

    const week = section('So‘nggi 7 kun')
    expect(within(week).getByText('Oxirgi 7 kunda hech narsa o‘ynalmadi.')).toBeInTheDocument()
    // no empty charts: one calm sentence, and nothing earned yet
    expect(within(week).queryAllByRole('img')).toHaveLength(0)
    expect(within(week).getByText('Yulduzlar: 0')).toBeInTheDocument()

    expect(
      within(section('Ko‘nikmalar')).getByText(
        'Ali biroz o‘ynagach, ko‘nikmalar shu yerda ko‘rinadi.',
      ),
    ).toBeInTheDocument()
    expect(
      within(section('Ali nimalar o‘ynadi')).getByText(
        'Tugatilgan mashg‘ulotlar shu yerda ko‘rinadi.',
      ),
    ).toBeInTheDocument()
    // nothing weak yet: only something new to try
    const practice = section('Mashq qilish uchun')
    expect(within(practice).getAllByRole('link', { name: /ochish$/ })).toHaveLength(1)
    expect(
      within(section('Sog‘lom o‘yin')).getByText('So‘nggi 7 kunda Kiddoda vaqt o‘tkazilmadi.'),
    ).toBeInTheDocument()
    expect(within(section('Medallar va shahar')).getByText('Hali medal yo‘q.')).toBeInTheDocument()
    expect(screen.getByTestId('data-location')).toHaveTextContent('Faqat shu qurilmada saqlanadi.')
  })

  it('shows what a child played, skills, suggestions and exports the data', async () => {
    const ali = addChild()
    useFamilyStore.getState().setActiveChild(ali.id)
    useProgressStore.getState().addMinutes(ali.id, 14)
    useProgressStore.getState().completeTask(ali.id, {
      type: 'find-letter',
      language: 'uz',
      letterIds: ['a', 'b'],
      mistakeDetails: [],
    })
    // two weak Math Lab runs at the child's level (5 years → level 2)
    for (const id of ['lab-1', 'lab-2', 'lab-3']) {
      emitActivity({
        id,
        childKey: ali.id,
        activity: 'math-lab:objects:L2',
        strand: 'number',
        correct: 5,
        total: 5,
        independent: 2,
        level: 2,
      })
      emitUniverse({
        type: 'mistake.made',
        childKey: ali.id,
        skill: 'sub:within5',
        strand: 'number',
        activityId: id,
      })
    }
    emitActivity({
      id: 'story-1',
      childKey: ali.id,
      activity: 'story:lost-lamb',
      strand: 'language',
      correct: 3,
      total: 3,
      independent: 3,
    })

    const { user } = await renderRoute('/parent/dashboard')

    const week = section('So‘nggi 7 kun')
    expect(within(week).getByText('Jami vaqt: 14 daq')).toBeInTheDocument()
    expect(within(week).getByText('Mashg‘ulotlar: 5')).toBeInTheDocument()
    expect(within(week).getByText('Kristallar: 2')).toBeInTheDocument()
    expect(within(week).getByText('O‘ramlar: 1')).toBeInTheDocument()
    const table = within(week).getByTestId('week-table')
    const todayRow = within(table).getAllByRole('row').at(-1)!
    expect(todayRow).toHaveTextContent('14')
    expect(todayRow).toHaveTextContent('5')
    // coins are one of the three measures of the same week view
    expect(within(week).getByText(/^Coinlar: [1-9]\d*$/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Hafta bo‘yicha coinlar' })).toBeNull()

    const played = within(section('Ali nimalar o‘ynadi')).getByTestId('played-list')
    expect(within(played).getByText('Hikoya: Adashgan qo‘zichoq')).toBeInTheDocument()
    expect(within(played).getAllByText('Matematika laboratoriyasi')).toHaveLength(3)
    expect(within(played).getByText('Harfni top (UZ)')).toBeInTheDocument()

    const number = screen.getByTestId('strand-number')
    expect(number).toHaveTextContent('Sonlar va sanash')
    expect(number).toHaveTextContent('Birinchi urinishda to‘g‘ri: 40% (10 ta javobdan)')
    // the level moved down after two weak runs: worded gently
    expect(number).toHaveTextContent('Endi boshlayapti')
    // stories do not adapt: accuracy only, never a level word
    const language = screen.getByTestId('strand-language')
    expect(language).toHaveTextContent('100%')
    expect(language).not.toHaveTextContent(/boshlayapti|qilyapti|Ishonchli|Kuchli|Ilg‘or/)
    // a single letter game is too little to call anything a strength
    expect(screen.getByTestId('strand-letters')).not.toHaveTextContent(/qilyapti|Ishonchli/)

    const suggestions = screen.getByTestId('suggestions')
    expect(suggestions).toHaveTextContent('Yaqinda qiyinroq bo‘ldi: Ayirish.')
    expect(
      within(suggestions).getByRole('link', { name: 'Sonlar va sanash – Ali uchun ochish' }),
    ).toHaveAttribute('href', '/math-lab')
    expect(
      screen.getByText('Yana bir nechta mashg‘ulotdan keyin kuchli tomonlari ko‘rinadi.'),
    ).toBeInTheDocument()

    // export: a JSON file made in the browser
    const created: Blob[] = []
    const createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob)
      return 'blob:kiddo'
    })
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    await user.click(screen.getByRole('button', { name: 'Bola ma’lumotlarini yuklab olish' }))
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    const anchor = click.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.download).toBe(`kiddo-ali-${dayKey()}.json`)
    const data = JSON.parse(await created[0]!.text()) as {
      format: string
      profile: { name: string }
      universe: { mistakes: unknown[] }
    }
    expect(data.format).toBe('kiddo-child-export')
    expect(data.profile.name).toBe('Ali')
    expect(data.universe.mistakes).toHaveLength(3)
  })

  it('keeps two children apart, and "Open" plays as the child of the report', async () => {
    const ali = addChild('Ali')
    const bek = addChild('Bek')
    useFamilyStore.getState().setActiveChild(bek.id)
    useProgressStore.getState().addMinutes(ali.id, 9)
    for (const id of ['a-1', 'a-2']) {
      emitActivity({
        id,
        childKey: ali.id,
        activity: 'feelings:faces:1',
        strand: 'social',
        correct: 4,
        total: 4,
        independent: 4,
        level: 2,
      })
    }
    emitUniverse({
      type: 'mistake.made',
      childKey: ali.id,
      skill: 'count:to5',
      strand: 'number',
      activityId: 'a-1',
    })

    const { router, user } = await renderRoute('/parent/dashboard')
    // Bek (the active child) is shown first: nothing of Ali's leaks in
    expect(screen.getByRole('heading', { name: 'Bek nimalar o‘ynadi' })).toBeInTheDocument()
    expect(screen.getByText('Oxirgi 7 kunda hech narsa o‘ynalmadi.')).toBeInTheDocument()
    expect(screen.queryByTestId('strand-social')).toBeNull()
    expect(screen.queryByText(/Sanash/)).toBeNull()

    await user.click(screen.getByRole('button', { name: /Ali/ }))
    expect(screen.getByRole('heading', { name: 'Ali nimalar o‘ynadi' })).toBeInTheDocument()
    expect(screen.getByTestId('strand-social')).toHaveTextContent('Ishonchli')
    expect(within(section('So‘nggi 7 kun')).getByText('Jami vaqt: 9 daq')).toBeInTheDocument()
    expect(useFamilyStore.getState().activeChildId).toBe(bek.id)

    await user.click(screen.getByRole('link', { name: 'Sonlar va sanash – Ali uchun ochish' }))
    expect(useFamilyStore.getState().activeChildId).toBe(ali.id)
    await waitFor(() => expect(router.state.location.pathname).toBe('/math-lab'))
  })

  it('says the data is also backed up in cloud mode', async () => {
    useParentStore.setState({
      session: { mode: 'cloud', email: 'ota@example.com', userId: 'u1' },
    })
    addChild()
    await renderRoute('/parent/dashboard')
    expect(screen.getByTestId('data-location')).toHaveTextContent('ota@example.com')
  })
})
