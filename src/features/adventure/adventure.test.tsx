import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { emitActivity, grantResource, useUniverseStore } from '@/domain/universe'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { cellFor, roadPath } from './mapLayout'

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useUniverseStore.setState({ byChild: {} })
})

describe('Adventure Map', () => {
  it('opens worlds by stars and shows how many are still needed', async () => {
    // 3 stars from a perfect maths run + 4 more = 7 stars
    emitActivity({
      id: 'run-1',
      childKey: GUEST_KEY,
      activity: 'math:6',
      strand: 'number',
      correct: 5,
      total: 5,
      independent: 5,
    })
    grantResource({ childKey: GUEST_KEY, resource: 'star', amount: 4, reason: 'test', refId: 'a' })
    await renderRoute('/adventure')

    expect(screen.getByText('Yig‘ilgan yulduzlar: 7')).toBeInTheDocument()

    const forest = screen.getByTestId('world-forest')
    expect(forest).toHaveTextContent('Ochiq')
    expect(within(forest).getByRole('link', { name: /^Alifbo\./ })).toHaveAttribute(
      'href',
      '/alphabet',
    )

    const ocean = screen.getByTestId('world-ocean')
    expect(ocean).toHaveAttribute('aria-current', 'location')
    expect(ocean).toHaveTextContent('Sen shu yerdasan')
    expect(
      within(ocean).getByRole('link', { name: 'Matematika. Eng yaxshi natija: 3 / 3 yulduz' }),
    ).toHaveAttribute('href', '/learn/math')
    expect(
      within(ocean).getByRole('link', { name: 'Juftini top. Hali o‘ynalmagan' }),
    ).toHaveAttribute('href', '/tasks/memory')

    const dinosaur = screen.getByTestId('world-dinosaur')
    expect(dinosaur).toHaveTextContent('Tez orada')
    expect(dinosaur).toHaveTextContent('Bu olam hali tayyorlanmoqda.')
    expect(within(dinosaur).queryByRole('link')).not.toBeInTheDocument()

    const space = screen.getByTestId('world-space')
    expect(space).toHaveTextContent('Yana 17 ta yulduz')
    expect(within(space).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '7')
    expect(within(space).getByRole('progressbar')).toHaveAttribute('aria-valuemax', '24')
    // opening a world only changes the map: its activities are open already
    expect(within(space).getByRole('link', { name: 'Koinot. Hali o‘ynalmagan' })).toHaveAttribute(
      'href',
      '/learn/space',
    )
  })

  it('starts in the forest with nothing collected', async () => {
    await renderRoute('/adventure')
    expect(screen.getByTestId('world-forest')).toHaveTextContent('Sen shu yerdasan')
    expect(screen.getByTestId('world-ocean')).toHaveTextContent('Yana 6 ta yulduz')
  })
})

describe('map layout', () => {
  it('snakes the worlds through the grid', () => {
    expect([0, 1, 2, 3, 4, 5].map((index) => cellFor(index, 3))).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 1, col: 1 },
      { row: 1, col: 0 },
    ])
    expect(cellFor(3, 1)).toEqual({ row: 3, col: 0 })
  })

  it('draws the road through the measured card centres', () => {
    expect(roadPath([], 2, 600)).toBe('')
    const points = [0, 1, 2, 3].map((index) => ({
      x: cellFor(index, 2).col === 0 ? 150 : 450,
      y: cellFor(index, 2).row * 300 + 60,
      row: cellFor(index, 2).row,
    }))
    const path = roadPath(points, 2, 600)
    expect(path.startsWith('M 150 60')).toBe(true)
    // along row 0, the turn out to the right, along row 1
    expect(path.match(/[QC] /g)).toEqual(['Q ', 'C ', 'Q '])
    expect(path).toContain('C 570 60 570 360 450 360')
  })
})
