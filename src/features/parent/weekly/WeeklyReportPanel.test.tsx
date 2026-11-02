import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import { emitActivity, useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useChildInsights } from '../insights/useChildInsights'
import { WeeklyReportPanel } from './WeeklyReportPanel'

function Weekly({ child }: { child: ChildProfile }) {
  const insights = useChildInsights(child)
  return <WeeklyReportPanel child={child} insights={insights} />
}

function show(child: ChildProfile) {
  return render(
    <MemoryRouter>
      <Weekly child={child} />
    </MemoryRouter>,
  )
}

function addChild(name: string): ChildProfile {
  return useFamilyStore
    .getState()
    .addChild({ name, birthDate: birthDateForAge(6, dayKey()), gender: 'boy' })
}

function play(childKey: string, id: string) {
  emitActivity({
    id,
    childKey,
    activity: 'math-lab:count:L1',
    strand: 'number',
    correct: 5,
    total: 5,
    independent: 5,
  })
}

function setNavigator(key: 'clipboard' | 'share', value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true })
}

describe('weekly report panel', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('uz')
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
    useUniverseStore.setState({ byChild: {} })
  })

  afterEach(() => {
    setNavigator('clipboard', undefined)
    setNavigator('share', undefined)
  })

  it('an empty week shows a friendly note and no buttons', () => {
    show(addChild('Aziz'))
    const panel = screen.getByTestId('weekly-report')
    expect(screen.getByRole('heading', { name: 'Haftalik hisobot' })).toBeInTheDocument()
    expect(within(panel).getByText(/Aziz o‘ynagandan keyin/)).toBeInTheDocument()
    expect(within(panel).queryByRole('button')).toBeNull()
  })

  it('renders the week, copies the text and says so', async () => {
    const aziz = addChild('Aziz Karimov')
    play(aziz.id, 'run-1')
    const writeText = vi.fn().mockResolvedValue(undefined)
    setNavigator('clipboard', { writeText })
    show(aziz)
    const panel = screen.getByTestId('weekly-report')
    expect(within(panel).getByText('Faol kunlar')).toBeInTheDocument()
    expect(within(panel).getByText('1 / 7')).toBeInTheDocument()
    // no share sheet in this browser: no Share button
    expect(within(panel).queryByRole('button', { name: 'Ulashish' })).toBeNull()
    expect(panel.textContent).not.toMatch(/parent\.|\{\{/)

    await userEvent.click(within(panel).getByRole('button', { name: 'Nusxa olish' }))
    expect(writeText).toHaveBeenCalledOnce()
    const text = String(writeText.mock.calls[0]?.[0])
    expect(text).toMatch(/^Aziz, oxirgi 7 kunda: faol kunlar: 1 \/ 7;/)
    expect(text).not.toContain('Karimov')
    expect(within(panel).getByRole('status')).toHaveTextContent('Nusxa olindi')
    expect(within(panel).queryByRole('alert')).toBeNull()
  })

  it('a failed copy shows an error, never "Copied"', async () => {
    const aziz = addChild('Aziz')
    play(aziz.id, 'run-1')
    setNavigator('clipboard', { writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    show(aziz)
    const panel = screen.getByTestId('weekly-report')
    await userEvent.click(within(panel).getByRole('button', { name: 'Nusxa olish' }))
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Nusxa olib bo‘lmadi')
    expect(within(panel).getByRole('status')).not.toHaveTextContent('Nusxa olindi')
    // the text to select by hand is open, not hidden in a closed disclosure
    const details = panel.querySelector('details')
    expect(details?.open).toBe(true)
    expect(within(details as HTMLElement).getByText(/^Aziz, oxirgi 7 kunda/)).toBeVisible()
  })

  it('without a clipboard at all, copying reports an error', async () => {
    const aziz = addChild('Aziz')
    play(aziz.id, 'run-1')
    show(aziz)
    await userEvent.click(screen.getByRole('button', { name: 'Nusxa olish' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nusxa olib bo‘lmadi')
  })

  it('shares the same text when the browser can share', async () => {
    const aziz = addChild('Aziz')
    play(aziz.id, 'run-1')
    const share = vi.fn().mockResolvedValue(undefined)
    setNavigator('share', share)
    show(aziz)
    await userEvent.click(screen.getByRole('button', { name: 'Ulashish' }))
    expect(share).toHaveBeenCalledWith({
      title: 'Haftalik hisobot',
      text: expect.stringMatching(/^Aziz, oxirgi 7 kunda: faol kunlar: 1 \/ 7;/),
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows each child only their own week', () => {
    const ali = addChild('Ali')
    const lola = addChild('Lola')
    play(ali.id, 'run-1')
    play(ali.id, 'run-2')
    const first = show(ali)
    expect(within(screen.getByTestId('weekly-report')).getByText('2')).toBeInTheDocument()
    first.unmount()
    show(lola)
    expect(
      within(screen.getByTestId('weekly-report')).getByText(/Lola o‘ynagandan keyin/),
    ).toBeInTheDocument()
  })

  it('closing the share sheet is not an error; another share failure is', async () => {
    const aziz = addChild('Aziz')
    play(aziz.id, 'run-1')
    const share = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('closed', 'AbortError'))
      .mockRejectedValueOnce(new Error('blocked'))
    setNavigator('share', share)
    show(aziz)
    const panel = screen.getByTestId('weekly-report')
    await userEvent.click(within(panel).getByRole('button', { name: 'Ulashish' }))
    expect(share).toHaveBeenCalledTimes(1)
    expect(within(panel).queryByRole('alert')).toBeNull()
    expect(within(panel).getByRole('status')).toHaveTextContent('')
    await userEvent.click(within(panel).getByRole('button', { name: 'Ulashish' }))
    expect(await within(panel).findByRole('alert')).toHaveTextContent('Ulashib bo‘lmadi')
    expect(within(panel).getByRole('status')).not.toHaveTextContent('Nusxa olindi')
  })

  it('switching child in place clears "Copied", and a late copy result is ignored', async () => {
    const ali = addChild('Ali')
    const lola = addChild('Lola')
    play(ali.id, 'run-1')
    play(lola.id, 'run-2')
    play(lola.id, 'run-3')
    let finish: () => void = () => undefined
    const writeText = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve
          }),
      )
    setNavigator('clipboard', { writeText })
    // the same component instance (no key): the child prop changes under it
    const view = render(
      <MemoryRouter>
        <Weekly child={ali} />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Nusxa olish' }))
    expect(screen.getByRole('status')).toHaveTextContent('Nusxa olindi')
    view.rerender(
      <MemoryRouter>
        <Weekly child={lola} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('')

    // a copy for Lola still running when the parent switches back to Ali
    await userEvent.click(screen.getByRole('button', { name: 'Nusxa olish' }))
    view.rerender(
      <MemoryRouter>
        <Weekly child={ali} />
      </MemoryRouter>,
    )
    await act(async () => finish())
    expect(screen.getByRole('status')).toHaveTextContent('')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each([
    ['ru', 'Отчёт за неделю', 'Копировать'],
    ['en', 'Weekly report', 'Copy'],
  ] as const)('renders in %s with no raw keys', async (language, title, copy) => {
    await i18n.changeLanguage(language)
    const aziz = addChild('Aziz')
    play(aziz.id, 'run-1')
    show(aziz)
    const panel = screen.getByTestId('weekly-report')
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: copy })).toBeInTheDocument()
    expect(panel.textContent).not.toMatch(/parent\.weekly|\{\{/)
    await i18n.changeLanguage('uz')
  })
})
