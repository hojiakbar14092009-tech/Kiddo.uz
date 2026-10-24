import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useRewardStore } from '@/domain/rewards'
import { useLearningMemoryStore } from '@/domain/learningMemory'
import {
  emitActivity,
  getResources,
  grantResource,
  useUniverseStore,
  type ActivityCompleted,
} from '@/domain/universe'
import { installProgression, progressOf } from '@/domain/universe/progression'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

let counter = 0
function run(over: Partial<ActivityCompleted>): ActivityCompleted {
  counter += 1
  return {
    id: `ui-run-${counter}`,
    childKey: GUEST_KEY,
    activity: 'math-lab:count:L1',
    strand: 'number',
    correct: 5,
    total: 5,
    independent: 5,
    at: new Date().toISOString(),
    ...over,
  }
}

let stop: () => void
beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
  useLearningMemoryStore.setState({ byChild: {} })
  stop = installProgression()
})
afterEach(() => stop())

describe('the journey card on the home screen', () => {
  it('announces the reward and sends the child to the current step', async () => {
    await renderRoute('/home')
    const card = screen.getByTestId('journey-card')
    expect(within(card).getByText('Oxirida kristall: +2')).toBeInTheDocument()
    expect(within(card).getByText('0 / 6 qadam')).toBeInTheDocument()
    expect(within(card).getByTestId('journey-go')).toHaveAttribute('href', '/math-lab')
    act(() => void emitActivity(run({})))
    expect(within(card).getByText('1 / 6 qadam')).toBeInTheDocument()
    expect(within(card).getByTestId('journey-go')).toHaveAttribute('href', '/spaceport')
    expect(within(card).getByText('Matematikada 3 yulduz ol: bajarildi')).toBeInTheDocument()
  })

  it('shows the Science Lab closed in the city, with what opens it', async () => {
    await renderRoute('/home')
    const lab = screen.getByTestId('building-/science-lab')
    expect(within(lab).getByText('Mars guli ochilganda ochiladi')).toBeInTheDocument()
    expect(within(lab).getByRole('link')).toHaveAttribute('data-locked', 'true')
  })
})

describe('Spaceport and Mars', () => {
  it('the rocket is built from what maths earned, then Mars opens and gives the seed once', async () => {
    await renderRoute('/spaceport')
    expect(screen.getByTestId('rocket-level')).toHaveTextContent('Raketa hali qurilmagan')
    expect(screen.queryByTestId('build-rocket')).not.toBeInTheDocument()
    act(() => void emitActivity(run({})))
    fireEvent.click(screen.getByTestId('build-rocket'))
    expect(screen.getByTestId('rocket-level')).toHaveTextContent('Raketa: 1-daraja')
    expect(screen.getByTestId('fly-mars')).toHaveAttribute('href', '/spaceport/mars')
  })

  it('Mars is closed without the rocket', async () => {
    await renderRoute('/spaceport/mars')
    expect(screen.getByTestId('mars-locked')).toBeInTheDocument()
  })

  it('every rock can be turned; the last one holds the seed', async () => {
    grantResource({ childKey: GUEST_KEY, resource: 'crystal', amount: 1, reason: 't', refId: 'c' })
    grantResource({ childKey: GUEST_KEY, resource: 'part', amount: 1, reason: 't', refId: 'p' })
    const { upgradeBuilding } = await import('@/domain/universe')
    upgradeBuilding(GUEST_KEY, 'spaceport')
    await renderRoute('/spaceport/mars')
    fireEvent.click(screen.getByTestId('mars-rock-2'))
    expect(screen.getByText('Bu yerda faqat qizil chang.')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('mars-rock-0'))
    fireEvent.click(screen.getByTestId('mars-rock-1'))
    fireEvent.click(screen.getByTestId('take-seed'))
    expect(screen.getByTestId('mars-found')).toBeInTheDocument()
    expect(getResources(GUEST_KEY).seed).toBe(1)
  })
})

describe('Practice (Mistake) Garden and Science Lab', () => {
  it('plants the Mars seed, grows it with science runs, and opens the lab', async () => {
    const universe = await import('@/domain/universe')
    const progression = await import('@/domain/universe/progression')
    universe.emitActivity(run({}))
    universe.upgradeBuilding(GUEST_KEY, 'spaceport')
    progression.discoverArtifact(GUEST_KEY, 'mars-seed')
    await renderRoute('/mistake-garden')
    expect(screen.getByTestId('garden-empty')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('plant-seed'))
    expect(screen.getByTestId('mars-bed')).toHaveAttribute('data-stage', '0')
    expect(screen.getByRole('link', { name: 'Bog‘ darsi' })).toHaveAttribute(
      'href',
      '/learn/garden',
    )
    act(() => {
      for (const activity of ['garden:1', 'garden:2', 'dino:quiz']) {
        universe.emitActivity(run({ activity, strand: 'science' }))
      }
    })
    expect(screen.getByTestId('mars-bed')).toHaveAttribute('data-stage', '3')
    expect(screen.getByRole('link', { name: 'Laboratoriyaga' })).toHaveAttribute(
      'href',
      '/science-lab',
    )
    expect(progressOf(GUEST_KEY).unlocked['science-lab']).toBeDefined()
  })

  it('a tricky skill from the learning memory is a seed to practise, never a failure', async () => {
    const { recordEvidence } = await import('@/domain/learningMemory')
    for (const [n, item] of [
      [1, 'add:3+4'],
      [2, 'add:2+5'],
    ] as const) {
      recordEvidence(GUEST_KEY, {
        id: `r${n}|q${n}`,
        skill: 'math:add:within10',
        item,
        at: new Date(Date.UTC(2026, 9, 24, 9, n)).toISOString(),
        firstTry: false,
        helpedBefore: false,
        review: false,
        errors: ['off-by-one'],
        maxHint: 0,
      })
    }
    await renderRoute('/mistake-garden')
    const plant = screen.getByTestId('garden-plant')
    expect(plant).toHaveAttribute('data-stage', 'seed')
    expect(within(plant).getByText('10 gacha qo‘shish')).toBeInTheDocument()
    expect(within(plant).getByText('Urug‘')).toBeInTheDocument()
  })

  it('the lab is closed until the bloom', async () => {
    await renderRoute('/science-lab')
    expect(screen.getByTestId('lab-locked')).toBeInTheDocument()
  })

  it('the experiment counts first-try answers and finishes the journey once', async () => {
    const universe = await import('@/domain/universe')
    const progression = await import('@/domain/universe/progression')
    universe.emitActivity(run({}))
    universe.upgradeBuilding(GUEST_KEY, 'spaceport')
    progression.discoverArtifact(GUEST_KEY, 'mars-seed')
    progression.plantSeed(GUEST_KEY, 'mars')
    for (const activity of ['garden:1', 'garden:2', 'dino:quiz']) {
      universe.emitActivity(run({ activity, strand: 'science' }))
    }
    await renderRoute('/science-lab')
    fireEvent.click(screen.getByTestId('lab-start'))
    fireEvent.click(screen.getByTestId('lab-option-milk'))
    expect(screen.getByText('Yana bir o‘ylab ko‘r.')).toBeInTheDocument()
    for (const answer of ['droplet', 'sun', 'sunflower', 'seedling']) {
      fireEvent.click(screen.getByTestId(`lab-option-${answer}`))
    }
    expect(screen.getByTestId('lab-finished')).toBeInTheDocument()
    expect(progressOf(GUEST_KEY).completed['first-flight']).toBeDefined()
    const journey = universe
      .resourceHistory(GUEST_KEY)
      .filter((entry) => entry.reason === 'journey')
    expect(journey).toHaveLength(1)
  })
})
