import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TutorReply, TutorRequest } from '@/domain/tutor'
import '@/i18n'
import { TutorPanel } from './TutorPanel'
import { useTutorReply } from './useTutorReply'

const ai = vi.hoisted(() => ({
  availability: 'ready' as string,
  resolve: null as ((reply: TutorReply | null) => void) | null,
  calls: [] as TutorRequest[],
}))

vi.mock('@/domain/tutor', async (original) => ({
  ...(await original<typeof import('@/domain/tutor')>()),
  aiAvailability: () => ai.availability,
  askTutorAI: (request: TutorRequest) => {
    ai.calls.push(request)
    return new Promise<TutorReply | null>((resolve) => {
      ai.resolve = resolve
    })
  },
}))

const REQUEST: TutorRequest = {
  v: 1,
  childId: 'kid',
  language: 'uz',
  band: 'intermediate',
  persona: 'kidobot',
  intent: 'hint',
  hintLevel: 2,
  item: { skill: 'add:within20', task: 'add', expression: '8 + 7 = ?', answer: '15' },
}

function Harness() {
  const tutor = useTutorReply()
  return (
    <div>
      <button onClick={() => tutor.show(2, 'Kiddo’s own hint', () => REQUEST)}>hint</button>
      <button onClick={() => tutor.show(3, 'Next step', null)}>local</button>
      <button onClick={() => tutor.clear()}>next question</button>
      {tutor.view && (
        <TutorPanel
          level={tutor.view.level}
          message={tutor.view.message}
          source={tutor.view.source}
          thinking={tutor.thinking}
          onMore={() => undefined}
        />
      )}
    </div>
  )
}

describe('tutor reply in an activity', () => {
  beforeEach(() => {
    ai.availability = 'ready'
    ai.resolve = null
    ai.calls = []
  })

  it('shows Kiddo’s hint at once, thinks, then a checked AI reply marked as AI', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('hint'))
    expect(screen.getByTestId('tutor-message')).toHaveTextContent('Kiddo’s own hint')
    expect(screen.getByTestId('tutor-thinking')).toHaveTextContent('O‘ylayapman…')
    expect(screen.queryByTestId('tutor-ai')).not.toBeInTheDocument()
    await act(async () => {
      ai.resolve?.({
        message: 'Avval 8 ga 2 ni qo‘sh.',
        emotion: 'calm',
        hintLevel: 2,
        recommendedAction: 'retry',
      })
    })
    expect(screen.getByTestId('tutor-message')).toHaveTextContent('Avval 8 ga 2 ni qo‘sh.')
    expect(screen.getByTestId('tutor-ai')).toHaveTextContent('AI yordamchi')
    expect(screen.queryByTestId('tutor-thinking')).not.toBeInTheDocument()
  })

  it('AI unavailable (quota, timeout, refusal): the local hint stays, no error text', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('hint'))
    await act(async () => ai.resolve?.(null))
    expect(screen.getByTestId('tutor-message')).toHaveTextContent('Kiddo’s own hint')
    expect(screen.getByTestId('lab-help')).toHaveAttribute('data-source', 'local')
    expect(screen.queryByTestId('tutor-thinking')).not.toBeInTheDocument()
  })

  it('without consent or a server there is no request and no thinking sign', async () => {
    ai.availability = 'off'
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('hint'))
    expect(ai.calls).toHaveLength(0)
    expect(screen.queryByTestId('tutor-thinking')).not.toBeInTheDocument()
  })

  it('a late AI reply never lands on a newer hint or the next question', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('hint'))
    const late = ai.resolve
    await user.click(screen.getByText('local'))
    await act(async () =>
      late?.({ message: 'Old reply', emotion: 'calm', hintLevel: 2, recommendedAction: 'retry' }),
    )
    expect(screen.getByTestId('tutor-message')).toHaveTextContent('Next step')
    await user.click(screen.getByText('next question'))
    expect(screen.queryByTestId('tutor-message')).not.toBeInTheDocument()
  })
})
