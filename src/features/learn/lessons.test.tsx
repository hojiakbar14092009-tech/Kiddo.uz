import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ACTIVITY_LESSONS, letterLessonId } from '@/domain/learning'
import { useFamilyStore } from '@/store/familyStore'
import { getAlphabet } from '@/content/alphabet'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { passLesson } from '@/test/lesson'
import { renderRoute } from '@/test/renderRoute'
import { getLearnChild, hasSeenLesson, useLearnStore } from './learnStore'

/*
 * Phase 21, Learn Before Play: a game that asks about something shows it
 * first; the lesson is remembered per child; "learn again" brings it back.
 */

beforeEach(() => {
  useSettingsStore.setState({ language: 'en' })
  useLearnStore.setState({ byChild: {} })
  useProgressStore.setState({ byChild: {} })
})

describe('seen lessons', () => {
  it('are kept per child, once, beside the taught stages', () => {
    const { markLesson, markStage } = useLearnStore.getState()
    markStage('a', 'space', 'en', '4')
    markLesson('a', ACTIVITY_LESSONS.uzMap)
    markLesson('a', ACTIVITY_LESSONS.uzMap)
    expect(getLearnChild('a').stages.lessons).toEqual(['uz.map'])
    expect(getLearnChild('a').stages['space|en']).toEqual(['4'])
    expect(hasSeenLesson(getLearnChild('a'), ACTIVITY_LESSONS.uzMap)).toBe(true)
    // another child has not seen it
    expect(hasSeenLesson(getLearnChild('b'), ACTIVITY_LESSONS.uzMap)).toBe(false)
    expect(letterLessonId('uz', 'a')).toBe('letter.uz.a')
  })
})

describe('the games teach first', () => {
  it('the map game shows the labelled map first, then plays; next time it plays at once', async () => {
    const first = await renderRoute('/worlds/uzbekistan/map')
    expect(screen.getByTestId('lesson-deck')).toHaveAttribute('data-card', 'map')
    expect(screen.getByTestId('lesson-map')).toBeInTheDocument()
    expect(screen.queryByTestId('uz-city')).not.toBeInTheDocument()
    await passLesson(first.user)
    expect(screen.getAllByTestId('uz-city').length).toBeGreaterThan(0)
    first.unmount()

    await renderRoute('/worlds/uzbekistan/map')
    expect(screen.queryByTestId('lesson-deck')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('uz-city').length).toBeGreaterThan(0)
  })

  it('the dino quiz can be learned again from its start card', async () => {
    useLearnStore.getState().markLesson('guest', ACTIVITY_LESSONS.dinoAnimals)
    act(() => useFamilyStore.setState({ activeChildId: null }))
    const { user } = await renderRoute('/worlds/dino/quiz')
    // seen by this child: the start card comes straight away
    expect(screen.queryByTestId('lesson-deck')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('lesson-review'))
    expect(screen.getByTestId('lesson-deck')).toHaveAttribute('data-lesson', 'dino.animals')
    await user.click(screen.getByTestId('lesson-next'))
    await user.click(screen.getByTestId('lesson-back'))
    expect(screen.getByTestId('lesson-deck')).toHaveAttribute('data-card', 'trex')
    await passLesson(user)
    expect(screen.getByTestId('quiz-start')).toBeInTheDocument()
  })

  it('a letter game shows a new letter before asking about it; an opened letter is not shown again', async () => {
    act(() => useFamilyStore.setState({ activeChildId: null }))
    const first = await renderRoute('/tasks/find-letter')
    const intro = screen.getByTestId('letter-intro')
    const id = intro.dataset.letter!
    expect(screen.queryByTestId('task-options')).not.toBeInTheDocument()
    await first.user.click(screen.getByTestId('letter-intro-go'))
    expect(screen.getByTestId('task-options')).toHaveAttribute('data-answer', id)
    first.unmount()

    // every letter met (in the alphabet, say): the game asks at once
    for (const letter of getAlphabet('en').letters) {
      useLearnStore.getState().markLesson('guest', letterLessonId('en', letter.id))
    }
    await renderRoute('/tasks/find-letter')
    expect(screen.queryByTestId('letter-intro')).not.toBeInTheDocument()
    expect(screen.getByTestId('task-options')).toBeInTheDocument()
  })

  it('a letter is met when the child finds it on its page, not just by opening the page', async () => {
    act(() => useFamilyStore.setState({ activeChildId: null }))
    const { user } = await renderRoute('/alphabet/b')
    const met = () => hasSeenLesson(getLearnChild('guest'), letterLessonId('en', 'b'))
    expect(met()).toBe(false)
    // a wrong tap: look again, still not met
    await user.click(screen.getByTestId('letter-check-other'))
    expect(met()).toBe(false)
    expect(screen.getByText('Look again — that is a different letter.')).toBeInTheDocument()
    await user.click(screen.getByTestId('letter-check-right'))
    expect(met()).toBe(true)
    expect(screen.getByTestId('letter-check')).toHaveAttribute('data-met', 'true')
  })

  it('a lesson counts only after its short check: find the first card again', async () => {
    act(() => useFamilyStore.setState({ activeChildId: null }))
    const { user } = await renderRoute('/worlds/dino/dig')
    while (screen.queryByTestId('lesson-next')) await user.click(screen.getByTestId('lesson-next'))
    // the way to the game appears only after the check
    expect(screen.queryByTestId('lesson-start')).toBeNull()
    await user.click(screen.getByTestId('lesson-check-other'))
    expect(screen.queryByTestId('lesson-start')).toBeNull()
    expect(screen.getByText('Look again — that is a different one.')).toBeInTheDocument()
    await user.click(screen.getByTestId('lesson-check-right'))
    expect(screen.getByTestId('lesson-check')).toHaveAttribute('data-done', 'true')
    await user.click(screen.getByTestId('lesson-start'))
    expect(screen.getByTestId('dig-start')).toBeInTheDocument()
  })

  it('the fossil dig shares the dinosaur lesson (bones and who was longest)', async () => {
    act(() => useFamilyStore.setState({ activeChildId: null }))
    const { user } = await renderRoute('/worlds/dino/dig')
    expect(screen.getByTestId('lesson-deck')).toHaveAttribute('data-lesson', 'dino.animals')
    // the first animal's card says what a dig finds of it
    expect(screen.getByTestId('lesson-deck')).toHaveTextContent(
      'In a dig we find: a skull with sharp teeth.',
    )
    await passLesson(user)
    expect(screen.getByTestId('dig-start')).toBeInTheDocument()
  })

  it('a lesson one child saw is still shown to a brother or sister', async () => {
    const family = useFamilyStore.getState()
    const ali = family.addChild({ name: 'Ali', birthDate: '2020-01-01', gender: 'boy' })
    const vali = family.addChild({ name: 'Vali', birthDate: '2020-01-01', gender: 'boy' })
    useLearnStore.getState().markLesson(ali.id, ACTIVITY_LESSONS.uzMap)
    act(() => useFamilyStore.setState({ activeChildId: ali.id }))
    const first = await renderRoute('/worlds/uzbekistan/map')
    expect(screen.queryByTestId('lesson-deck')).not.toBeInTheDocument()
    first.unmount()
    act(() => useFamilyStore.setState({ activeChildId: vali.id }))
    await renderRoute('/worlds/uzbekistan/map')
    expect(screen.getByTestId('lesson-deck')).toBeInTheDocument()
    act(() => useFamilyStore.setState({ children: [], activeChildId: null }))
  })

  it('a letter just introduced is practised but not counted as learned yet', () => {
    const outcome = useProgressStore.getState().completeTask('guest', {
      type: 'find-letter',
      language: 'en',
      letterIds: ['a', 'b'],
      mistakeDetails: [],
      introduced: ['a'],
    })
    expect(outcome).toBeDefined()
    expect(useProgressStore.getState().byChild.guest?.learned.en).toEqual(['b'])
  })

  it('the Math Lab shows a worked example of a new skill, then asks another item of it', async () => {
    act(() => useFamilyStore.setState({ activeChildId: null }))
    const { user } = await renderRoute('/math-lab')
    await user.click(screen.getByTestId('lab-start'))
    const intro = screen.getByTestId('lab-intro')
    const skill = intro.dataset.skill!
    expect(screen.getByTestId('lab-intro-answer')).toHaveTextContent(/\S/)
    expect(screen.queryByTestId('lab-question')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('lab-intro-go'))
    expect(hasSeenLesson(getLearnChild('guest'), `math.${skill}`)).toBe(true)
    expect(screen.queryByTestId('lab-intro')).not.toBeInTheDocument()
    expect(screen.getByTestId('lab-question')).toBeInTheDocument()
  })
})
