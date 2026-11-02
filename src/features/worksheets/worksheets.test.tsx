import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import '@/i18n'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useSettingsStore } from '@/store/settingsStore'
import type { ChildProfile } from '@/store/familyStore'
import { PrintSheetPage } from './PrintSheetPage'
import { COUNT_CHOICES, COUNT_ROWS, firstName, SHEET_NUMBERS, sheetLetters } from './sheets'
import { WorksheetsPanel } from './WorksheetsPanel'

const lola: ChildProfile = {
  id: 'kid',
  name: 'Lola Karimova',
  birthDate: birthDateForAge(5, dayKey()),
  celebratedLevel: 5,
  gender: 'girl',
  mascot: 'girl',
  dailyLimitMinutes: 60,
  createdAt: new Date().toISOString(),
}

function renderAt(path: string, state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: '/parent/print/:sheet', element: <PrintSheetPage /> },
      { path: '/parent/dashboard', element: <WorksheetsPanel child={lola} /> },
    ],
    {
      initialEntries: [
        {
          pathname: path.split('?')[0]!,
          search: path.includes('?') ? `?${path.split('?')[1]}` : '',
          state,
        },
      ],
    },
  )
  render(<RouterProvider router={router} />)
  return router
}

const letterIds = () =>
  [...document.querySelectorAll('[data-letter]')].map((node) => node.getAttribute('data-letter'))

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sheet data', () => {
  it('traces the alphabet of the chosen language (the Uzbek tutuq is a mark, not a letter)', () => {
    expect(sheetLetters('uz')).toHaveLength(29)
    expect(sheetLetters('uz').map((letter) => letter.upper)).toContain('Sh')
    expect(sheetLetters('uz').map((letter) => letter.id)).not.toContain('tutuq')
    expect(sheetLetters('ru')).toHaveLength(33)
    expect(
      sheetLetters('en')
        .map((letter) => letter.upper)
        .join(''),
    ).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    expect(SHEET_NUMBERS).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
    expect(COUNT_ROWS.every((row) => COUNT_CHOICES.includes(row.count))).toBe(true)
    expect(firstName('  Lola Karimova ')).toBe('Lola')
    expect(firstName(undefined)).toBe('')
  })
})

describe('the printable sheet', () => {
  it('draws the chosen alphabet as dashed letters, with the child’s first name', () => {
    renderAt('/parent/print/letters?lang=ru', { name: 'Lola' })
    const sheet = screen.getByTestId('worksheet')
    expect(sheet).toHaveAttribute('viewBox', '0 0 210 297')
    expect(letterIds()).toEqual(sheetLetters('ru').map((letter) => letter.id))
    const dashed = sheet.querySelectorAll('text[stroke-dasharray]')
    expect(dashed.length).toBe(33 * 2)
    expect([...dashed].map((node) => node.textContent)).toContain('Щ')
    expect(screen.getByTestId('sheet-name')).toHaveTextContent('Ism: Lola')
    // the interface stays in the parent's language
    expect(sheet).toHaveTextContent('Harflarni yozamiz')
  })

  it('draws the numbers 1–20 and the count rows, and leaves a line for a name', () => {
    renderAt('/parent/print/numbers')
    expect(
      [...document.querySelectorAll('[data-number]')].map((node) =>
        node.getAttribute('data-number'),
      ),
    ).toEqual(SHEET_NUMBERS.map(String))
    expect(screen.getByTestId('sheet-name')).toHaveTextContent('Ism: ____')
  })

  it('count and circle: as many outlines as the row asks, and 1–10 to circle', () => {
    renderAt('/parent/print/count')
    const rows = [...document.querySelectorAll('[data-count]')]
    expect(rows).toHaveLength(COUNT_ROWS.length)
    rows.forEach((row, index) => {
      expect(row.querySelectorAll('[data-shape]')).toHaveLength(COUNT_ROWS[index]!.count)
    })
  })

  it('prints only while the page is open: its print rules leave with it', () => {
    const router = renderAt('/parent/print/numbers')
    const style = () =>
      [...document.querySelectorAll('style')].find((node) =>
        node.textContent?.includes('size: A4 portrait'),
      )
    expect(style()).toBeTruthy()
    expect(style()?.textContent).toContain('height: 297mm')
    act(() => {
      void router.navigate('/parent/dashboard')
    })
    expect(style()).toBeUndefined()
  })

  it('opens the browser print dialog (which also saves a PDF)', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    renderAt('/parent/print/letters')
    // the Uzbek alphabet by default (the interface language)
    expect(letterIds()).toHaveLength(29)
    await userEvent.click(screen.getByTestId('sheet-print'))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('the parent panel opens the sheet with the name in the navigation state, not the address', async () => {
    const router = renderAt('/parent/dashboard')
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: 'Sanab, aylana ichiga ol' }))
    await user.click(screen.getByTestId('worksheet-open'))
    expect(router.state.location.pathname).toBe('/parent/print/count')
    expect(router.state.location.search).toBe('')
    expect(router.state.location.state).toEqual({ name: 'Lola' })
    expect(screen.getByTestId('worksheet')).toHaveAttribute('data-kind', 'count')
  })
})
