import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emitActivity, getResources, useUniverseStore } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { audioManager } from '@/services/audio/audioManager'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { renderRoute } from '@/test/renderRoute'
import { STORY_TEXT } from './content'
import { STORIES_UI } from './ui'

// These tests cover a production (non-demo) build: PRO gates the voice there.
vi.mock('@/config/demo', () => ({
  DEMO: { demoMode: false, publicProUIEnabled: true, demoAdminEnabled: false },
}))

vi.mock('@/domain/universe', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/domain/universe')>()
  return { ...original, emitActivity: vi.fn(original.emitActivity) }
})

type User = Awaited<ReturnType<typeof renderRoute>>['user']

const UI = STORIES_UI.en
const LAMB = STORY_TEXT.en['lost-lamb']!
const STAR = STORY_TEXT.en['star-night']!

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

beforeEach(() => {
  useSettingsStore.setState({ language: 'en' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useSubscriptionStore.getState().cancel()
  vi.mocked(emitActivity).mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const page = () => screen.getByTestId('story-reader').dataset.page

async function next(user: User) {
  const before = page()
  await user.click(screen.getByTestId('story-next'))
  await waitFor(() => expect(page()).not.toBe(before))
}

/** Answers every question right on the first try (the right picture is `data-answer`). */
async function answerAll(user: User) {
  for (let step = 0; step < 5; step += 1) {
    const result = screen.queryByTestId('story-result')
    if (result) return result
    const question = await screen.findByTestId('story-question')
    const id = question.dataset.question!
    // the first label of a question is its right answer (shown in a mixed order)
    const label = LAMB.questions[id]!.options[0]!
    await user.click(within(question).getByRole('button', { name: label }))
    // the answer stays right; the next question (or the result) follows
    await waitFor(
      () => {
        const now = screen.queryByTestId('story-question')
        if (now && now.dataset.question === id) throw new Error('same question')
      },
      { timeout: 3000 },
    )
  }
  return screen.findByTestId('story-result')
}

describe('the story library', () => {
  it('shows six stories, four of them PRO, and a link to the classic tales', async () => {
    const { user, router } = await renderRoute('/stories')
    expect(screen.getByRole('heading', { name: UI.title })).toBeInTheDocument()
    const cards = screen.getAllByTestId(/^story-card-/)
    expect(cards).toHaveLength(6)
    expect(cards.filter((card) => card.dataset.locked === 'true')).toHaveLength(4)
    expect(screen.getByRole('button', { name: `${STAR.title} (PRO)` })).toBeInTheDocument()
    expect(screen.getByTestId('stories-classic-tales')).toHaveAttribute('href', '/learn/tales')

    // a PRO story does not open on Free: the robot says so calmly
    await user.click(screen.getByTestId('story-card-star-night'))
    expect(router.state.location.pathname).toBe('/stories')
    expect(screen.getByText(UI.locked)).toBeInTheDocument()

    await user.click(screen.getByTestId('story-card-lost-lamb'))
    expect(router.state.location.pathname).toBe('/stories/lost-lamb')
  })

  it('a direct link to a PRO story shows the locked note without the story', async () => {
    await renderRoute('/stories/star-night')
    expect(screen.getByTestId('story-locked')).toBeInTheDocument()
    const body = document.body.textContent ?? ''
    for (const line of Object.values(STAR.pages).flat()) expect(body).not.toContain(line)
    expect(screen.queryByTestId('story-reader')).not.toBeInTheDocument()
  })

  it('with PRO a child opens a PRO story', async () => {
    childOfAge(5)
    useSubscriptionStore.getState().activatePlan('lifetime', 'payment')
    const { user, router } = await renderRoute('/stories')
    expect(screen.getByTestId('story-card-star-night')).toHaveAttribute('data-locked', 'false')
    await user.click(screen.getByTestId('story-card-star-night'))
    expect(router.state.location.pathname).toBe('/stories/star-night')
    expect(await screen.findByTestId('story-text')).toHaveTextContent(STAR.pages.p1![0]!)
  })

  it('an unknown story goes back to the library', async () => {
    const { router } = await renderRoute('/stories/nope')
    await waitFor(() => expect(router.state.location.pathname).toBe('/stories'))
  })
})

describe('reading a free story', () => {
  it('reads with a choice to the end, answers and gets the reward, counted once', async () => {
    const { user } = await renderRoute('/stories/lost-lamb')
    expect(screen.getByTestId('story-text')).toHaveTextContent(LAMB.pages.p1![0]!)
    expect(screen.getByTestId('story-back')).toBeDisabled()
    await next(user)
    await next(user)
    await next(user)
    expect(page()).toBe('p4')
    // a choice page: no "next", two choices with pictures
    expect(screen.queryByTestId('story-next')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('story-choice-stay'))
    expect(page()).toBe('stay1')
    await next(user)
    await next(user)
    expect(page()).toBe('home')
    await user.click(screen.getByTestId('story-choice-thank'))
    expect(page()).toBe('end-thank')
    expect(screen.getByText(UI.theEnd)).toBeInTheDocument()
    await user.click(screen.getByTestId('story-to-questions'))

    // a guest starts the language strand at level 2: three who/what questions
    const first = await screen.findByTestId('story-question')
    expect(['who', 'what']).toContain(first.dataset.kind)
    const result = await answerAll(user)
    expect(within(result).getByTestId('story-score')).toHaveTextContent(UI.score(3, 3))
    expect(within(result).getByTestId('activity-reward')).toHaveTextContent('Scrolls: +1')

    expect(emitActivity).toHaveBeenCalledTimes(1)
    expect(vi.mocked(emitActivity).mock.calls[0]![0]).toMatchObject({
      childKey: GUEST_KEY,
      activity: 'story:lost-lamb',
      strand: 'language',
      correct: 3,
      total: 3,
      independent: 3,
      level: 2,
    })
    expect(getResources(GUEST_KEY).scroll).toBe(1)

    // reading it again: no second scroll
    await user.click(screen.getByTestId('story-again'))
    expect(page()).toBe('p1')
    expect(emitActivity).toHaveBeenCalledTimes(1)
  })

  it('goes back to a choice and can choose the other way', async () => {
    const { user } = await renderRoute('/stories/lost-lamb')
    for (let i = 0; i < 3; i += 1) await next(user)
    await user.click(screen.getByTestId('story-choice-down'))
    expect(page()).toBe('down1')
    expect(screen.getByTestId('story-text')).toHaveTextContent(LAMB.pages.down1![0]!)
    await user.click(screen.getByTestId('story-back'))
    expect(page()).toBe('p4')
    await user.click(screen.getByTestId('story-choice-stay'))
    expect(page()).toBe('stay1')
  })
})

describe('Read to me', () => {
  it('on Free shows the PRO chip and a calm note, and plays nothing', async () => {
    const say = vi.spyOn(audioManager, 'say')
    const { user } = await renderRoute('/stories/lost-lamb')
    const button = screen.getByTestId('story-narrate')
    expect(button).toHaveAccessibleName(`${UI.readToMe} (PRO)`)
    await user.click(button)
    expect(screen.getByTestId('story-note')).toHaveTextContent(UI.proNarration)
    expect(say).not.toHaveBeenCalled()
  })

  it('on PRO reads the page from recordings and shows "not recorded" honestly', async () => {
    childOfAge(5)
    useSubscriptionStore.getState().activatePlan('lifetime', 'payment')
    const say = vi.spyOn(audioManager, 'say').mockResolvedValue('missing')
    const { user } = await renderRoute('/stories/lost-lamb')
    await user.click(screen.getByTestId('story-narrate'))
    await waitFor(() =>
      expect(screen.getByTestId('story-narrate')).toHaveAttribute('data-state', 'problem'),
    )
    expect(screen.getByTestId('story-note')).toHaveTextContent(UI.noRecording)
    expect(say).toHaveBeenCalledWith(
      LAMB.pages.p1!.map((text) => ({ text })),
      { language: 'en' },
      { requirePro: true, clipsOnly: true },
    )
    // no automatic page turn without narration that played
    expect(page()).toBe('p1')
  })

  it('turns the page by itself only after the narration played, and stops on leaving', async () => {
    childOfAge(5)
    useSubscriptionStore.getState().activatePlan('lifetime', 'payment')
    vi.spyOn(audioManager, 'say').mockResolvedValue('done')
    const stop = vi.spyOn(audioManager, 'stopSpeech')
    const { user, unmount } = await renderRoute('/stories/lost-lamb')
    await user.click(screen.getByTestId('story-narrate'))
    await user.click(screen.getByTestId('story-auto-turn'))
    // page 1 was read before the auto turn was on: it waits for the child
    expect(page()).toBe('p1')
    await next(user)
    // page 2 is read to the end, then turns by itself
    await waitFor(() => expect(page()).toBe('p3'), { timeout: 4000 })
    const stopsBefore = stop.mock.calls.length
    act(() => unmount())
    expect(stop.mock.calls.length).toBeGreaterThan(stopsBefore)
  })
})
