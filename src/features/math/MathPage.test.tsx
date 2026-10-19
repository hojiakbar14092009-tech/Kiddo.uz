import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import { getLearnChild, stagesTaught, useLearnStore } from '@/features/learn/learnStore'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function childOfAge(age: number) {
  useFamilyStore.setState({
    children: [
      {
        id: 'kid',
        name: 'Ali',
        birthDate: birthDateForAge(age, iso(new Date())),
        celebratedLevel: age as 4 | 5 | 6,
        gender: 'boy',
        mascot: 'boy',
        dailyLimitMinutes: 60,
        createdAt: new Date().toISOString(),
      },
    ],
    activeChildId: 'kid',
  })
}

const question = () => screen.getByTestId('math-question')
const sum = () => Number(question().dataset.sum)

/** Answers the current question right (age 4 cards are named "3 ta olma"). */
async function answerRight(user: Awaited<ReturnType<typeof renderRoute>>['user'], level: number) {
  const before = question()
  const right = sum()
  const cards = within(before)
    .getAllByRole('button')
    .filter((b) => b.closest('.grid'))
  const card = cards.find((b) =>
    level === 4
      ? b.getAttribute('aria-label')?.startsWith(`${right} ta `)
      : b.getAttribute('aria-label') === String(right),
  )!
  await user.click(card)
  await waitFor(() => expect(screen.queryByTestId('math-question')).not.toBe(before), {
    timeout: 3000,
  })
}

describe('Matematika page', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useLearnStore.setState({ byChild: {} })
    useProgressStore.setState({ byChild: {} })
  })

  it('age 4: count by tapping (never twice), learn a stage, then a 3-question picture check', async () => {
    childOfAge(4)
    const { user } = await renderRoute('/learn/math')
    expect(screen.getByTestId('math-test')).toBeDisabled()
    expect(screen.getByTestId('stage-4-sum5')).toBeDisabled()
    await user.click(screen.getByTestId('stage-4-sum3'))
    expect(
      screen.getByRole('heading', { name: 'Narsalarni qo‘shamiz! Har biriga bosib sanab ko‘r.' }),
    ).toBeInTheDocument()
    await user.click(screen.getByTestId('math-start'))

    // tapping objects counts them once each
    const objects = within(question()).getAllByTestId('count-object')
    expect(objects).toHaveLength(sum())
    await user.click(objects[0]!)
    await user.click(objects[0]!)
    expect(screen.getByTestId('counted')).toHaveTextContent('Sanadik: 1')
    await user.click(objects[1]!)
    expect(screen.getByTestId('counted')).toHaveTextContent('Sanadik: 2')
    expect(objects[1]).toHaveAccessibleName('2')

    // two picture answers
    const cards = within(question())
      .getAllByRole('button')
      .filter((b) => b.closest('.grid'))
    expect(cards).toHaveLength(2)

    for (let i = 0; i < 3; i += 1) await answerRight(user, 4)
    await user.click(
      within(question())
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-label')?.startsWith(`${sum()} ta `))[0]!,
    )
    await screen.findByTestId('stage-done', undefined, { timeout: 3000 })
    expect(stagesTaught(getLearnChild('kid'), 'math', 'any')).toEqual(['4-sum3'])

    // the check: 3 questions, a wrong first answer is kept even after correcting it
    await user.click(screen.getByRole('button', { name: 'Qisqa tekshiruv' }))
    const first = question()
    const wrong = within(first)
      .getAllByRole('button')
      .filter((b) => b.closest('.grid'))
      .find((b) => !b.getAttribute('aria-label')?.startsWith(`${sum()} ta `))!
    await user.click(wrong)
    await answerRight(user, 4)
    await answerRight(user, 4)
    await act(async () => {
      await answerRightLast(user)
    })
    expect(
      await screen.findByTestId('learn-score', undefined, { timeout: 3000 }),
    ).toHaveTextContent('Mustaqil to‘g‘ri javoblar: 2/3')
  }, 20000)

  it('age 6: three stages in order, numbers, the check stays closed until a stage is taught', async () => {
    childOfAge(6)
    const { user } = await renderRoute('/learn/math')
    expect(screen.getByTestId('stage-6-to10')).toBeEnabled()
    expect(screen.getByTestId('stage-6-make10')).toBeDisabled()
    expect(screen.getByTestId('stage-6-over10')).toBeDisabled()
    expect(screen.getByTestId('math-test')).toBeDisabled()
    await user.click(screen.getByTestId('stage-6-to10'))
    await user.click(screen.getByTestId('math-start'))
    expect(screen.getByTestId('equation')).toHaveTextContent(/\d \+ \d = \?/)
    // learning shows three numeric answers and a ten-frame picture
    const cards = within(question())
      .getAllByRole('button')
      .filter((b) => b.closest('.grid'))
    expect(cards).toHaveLength(3)
    expect(within(question()).getByTestId('ten-frame')).toBeInTheDocument()
  })

  it('age 5: a big equation with three answers', async () => {
    childOfAge(5)
    const { user } = await renderRoute('/learn/math')
    await user.click(screen.getByTestId('stage-5-sum5'))
    await user.click(screen.getByTestId('math-start'))
    expect(sum()).toBeLessThanOrEqual(5)
    const cards = within(question())
      .getAllByRole('button')
      .filter((b) => b.closest('.grid'))
    expect(cards.map((b) => b.getAttribute('aria-label'))).toHaveLength(3)
  })
})

async function answerRightLast(user: Awaited<ReturnType<typeof renderRoute>>['user']) {
  const right = sum()
  const card = within(question())
    .getAllByRole('button')
    .find((b) => b.getAttribute('aria-label')?.startsWith(`${right} ta `))!
  await user.click(card)
}
