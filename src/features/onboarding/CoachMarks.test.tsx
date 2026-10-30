import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { CoachMarks } from './CoachMarks'

const sayText = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('@/services/audio/useSpeaker', () => ({
  useSpeaker: () => ({ sayText, speaking: false, canSpeak: true }),
}))

/** The real things the play tour points at: the answers and the home button. */
function Page() {
  return (
    <>
      <header>
        <button type="button" data-sound="back">
          home
        </button>
      </header>
      <div data-testid="task-options">
        <button type="button">a</button>
      </div>
      <CoachMarks tour="play" delayMs={0} />
    </>
  )
}

function child(age: number) {
  const family = useFamilyStore.getState()
  const kid = family.addChild({
    name: 'Ali',
    birthDate: birthDateForAge(age, dayKey()),
    gender: 'boy',
  })
  family.setActiveChild(kid.id)
  return kid.id
}

async function settle() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
}

describe('CoachMarks on the real screen', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz', guestTours: {} })
    useFamilyStore.setState({ children: [], activeChildId: null })
    sayText.mockClear()
    // jsdom gives everything a size of 0: pretend the things are on screen
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      left: 20,
      width: 200,
      height: 60,
      right: 220,
      bottom: 160,
      x: 20,
      y: 100,
      toJSON() {},
    } as DOMRect)
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('a young child: every step on the thing itself, read aloud; Next to the end counts once', async () => {
    const id = child(5)
    const user = userEvent.setup()
    render(<Page />)
    await settle()
    expect(screen.getByRole('dialog', { name: 'Javobni tanla' })).toBeInTheDocument()
    expect(screen.getByTestId('coach-marks')).toHaveAttribute('data-step', 'answer')
    expect(sayText).toHaveBeenCalled()
    await user.click(screen.getByTestId('coach-next'))
    expect(screen.getByRole('dialog', { name: 'Uyga qaytish' })).toBeInTheDocument()
    await user.click(screen.getByTestId('coach-next')) // "Tushunarli!"
    expect(screen.queryByTestId('coach-marks')).toBeNull()
    expect(useFamilyStore.getState().children.find((c) => c.id === id)?.tours).toEqual({ play: 1 })
  })

  it('an older learner gets the short line and no voice; Escape ends it', async () => {
    const id = child(12)
    const user = userEvent.setup()
    render(<Page />)
    await settle()
    expect(screen.getByText('Javobni bos. Xato bo‘lsa, maslahat chiqadi.')).toBeInTheDocument()
    expect(sayText).not.toHaveBeenCalled()
    await user.keyboard('{Escape}')
    expect(screen.queryByTestId('coach-marks')).toBeNull()
    expect(useFamilyStore.getState().children.find((c) => c.id === id)?.tours).toEqual({ play: 1 })
  })

  it('never traps the child: the page under it still works, and a third visit shows nothing', async () => {
    const id = child(6)
    useFamilyStore.getState().updateChild(id, { tours: { play: 2 } })
    render(<Page />)
    await settle()
    expect(screen.queryByTestId('coach-marks')).toBeNull()
    expect(screen.getByRole('button', { name: 'a' })).toBeEnabled()
  })

  it('a child who leaves mid-way has still seen it (no full tour every time)', async () => {
    const id = child(5)
    const page = render(<Page />)
    await settle()
    expect(screen.getByTestId('coach-marks')).toBeInTheDocument()
    page.unmount()
    expect(useFamilyStore.getState().children.find((c) => c.id === id)?.tours).toEqual({ play: 1 })
  })

  it('waits while the robot greets, and keys meant for a field are left alone', async () => {
    child(5)
    const user = userEvent.setup()
    const greeting = document.createElement('div')
    greeting.dataset.testid = 'roam-greeting'
    document.body.append(greeting)
    render(
      <>
        <Page />
        <input aria-label="field" />
      </>,
    )
    await settle()
    expect(screen.queryByTestId('coach-marks')).toBeNull()
    greeting.remove()
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)))
    expect(screen.getByTestId('coach-marks')).toBeInTheDocument()
    await user.click(screen.getByLabelText('field'))
    await user.keyboard('{Escape}')
    expect(screen.getByTestId('coach-marks')).toBeInTheDocument()
  })
})
