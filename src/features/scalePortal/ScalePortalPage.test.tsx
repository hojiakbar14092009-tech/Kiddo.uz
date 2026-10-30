import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { tashkentDay } from '@/lib/dates'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { JUMPS } from './questions'

// the camera lands at once in tests (the zoom itself is a framer-motion tween)
vi.mock('./camera', async (original) => {
  const real = await original<typeof import('./camera')>()
  return {
    ...real,
    useCamera:
      (z: { set: (v: number) => void }) =>
      (target: number): Promise<void> => {
        z.set(target)
        return Promise.resolve()
      },
  }
})

function seedChild(age: number) {
  useFamilyStore.setState({
    children: [
      {
        id: 'c1',
        name: 'Aziz',
        birthDate: birthDateForAge(age, tashkentDay()),
        celebratedLevel: 6,
        gender: 'boy',
        mascot: 'boy',
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

async function travel(user: Awaited<ReturnType<typeof renderRoute>>['user'], rightEvery = 1) {
  await user.click(screen.getByTestId('scale-start'))
  for (let step = 0; step < JUMPS; step += 1) {
    const question = await screen.findByTestId('scale-question')
    const answer = Number(question.getAttribute('data-answer'))
    const pick = step % rightEvery === 0 ? answer : (answer + 1) % 2
    await user.click(within(question).getAllByRole('button')[pick]!)
    await user.click(await screen.findByTestId('scale-next'))
  }
}

describe('Scale Portal', () => {
  it('a 5-year-old compares pictures: no numbers, a guess at every portal, one counted journey', async () => {
    seedChild(5)
    const { user } = await renderRoute('/scale-portal')
    expect(screen.getByTestId('scale-rail')).toHaveAttribute('data-detail', 'compare')
    await user.click(screen.getByTestId('scale-start'))
    const question = screen.getByTestId('scale-question')
    expect(question).toHaveTextContent('Qaysi biri kattaroq?')
    expect(question).not.toHaveTextContent(/\d{2,}/)
    expect(screen.getByRole('heading', { name: 'Qaysi biri kattaroq?' })).toHaveFocus()
    // a wrong guess still jumps, kindly
    const answer = Number(question.getAttribute('data-answer'))
    await user.click(within(question).getAllByRole('button')[1 - answer]!)
    expect(await screen.findByTestId('scale-verdict')).toHaveTextContent('Yaxshi urinish!')
    expect(await screen.findByTestId('scale-compare')).toHaveTextContent(
      'Chumoli Qon hujayrasidan ancha katta!',
    )
    expect(screen.getByTestId('scale-stop')).toHaveAttribute('data-stop', 'ant')
  })

  it('finishes once through central progression; the result counts first-try guesses', async () => {
    seedChild(8)
    const { user } = await renderRoute('/scale-portal')
    expect(screen.getByTestId('scale-rail')).toHaveAttribute('data-detail', 'ratio')
    await travel(user)
    expect(await screen.findByTestId('scale-done')).toBeInTheDocument()
    expect(screen.getByText(`To‘g‘ri taxminlar: ${JUMPS} / ${JUMPS}`)).toBeInTheDocument()
    const child = useUniverseStore.getState().byChild.c1!
    expect(child.processed).toHaveLength(1)
    expect(child.stats.byStrand.space).toBe(1)
    // the rail is free to explore after the journey; exploring pays nothing
    const rail = screen.getByRole('slider', { name: 'Masshtab relsi' })
    expect(rail).toBeEnabled()
  })

  it('older learners guess in steps of ten or scientific notation', async () => {
    seedChild(11)
    const first = await renderRoute('/scale-portal')
    await first.user.click(screen.getByTestId('scale-start'))
    expect(screen.getByTestId('scale-question')).toHaveTextContent('nechta "×10" qadam')
    first.unmount()

    seedChild(14)
    const second = await renderRoute('/scale-portal')
    await second.user.click(screen.getByTestId('scale-start'))
    expect(screen.getByTestId('scale-question')).toHaveTextContent('× 10')
    expect(screen.getByTestId('scale-size')).toHaveTextContent('10')
  })

  it('exploring freely moves the camera with the rail', async () => {
    seedChild(9)
    const { user } = await renderRoute('/scale-portal')
    await user.click(screen.getByRole('button', { name: 'Erkin kezish' }))
    const rail = screen.getByRole('slider', { name: 'Masshtab relsi' })
    expect(rail).toBeEnabled()
    // fireEvent: a range input changes by value
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(rail, { target: { value: '5' } })
    expect(screen.getByTestId('scale-stage')).toHaveAttribute('data-nearest', 'earth')
    expect(useUniverseStore.getState().byChild.c1?.processed ?? []).toHaveLength(0)
  })
})
