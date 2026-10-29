import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Learn Before Play: goes through a lesson deck to its "let's play" button. */
export async function passLesson(user: UserEvent) {
  await screen.findByTestId('lesson-deck')
  while (screen.queryByTestId('lesson-next')) await user.click(screen.getByTestId('lesson-next'))
  await user.click(screen.getByTestId('lesson-start'))
}

/** A letter game introduces a letter the child has not met: says hello to it and goes on. */
export async function meetNewLetter(user: UserEvent) {
  const go = screen.queryByTestId('letter-intro-go')
  if (go) await user.click(go)
}

/**
 * For tests about something else in the Math Lab (the tutor, levels, the
 * garden): every skill counts as already met, so no worked example comes
 * first. Use inside `vi.mock('@/features/learn/learnStore', mathSkillsMet)`.
 */
export async function mathSkillsMet(importOriginal: () => Promise<unknown>) {
  const actual = (await importOriginal()) as typeof import('@/features/learn/learnStore')
  return {
    ...actual,
    hasSeenLesson: (learn: Parameters<typeof actual.hasSeenLesson>[0], id: string) =>
      id.startsWith('math.') || actual.hasSeenLesson(learn, id),
  }
}
