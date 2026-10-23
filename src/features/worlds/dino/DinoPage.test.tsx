import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { useMascotStore } from '@/features/mascot/mascotStore'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { renderRoute } from '@/test/renderRoute'
import { DINO_IDS, DINOS } from './content'
import { DINO_TEXT } from './text'

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

async function waitForNext(before: HTMLElement, testId: string) {
  await waitFor(
    () => {
      if (screen.queryByTestId(testId) === before) throw new Error('still the same question')
    },
    { timeout: 3000 },
  )
}

/** The PRO animals' Explorer facts and point texts (Uzbek), which the quiz and dig never show. */
const PRO_FACTS = DINO_IDS.filter((id) => !DINOS[id].free).flatMap((id) => {
  const dino = DINO_TEXT.uz.dinos[id]
  // whole sentences only: a one-word point label ("Qanotlar") also occurs in the
  // general quiz hints, which are free
  return [...dino.facts, ...Object.values(dino.spots).map((spot) => spot.fact)]
})

/** Quiz and dig may name and picture every animal, but no PRO 3D model or fact is reachable. */
function expectNoProContent() {
  expect(screen.queryByTestId('explorer')).not.toBeInTheDocument()
  expect(screen.queryByTestId('explorer-3d')).not.toBeInTheDocument()
  const page = document.body.textContent ?? ''
  for (const fact of PRO_FACTS) expect(page).not.toContain(fact)
  for (const img of document.querySelectorAll('img')) {
    expect(img.getAttribute('src') ?? '').not.toMatch(/\.(glb|gltf)$/)
  }
}

/** Answers every quiz question right on the first try. */
async function playQuiz(user: User) {
  while (screen.queryByTestId('quiz-question')) {
    const q = screen.getByTestId('quiz-question')
    expectNoProContent()
    const right = within(q)
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-label') === nameOf(q.dataset.answer!))!
    await user.click(right)
    await waitForNext(q, 'quiz-question')
  }
  return screen.findByTestId('dino-result')
}

const NAMES: Record<string, string> = {
  trex: 'Tiranozavr',
  triceratops: 'Triseratops',
  stegosaurus: 'Stegozavr',
  brachiosaurus: 'Braxiozavr',
  pteranodon: 'Pteranodon',
  ankylosaurus: 'Ankilozavr',
  plant: 'O‘simlik',
  meat: 'Go‘sht',
  fish: 'Baliq',
}
const nameOf = (id: string) => NAMES[id] ?? id

const universe = (key: string) => useUniverseStore.getState().byChild[key]

describe('Dinosaur world', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useProgressStore.setState({ byChild: {} })
    useUniverseStore.setState({ byChild: {} })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useSubscriptionStore.getState().cancel()
  })

  it('a quiz run counts once in the universe, at the level it was played at', async () => {
    childOfAge(5)
    const { user } = await renderRoute('/worlds/dino/quiz')
    await user.click(screen.getByTestId('quiz-start'))
    // a five-year-old starts the science strand at level 2: five questions, three pictures
    const first = screen.getByTestId('quiz-question')
    expect(first).toHaveAttribute('data-level', '2')
    expect(within(first).getAllByRole('button').length).toBeGreaterThanOrEqual(2)

    // one wrong answer first: the hint shows and the run is no longer perfect
    const wrong = within(first)
      .getAllByRole('button')
      .find((button) => button.getAttribute('aria-label') !== nameOf(first.dataset.answer!))!
    await user.click(wrong)
    expect(screen.getByTestId('quiz-hint')).toBeInTheDocument()

    const result = await playQuiz(user)
    expect(within(result).getByTestId('dino-score')).toHaveTextContent('4 / 5')
    expect(within(result).getByTestId('activity-reward')).toBeInTheDocument()
    const kid = universe('kid')
    expect(kid?.processed).toHaveLength(1)
    expect(kid?.best['dino:quiz:L2']).toBe(2)
    expect(kid?.strands?.science).toMatchObject({ level: 2, runs: 1, total: 5, independent: 4 })

    // the praise screen waiting does not count the run again: a second count never shows up
    await expect(
      waitFor(() => expect(universe('kid')?.processed).toHaveLength(2), { timeout: 300 }),
    ).rejects.toThrow()
    expect(universe('kid')?.processed).toHaveLength(1)
    expectNoProContent()
  })

  it('the dig: the keyboard brushes the sand away, then the bone is matched', async () => {
    const { user } = await renderRoute('/worlds/dino/dig')
    await user.click(screen.getByTestId('dig-start'))
    let rounds = 0
    while (screen.queryByTestId('dig-run') && rounds < 5) {
      rounds += 1
      const run = screen.getByTestId('dig-run')
      const board = screen.getByTestId('dig-board')
      board.focus()
      while (run.dataset.uncovered !== 'true') await user.keyboard('{Enter}')
      expect(screen.getByTestId('dig-prompt')).toHaveTextContent('Bu kimning suyagi?')
      expectNoProContent()
      await user.click(screen.getByRole('button', { name: nameOf(run.dataset.dino!) }))
      await waitForNext(run, 'dig-run')
    }
    expect(await screen.findByTestId('dino-result')).toHaveTextContent('2 / 2')
    expect(universe(GUEST_KEY)?.best['dino:dig:L2']).toBe(3)
  })

  it('on Free, four animals are PRO: shown with the label, never opened', async () => {
    childOfAge(5)
    const { user, router } = await renderRoute('/worlds/dino/explore')
    const locked = screen
      .getAllByRole('button', { name: /\(PRO\)$/ })
      .filter((button) => button.dataset.testid?.startsWith('dino-card-'))
    expect(locked.map((button) => button.dataset.testid)).toEqual([
      'dino-card-stegosaurus',
      'dino-card-brachiosaurus',
      'dino-card-pteranodon',
      'dino-card-ankylosaurus',
    ])
    await user.click(screen.getByTestId('dino-card-stegosaurus'))
    expect(router.state.location.pathname).toBe('/worlds/dino/explore')
    expect(useMascotStore.getState().message?.text).toMatch(/PRO versiyada/)

    await user.click(screen.getByTestId('dino-card-trex'))
    expect(router.state.location.pathname).toBe('/worlds/dino/explore/trex')
    expect(await screen.findByRole('img', { name: 'Tiranozavr' })).toBeInTheDocument()
  })

  it('a premium animal opened by its address on Free shows the PRO note, not the model', async () => {
    childOfAge(5)
    await renderRoute('/worlds/dino/explore/ankylosaurus')
    expect(screen.getByTestId('dino-locked')).toHaveTextContent('PRO versiyada')
    expect(screen.queryByTestId('explorer')).not.toBeInTheDocument()
  })

  it('with PRO every animal opens; tapping all its points finds everything', async () => {
    childOfAge(5)
    useSubscriptionStore.getState().activatePlan('lifetime', 'payment')
    const { user } = await renderRoute('/worlds/dino/explore')
    expect(screen.queryAllByRole('button', { name: /\(PRO\)$/ })).toHaveLength(0)
    expect(screen.getByTestId('dino-card-pteranodon')).toHaveAttribute('data-locked', 'false')
    await user.click(screen.getByTestId('dino-card-stegosaurus'))
    // jsdom has no WebGL: the picture with numbered buttons under it
    expect(await screen.findByRole('img', { name: 'Stegozavr' })).toBeInTheDocument()
    for (const spot of ['plates', 'spikes', 'head']) {
      await user.click(screen.getByTestId(`hotspot-${spot}`))
    }
    expect(screen.getByTestId('dino-spot')).toHaveTextContent('Kichkina bosh')
    expect(screen.getByTestId('dino-all-found')).toBeInTheDocument()
  })
})
