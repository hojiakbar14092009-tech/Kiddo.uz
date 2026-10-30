import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { tashkentDay } from '@/lib/dates'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { controlValue, MISSIONS, PIECES } from './puzzles'

function seedChild(age: number) {
  useFamilyStore.setState({
    children: [
      {
        id: 'c1',
        name: 'Aziz',
        birthDate: birthDateForAge(age, tashkentDay()),
        celebratedLevel: 6,
        gender: 'girl',
        mascot: 'girl',
        dailyLimitMinutes: 60,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    activeChildId: 'c1',
  })
}

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
})

type User = Awaited<ReturnType<typeof renderRoute>>['user']

/** Solves the puzzle on screen the way a child would (sliders, slots, choices). */
async function solve(user: User, depth: keyof typeof MISSIONS, index: number) {
  const puzzle = MISSIONS[depth][index]!
  if (puzzle.mode === 'match' || puzzle.mode === 'light') {
    for (const control of puzzle.controls) {
      const row = document.querySelector(`[data-control="${control}"]`)!
      fireEvent.change(within(row as HTMLElement).getByRole('slider'), {
        target: { value: String(controlValue(puzzle.target, control)) },
      })
    }
    await user.click(screen.getByTestId('shadow-check'))
  } else if (puzzle.mode === 'build') {
    for (const [slot, piece] of puzzle.target.entries()) {
      const taps = piece ? PIECES.indexOf(piece) + 1 : 0
      for (let i = 0; i < taps; i += 1) {
        await user.click(document.querySelector(`[data-slot="${slot}"]`)!)
      }
    }
    await user.click(screen.getByTestId('shadow-check'))
  } else {
    const choices = screen.getByTestId('shadow-choices')
    const answer = Number(choices.getAttribute('data-answer'))
    await user.click(within(choices).getAllByRole('button')[answer]!)
  }
  await user.click(await screen.findByTestId('shadow-next'))
}

describe('Shadow Lab', () => {
  it('a 5-year-old: one object and one light, a distance slider; a whole mission counts once', async () => {
    seedChild(5)
    const { user } = await renderRoute('/shadow-lab')
    expect(screen.getByTestId('shadow-lab')).toHaveAttribute('data-depth', 'simple')
    await user.click(screen.getByTestId('shadow-start'))
    expect(screen.getByRole('heading', { name: 'Soyani moslashtir' })).toHaveFocus()
    // one control only
    expect(document.querySelectorAll('[data-control]')).toHaveLength(1)
    for (let index = 0; index < 5; index += 1) await solve(user, 'simple', index)
    expect(await screen.findByTestId('shadow-done')).toBeInTheDocument()
    expect(screen.getByText('Birinchi urinishda topilgani: 5 / 5')).toBeInTheDocument()
    const child = useUniverseStore.getState().byChild.c1!
    expect(child.processed).toHaveLength(1)
    expect(child.stats.byStrand.science).toBe(1)
  })

  it('a wrong check gets a hint in the right direction; after three, Lumi can show it', async () => {
    seedChild(8)
    const { user } = await renderRoute('/shadow-lab')
    await user.click(screen.getByTestId('shadow-start'))
    expect(document.querySelectorAll('[data-control]')).toHaveLength(2)
    await user.click(screen.getByTestId('shadow-check'))
    // the target is nearer the lamp: the hint says to bring it closer
    expect(screen.getByText('Soya juda kichik: buyumni chiroqqa yaqinlashtir.')).toBeInTheDocument()
    await user.click(screen.getByTestId('shadow-check'))
    await user.click(screen.getByTestId('shadow-check'))
    await user.click(screen.getByRole('button', { name: 'Lumi ko‘rsatsin' }))
    expect(screen.getByTestId('shadow-verdict')).toHaveTextContent('Mana shunday bo‘ladi!')
    expect(screen.getByTestId('shadow-next')).toHaveFocus()
  })

  it('the plus and minus buttons work as a keyboard/touch alternative to dragging', async () => {
    seedChild(5)
    const { user } = await renderRoute('/shadow-lab')
    await user.click(screen.getByTestId('shadow-start'))
    const slider = screen.getByRole('slider', { name: 'Buyum chiroqdan uzoqligi' })
    expect(slider).toHaveValue('7')
    await user.click(screen.getByRole('button', { name: 'Buyum chiroqdan uzoqligi: kamaytirish' }))
    expect(slider).toHaveValue('6.5')
  })

  it('older learners get several controls and viewpoint puzzles', async () => {
    seedChild(12)
    const { user } = await renderRoute('/shadow-lab')
    expect(screen.getByTestId('shadow-lab')).toHaveAttribute('data-depth', 'multi')
    await user.click(screen.getByTestId('shadow-start'))
    expect(document.querySelectorAll('[data-control]')).toHaveLength(4)
    await solve(user, 'multi', 0)
    expect(screen.getByTestId('shadow-puzzle')).toHaveAttribute('data-mode', 'views')
    // taught first: a solid that is not an answer (cylinder here), from all three sides
    const example = screen.getByTestId('shadow-views-example')
    expect(example).toHaveTextContent('Avval misol. Silindr')
    expect(within(example).getAllByRole('figure')).toHaveLength(3)
    expect(screen.getAllByRole('figure')).toHaveLength(6)
  })

  it('another child becoming active mid-run starts over, so no one is paid for another’s run', async () => {
    seedChild(5)
    const { user } = await renderRoute('/shadow-lab')
    await user.click(screen.getByTestId('shadow-start'))
    expect(screen.queryByTestId('shadow-start')).toBeNull()
    act(() =>
      useFamilyStore.setState((state) => ({
        children: [...state.children, { ...state.children[0]!, id: 'c2', name: 'Vali' }],
        activeChildId: 'c2',
      })),
    )
    expect(screen.getByTestId('shadow-start')).toBeInTheDocument()
  })
})
