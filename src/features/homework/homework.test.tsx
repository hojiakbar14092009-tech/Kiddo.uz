import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { emitActivity } from '@/domain/universe'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { isActivityHomework, useFamilyStore, type ActivityHomework } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { cleanHomeworkInput, countsFor, HOMEWORK_ACTIVITIES, isOverdue } from './activityHomework'
import { HomeworkBridge } from './HomeworkBridge'
import '@/i18n'

/*
 * Phase 23: advanced homework. A parent gives any activity N times; each
 * finished run counts once, only for that child; letters homework still works.
 */

function addKid(name: string) {
  return useFamilyStore
    .getState()
    .addChild({ name, birthDate: birthDateForAge(6, dayKey()), gender: 'girl' })
}

const homeworkOf = (id: string) =>
  (useFamilyStore.getState().children.find((c) => c.id === id)?.homeworks ?? []).filter(
    isActivityHomework,
  ) as ActivityHomework[]

beforeEach(() => {
  useSettingsStore.setState({ language: 'en' })
  useFamilyStore.setState({ children: [], activeChildId: null })
})

describe('activity homework rules', () => {
  it('matches finished runs by activity family', () => {
    expect(countsFor('mathLab', 'math-lab:within10:L3')).toBe(true)
    expect(countsFor('mathLab', 'math:4')).toBe(false)
    expect(countsFor('dinoQuiz', 'dino:quiz:L2')).toBe(true)
    expect(countsFor('dinoQuiz', 'dino:dig:L2')).toBe(false)
    expect(countsFor('feelings', 'feelings:kindness:full')).toBe(true)
    expect(countsFor('story', 'story:lost-lamb')).toBe(true)
    // every activity a parent can choose has a route and counts its own runs
    for (const item of HOMEWORK_ACTIVITIES) expect(item.route.startsWith('/')).toBe(true)
  })

  it('cleans what a parent typed and never punishes a late day', () => {
    expect(cleanHomeworkInput({ times: 9, note: '  Well   done ' })).toEqual({
      times: 5,
      note: 'Well done',
      dueDay: null,
    })
    expect(cleanHomeworkInput({ times: 0, dueDay: 'tomorrow' }).times).toBe(1)
    expect(cleanHomeworkInput({ times: 2, dueDay: '2026-11-02' }).dueDay).toBe('2026-11-02')
    expect(cleanHomeworkInput({ times: 1, note: 'x'.repeat(300) }).note).toHaveLength(120)
    expect(isOverdue({ dueDay: '2026-10-01', completedAt: null }, '2026-10-02')).toBe(true)
    expect(isOverdue({ dueDay: '2026-10-01', completedAt: 'x' }, '2026-10-02')).toBe(false)
    expect(isOverdue({ dueDay: null, completedAt: null }, '2026-10-02')).toBe(false)
  })
})

describe('the family store', () => {
  it('counts each run once, finishes at the count, only for that child', () => {
    const a = addKid('Aziza')
    const b = addKid('Bobur')
    const store = useFamilyStore.getState()
    store.assignActivityHomework(a.id, { target: 'mathLab', times: 2 })
    store.assignActivityHomework(b.id, { target: 'mathLab', times: 1 })
    expect(store.recordHomeworkRun(a.id, 'run-1', 'math-lab:count:L1')).toEqual([])
    // the same run again (reload, double event): not counted twice
    expect(store.recordHomeworkRun(a.id, 'run-1', 'math-lab:count:L1')).toEqual([])
    expect(homeworkOf(a.id)[0]?.runs).toEqual(['run-1'])
    // another activity does not count
    store.recordHomeworkRun(a.id, 'run-2', 'dino:quiz:L2')
    expect(homeworkOf(a.id)[0]?.runs).toEqual(['run-1'])
    const done = store.recordHomeworkRun(a.id, 'run-3', 'math-lab:objects:L2')
    expect(done).toEqual([homeworkOf(a.id)[0]!.id])
    expect(homeworkOf(a.id)[0]?.completedAt).not.toBeNull()
    // after it is done, more runs change nothing
    store.recordHomeworkRun(a.id, 'run-4', 'math-lab:count:L1')
    expect(homeworkOf(a.id)[0]?.runs).toHaveLength(2)
    // the brother's homework is untouched
    expect(homeworkOf(b.id)[0]?.runs).toEqual([])
  })

  it('refuses an activity that is not on the list', () => {
    const a = addKid('Aziza')
    useFamilyStore.getState().assignActivityHomework(a.id, { target: 'other', times: 1 })
    expect(homeworkOf(a.id)).toHaveLength(0)
  })
})

describe('app-wide counting', () => {
  it('a finished activity counts through the domain events', () => {
    const a = addKid('Aziza')
    useFamilyStore.getState().assignActivityHomework(a.id, { target: 'dinoQuiz', times: 1 })
    render(<HomeworkBridge />)
    act(() => {
      emitActivity({
        id: 'quiz-run-1',
        childKey: a.id,
        activity: 'dino:quiz:L2',
        strand: 'science',
        correct: 4,
        total: 5,
        independent: 4,
      })
    })
    expect(homeworkOf(a.id)[0]?.completedAt).not.toBeNull()
    expect(homeworkOf(a.id)[0]?.runs).toEqual(['quiz-run-1'])
  })
})

describe('the child and the parent', () => {
  it('the child sees the homework first on home, with dots and the parent’s word', async () => {
    const a = addKid('Aziza')
    useFamilyStore.getState().setActiveChild(a.id)
    useFamilyStore
      .getState()
      .assignActivityHomework(a.id, { target: 'mathLab', times: 3, note: 'You can do it!' })
    useFamilyStore.getState().recordHomeworkRun(a.id, 'r1', 'math-lab:count:L1')
    const { user, router } = await renderRoute('/home')
    const card = screen.getByTestId('activity-homework')
    expect(card).toHaveAccessibleName('Homework: Math Lab. 2 more to go. You can do it!')
    expect(card).toHaveTextContent('You can do it!')
    expect(within(card).getByTestId('activity-homework-dots').children).toHaveLength(3)
    await user.click(card)
    await waitFor(() => expect(router.state.location.pathname).toBe('/math-lab'))
  })

  it('a parent gives an activity homework and sees its progress', async () => {
    const a = addKid('Aziza')
    const { ActivityHomeworkPanel } =
      await import('@/features/parent/dashboard/ActivityHomeworkPanel')
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <ActivityHomeworkPanel child={a} />
      </MemoryRouter>,
    )
    await user.click(screen.getByTestId('hw-activity-dinoQuiz'))
    await user.click(screen.getByRole('radio', { name: '× 3' }))
    await user.type(screen.getByTestId('hw-note'), 'Dinos!')
    await user.click(screen.getByTestId('hw-activity-assign'))
    expect(screen.getByTestId('hw-activity-status')).toHaveTextContent('Added')
    const [homework] = homeworkOf(a.id)
    expect(homework).toMatchObject({ target: 'dinoQuiz', times: 3, note: 'Dinos!', runs: [] })
  })
})

describe('Parent Center 2.0: the family at a glance', () => {
  it('shows each child’s day and open homework, late ones marked', async () => {
    const a = addKid('Aziza')
    const b = addKid('Bobur')
    useFamilyStore
      .getState()
      .assignActivityHomework(a.id, { target: 'mathLab', times: 1, dueDay: '2020-01-01' })
    act(() => {
      emitActivity({
        id: 'today-1',
        childKey: b.id,
        activity: 'story:lost-lamb',
        strand: 'language',
        correct: 3,
        total: 3,
        independent: 3,
      })
    })
    const { FamilyOverview } = await import('@/features/parent/dashboard/FamilyOverview')
    const kids = useFamilyStore.getState().children
    render(<FamilyOverview family={kids} selectedId={a.id} />)
    const aziza = screen.getByTestId(`family-${a.id}`)
    expect(within(aziza).getByTestId('family-today')).toHaveTextContent('Not played yet today')
    expect(within(aziza).getByTestId('family-homework')).toHaveTextContent('1 past their day')
    const bobur = screen.getByTestId(`family-${b.id}`)
    expect(within(bobur).getByTestId('family-today')).toHaveTextContent('Played today: 1')
    expect(screen.getByTestId(`family-${a.id}`)).toHaveAttribute('aria-current', 'true')
  })
})

describe('runs from another tab or a closed app', () => {
  it('are counted when the app opens, never a run from before the homework', () => {
    const a = addKid('Aziza')
    // a run before the homework was given
    emitActivity({
      id: 'old-run',
      childKey: a.id,
      activity: 'math-lab:count:L1',
      strand: 'number',
      correct: 5,
      total: 5,
      independent: 5,
      at: new Date(Date.now() - 60_000).toISOString(),
    })
    useFamilyStore.getState().assignActivityHomework(a.id, { target: 'mathLab', times: 2 })
    // a run finished while no bridge was listening (another tab, a closed app)
    emitActivity({
      id: 'new-run',
      childKey: a.id,
      activity: 'math-lab:count:L1',
      strand: 'number',
      correct: 5,
      total: 5,
      independent: 5,
      at: new Date(Date.now() + 60_000).toISOString(),
    })
    expect(homeworkOf(a.id)[0]?.runs).toEqual([])
    render(<HomeworkBridge />)
    expect(homeworkOf(a.id)[0]?.runs).toEqual(['new-run'])
  })
})
