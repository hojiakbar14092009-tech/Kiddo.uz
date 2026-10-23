import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

type User = Awaited<ReturnType<typeof renderRoute>>['user']

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

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

const question = () => screen.getByTestId('lab-question')

/** The answer card of a value: "3", "3 ta olma" or the sign's name. */
function card(value: string) {
  const buttons = within(question()).getAllByRole('button')
  const found = buttons.find((b) => {
    const label = b.getAttribute('aria-label') ?? ''
    return label === value || label.startsWith(`${value} ta `) || label === SIGN_LABEL[value]
  })
  if (!found) throw new Error(`no card for ${value}`)
  return found
}

/** Puts `count` objects in the basket: one tap each. */
async function fillBasket(user: User, count: number) {
  for (let i = 0; i < count; i += 1) {
    await user.click(screen.getAllByTestId('lab-object')[0]!)
  }
}

async function waitForNext(before: HTMLElement) {
  await waitFor(
    () => {
      const now = screen.queryByTestId('lab-question')
      if (now === before) throw new Error('still the same question')
    },
    { timeout: 3000 },
  )
}

/** Answers the current question right on the first try. */
async function answerRight(user: User) {
  const q = question()
  const answer = q.dataset.answer!
  if (q.dataset.kind === 'drag') {
    await fillBasket(user, Number(answer))
    await user.click(screen.getByTestId('lab-done'))
  } else {
    await user.click(card(answer))
  }
  await waitForNext(q)
}

async function playSession(user: User) {
  await waitFor(() => expect(question()).toBeInTheDocument())
  while (screen.queryByTestId('lab-question')) await answerRight(user)
  return screen.findByTestId('lab-result')
}

const kid = () => useUniverseStore.getState().byChild.kid

describe('Math Lab page', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useProgressStore.setState({ byChild: {} })
    useUniverseStore.setState({ byChild: {} })
    useFamilyStore.setState({ children: [], activeChildId: null })
  })

  it('a four-year-old starts at level 1 (pictures, no level number), and strong runs move up', async () => {
    childOfAge(4)
    const { user } = await renderRoute('/math-lab')
    expect(screen.queryByTestId('lab-level')).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Qo‘shishni bosqichma-bosqich o‘rganish' }),
    ).toHaveAttribute('href', '/learn/math')
    await user.click(screen.getByTestId('lab-start'))

    // level 1: five questions, the basket task first, answered with one tap per object
    expect(question()).toHaveAttribute('data-kind', 'drag')
    expect(question()).toHaveAttribute('data-level', '1')
    expect(screen.getByTestId('lab-prompt')).toHaveTextContent(/^Savatga \d ta \S+ sol\.$/)
    const result = await playSession(user)

    // counted once in the universe: one run, three stars
    expect(kid()?.processed).toHaveLength(1)
    expect(kid()?.strands?.number).toMatchObject({ level: 1, runs: 1, independent: 5, total: 5 })
    expect(kid()?.best['math-lab:count:L1']).toBe(3)
    expect(within(result).getByTestId('activity-reward')).toHaveTextContent('+3 yulduz')
    expect(within(result).getByTestId('lab-score')).toHaveTextContent('5/5')

    // a second strong run: the next session is one level up (said kindly, no number yet)
    await user.click(screen.getByTestId('lab-again'))
    await playSession(user)
    expect(kid()?.processed).toHaveLength(2)
    expect(kid()?.strands?.number?.level).toBe(2)
    expect(
      screen.getByText('Zo‘r! Keyingi safar seni yangi topshiriqlar kutmoqda.'),
    ).toBeInTheDocument()

    await user.click(screen.getByTestId('lab-again'))
    expect(question()).toHaveAttribute('data-level', '2')
    expect(question()).toHaveAttribute('data-kind', 'drag')
  }, 30_000)

  it('a guest starts at level 2 (the basket first, no level number)', async () => {
    const { user } = await renderRoute('/math-lab')
    expect(screen.queryByTestId('lab-level')).not.toBeInTheDocument()
    // one heading with the lab's name (the top bar's), not two
    expect(screen.getAllByRole('heading', { name: 'Matematika laboratoriyasi' })).toHaveLength(1)
    await user.click(screen.getByTestId('lab-start'))
    expect(question()).toHaveAttribute('data-level', '2')
    expect(question()).toHaveAttribute('data-kind', 'drag')
  })

  it('helps after a mistake, never punishes it, and shows "Level N" from level 3', async () => {
    childOfAge(6)
    const { user } = await renderRoute('/math-lab')
    // a six-year-old starts at level 3
    for (const chip of screen.getAllByTestId('lab-level'))
      expect(chip).toHaveTextContent('3-daraja')
    await user.click(screen.getByTestId('lab-start'))
    expect(question()).toHaveAttribute('data-level', '3')

    const first = question()
    const answer = first.dataset.answer!
    const wrong = within(first)
      .getAllByRole('button')
      .find((b) => b !== card(answer))!
    await user.click(wrong)
    const help = screen.getByTestId('lab-help')
    expect(help).toBeVisible()
    // the right answer is still possible
    await user.click(card(answer))
    await waitForNext(first)
    expect(screen.queryByTestId('lab-help')).not.toBeInTheDocument()

    while (screen.queryByTestId('lab-question')) await answerRight(user)
    await screen.findByTestId('lab-result')
    expect(kid()?.processed).toHaveLength(1)
    expect(kid()?.strands?.number).toMatchObject({ runs: 1, independent: 5, total: 6 })
  }, 30_000)

  it('leaving during the praise of the last answer still counts the run, at its level', async () => {
    childOfAge(4)
    const { user, unmount } = await renderRoute('/math-lab')
    await user.click(screen.getByTestId('lab-start'))
    // every question but the last
    for (let i = 0; i < 4; i += 1) await answerRight(user)
    const last = question()
    const answer = last.dataset.answer!
    if (last.dataset.kind === 'drag') {
      await fillBasket(user, Number(answer))
      await user.click(screen.getByTestId('lab-done'))
    } else {
      await user.click(card(answer))
    }
    // counted at once, before the result screen shows
    expect(screen.queryByTestId('lab-result')).not.toBeInTheDocument()
    expect(kid()?.processed).toHaveLength(1)
    expect(kid()?.strands?.number).toMatchObject({ level: 1, runs: 1, independent: 5, total: 5 })
    unmount()
    expect(kid()?.processed).toHaveLength(1)
  }, 30_000)

  it('one tap puts an object in the basket; its place stays, and minus takes one out', async () => {
    childOfAge(4)
    const { user } = await renderRoute('/math-lab')
    await user.click(screen.getByTestId('lab-start'))
    const target = Number(question().dataset.answer)
    const slots = screen.getByTestId('lab-tray').children.length
    // one tap: straight into the basket, the object's place stays (nothing moves under the finger)
    await user.click(screen.getAllByTestId('lab-object')[0]!)
    expect(screen.getByTestId('lab-basket')).toHaveAttribute('data-count', '1')
    expect(screen.getAllByTestId('lab-object')).toHaveLength(slots - 1)
    expect(screen.getByTestId('lab-tray').children).toHaveLength(slots)
    await fillBasket(user, target)
    expect(screen.getByTestId('lab-basket')).toHaveAttribute('data-count', String(target + 1))
    await user.click(screen.getByTestId('lab-done'))
    expect(screen.getByTestId('lab-help')).toHaveTextContent('Savatda ko‘proq bo‘lib qoldi.')
    await user.click(screen.getByRole('button', { name: 'Savatdan olish' }))
    expect(screen.getByTestId('lab-basket')).toHaveAccessibleName(`Savat, ichida ${target} ta`)
    const before = question()
    await user.click(screen.getByTestId('lab-done'))
    await waitForNext(before)
  })
})
