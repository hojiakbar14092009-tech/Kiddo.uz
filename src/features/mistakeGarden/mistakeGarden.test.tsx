import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GUEST_KEY } from '@/domain/childKey'
import { recordEvidence, useLearningMemoryStore, type Evidence } from '@/domain/learningMemory'
import { useUniverseStore } from '@/domain/universe'
import { installProgression } from '@/domain/universe/progression'
import { planSession } from '@/features/mathLab/generators'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import type { Language } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { resetSeen } from './seenStages'
import { NAMED_MATH_SKILLS, skillNameKey } from './skillName'

const T0 = Date.parse('2026-10-10T09:00:00.000Z')
const at = (hours: number) => new Date(T0 + hours * 3_600_000).toISOString()
let n = 0
function ev(childKey: string, skill: string, over: Partial<Evidence>) {
  n += 1
  recordEvidence(childKey, {
    id: `g${n}|q`,
    skill,
    item: `add:${n % 9}+1`,
    at: at(0),
    firstTry: true,
    helpedBefore: false,
    errors: [],
    maxHint: 0,
    review: false,
    level: 2,
    ...over,
  })
}
const wrong = (child: string, skill: string, hours: number) =>
  ev(child, skill, { at: at(hours), firstTry: false, errors: ['off-by-one'], maxHint: 1 })

/** A real difficulty (two items, two sessions), then what the child did after it. */
function grow(child: string, skill: string, stage: 'seed' | 'sprout' | 'plant' | 'bloom') {
  wrong(child, skill, 0)
  wrong(child, skill, 1)
  if (stage === 'sprout') ev(child, skill, { at: at(2) })
  if (stage === 'plant' || stage === 'bloom') {
    ev(child, skill, { at: at(2) })
    ev(child, skill, { at: at(3) })
  }
  if (stage === 'bloom') {
    ev(child, skill, { at: at(4) })
    ev(child, skill, { at: at(30), review: true })
  }
}

let stop: () => void
beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useLearningMemoryStore.setState({ byChild: {} })
  resetSeen()
  stop = installProgression()
})
afterEach(() => stop())

describe('Mistake Garden page', () => {
  it('an empty garden is calm, never empty-sad, and invents no plants', async () => {
    await renderRoute('/mistake-garden')
    expect(screen.getByTestId('garden-empty')).toHaveTextContent('Hozir bog‘ing tinch')
    expect(screen.queryAllByTestId('garden-plant')).toHaveLength(0)
    expect(screen.getByTestId('garden-guest')).toBeInTheDocument()
  })

  it('one plant per skill, named for a child, with its stage from the memory', async () => {
    grow(GUEST_KEY, 'math:add:within10', 'seed')
    grow(GUEST_KEY, 'math:sub:within10', 'sprout')
    grow(GUEST_KEY, 'math:missing:add', 'plant')
    grow(GUEST_KEY, 'math:count:to5', 'bloom')
    await renderRoute('/mistake-garden')
    const plants = screen.getAllByTestId('garden-plant')
    const stageOf = Object.fromEntries(
      plants.map((plant) => [plant.dataset.skill, plant.dataset.stage]),
    )
    expect(stageOf).toEqual({
      'math:add:within10': 'seed',
      'math:sub:within10': 'sprout',
      'math:missing:add': 'plant',
      'math:count:to5': 'bloom',
    })
    const byName = (skill: string) => plants.find((plant) => plant.dataset.skill === skill)!
    expect(byName('math:add:within10')).toHaveAccessibleName('10 gacha qo‘shish — Urug‘')
    expect(byName('math:count:to5')).toHaveAccessibleName('5 gacha sanash — Gul')
    expect(document.body.textContent).not.toMatch(/math:|within10|missing:add/)
  })

  it('the plant card says what grows it and links to the existing practice', async () => {
    grow(GUEST_KEY, 'math:add:within10', 'sprout')
    grow(GUEST_KEY, 'math:count:to5', 'bloom')
    await renderRoute('/mistake-garden')
    fireEvent.click(screen.getAllByTestId('garden-plant')[0]!)
    const sheet = screen.getByTestId('plant-sheet')
    expect(within(sheet).getByTestId('plant-sheet-next')).toHaveTextContent(
      'Yana 1 ta misolni ketma-ket o‘zing yechsang, o‘simlik o‘sadi.',
    )
    expect(within(sheet).getByTestId('plant-practise')).toHaveAttribute(
      'href',
      '/math-lab?practice=add%3Awithin10',
    )
    fireEvent.click(within(sheet).getByRole('button', { name: 'Yopish' }))
    fireEvent.click(screen.getAllByTestId('garden-plant')[1]!)
    const bloom = screen.getByTestId('plant-sheet')
    expect(within(bloom).getByText('Men buni o‘rgandim!')).toBeInTheDocument()
    expect(within(bloom).queryByTestId('plant-practise')).toBeNull()
  })

  it('a plant that grew since the child last looked plays its growth once', async () => {
    grow(GUEST_KEY, 'math:add:within10', 'seed')
    const first = await renderRoute('/mistake-garden')
    expect(screen.getByTestId('garden-plant')).not.toHaveAttribute('data-grew')
    first.unmount()
    // practice in Math Lab: one independent answer (evidence, not a button in the garden)
    ev(GUEST_KEY, 'math:add:within10', { at: at(5) })
    await renderRoute('/mistake-garden')
    const plant = screen.getByTestId('garden-plant')
    expect(plant).toHaveAttribute('data-stage', 'sprout')
    expect(plant).toHaveAttribute('data-grew', 'true')
  })

  it('child A’s plants never show for child B', async () => {
    useFamilyStore.setState({
      children: [
        { id: 'kid-a', name: 'Ali', age: 5 },
        { id: 'kid-b', name: 'Bona', age: 5 },
      ] as never,
      activeChildId: 'kid-a',
    })
    grow('kid-a', 'math:add:within10', 'plant')
    await renderRoute('/mistake-garden')
    expect(screen.getByTestId('garden-plant')).toHaveAttribute('data-stage', 'plant')
    act(() => useFamilyStore.setState({ activeChildId: 'kid-b' }))
    expect(screen.queryAllByTestId('garden-plant')).toHaveLength(0)
    expect(screen.getByTestId('garden-empty')).toBeInTheDocument()
  })

  const NEGATIVE =
    /xato|yomon|zaif|muvaffaqiyatsiz|ошиб|плох|слаб|неудач|провал|mistake|wrong|fail|weak|bad\b/i

  it.each(['uz', 'ru', 'en'] as Language[])(
    'speaks positively in %s, in the garden and in every card',
    async (language) => {
      useSettingsStore.setState({ language })
      grow(GUEST_KEY, 'math:add:within10', 'seed')
      grow(GUEST_KEY, 'math:sub:within10', 'sprout')
      grow(GUEST_KEY, 'math:missing:add', 'plant')
      grow(GUEST_KEY, 'math:count:to5', 'bloom')
      await renderRoute('/mistake-garden')
      const texts = [document.body.textContent ?? '']
      for (const plant of screen.getAllByTestId('garden-plant')) {
        fireEvent.click(plant)
        texts.push(screen.getByTestId('plant-sheet').textContent ?? '')
        fireEvent.click(within(screen.getByTestId('plant-sheet')).getAllByRole('button').at(-1)!)
      }
      for (const text of texts) {
        expect(text).not.toMatch(NEGATIVE)
        expect(text).not.toMatch(/practiceGarden\./)
      }
    },
  )
})

describe('skill names', () => {
  it('every skill Math Lab practises has a child name in all three languages', () => {
    const skills = new Set<string>()
    for (const level of [1, 2, 3, 4, 5] as const) {
      for (let seed = 1; seed <= 40; seed += 1) {
        let state = seed
        const rng = () => {
          state = (state * 9301 + 49297) % 233280
          return state / 233280
        }
        for (const q of planSession(level, rng)) skills.add(q.skill)
      }
    }
    // every practised skill is named (the list may also name rarer ones)
    for (const skill of skills) expect(NAMED_MATH_SKILLS as readonly string[]).toContain(skill)
    for (const texts of [uz, ru, en]) {
      const names = texts.practiceGarden.skills as Record<string, string>
      for (const skill of NAMED_MATH_SKILLS) {
        const key = skillNameKey(`math:${skill}`).replace('practiceGarden.skills.', '')
        expect(names[key], `${skill}`).toBeTruthy()
      }
    }
    expect(skillNameKey('math:unknown:thing')).toBe('practiceGarden.skills.fallback')
  })
})

describe('Math Lab practice from the garden', () => {
  it('the chosen skill is practised (a related review item) and the way back leads to the garden', async () => {
    grow(GUEST_KEY, 'math:add:within10', 'seed')
    await renderRoute('/math-lab?practice=add:within10')
    fireEvent.click(screen.getByTestId('lab-start'))
    // level 2: the hands-on basket first, then the garden's skill as a review
    const basket = screen.getByTestId('lab-question')
    expect(basket).not.toHaveAttribute('data-review')
    const count = Number(basket.getAttribute('data-answer'))
    for (let i = 0; i < count; i += 1) fireEvent.click(screen.getAllByTestId('lab-object')[0]!)
    fireEvent.click(screen.getByTestId('lab-done'))
    await vi.waitFor(
      () => expect(screen.getByTestId('lab-question')).toHaveAttribute('data-step', '1'),
      {
        timeout: 4_000,
      },
    )
    expect(screen.getByTestId('lab-question')).toHaveAttribute('data-review', 'true')
    expect(screen.getByTestId('lab-question')).toHaveAttribute('data-kind', 'add')
  })

  it('anything that is not a skill key is ignored', async () => {
    await renderRoute('/math-lab?practice=%3Cscript%3E')
    fireEvent.click(screen.getByTestId('lab-start'))
    expect(screen.getByTestId('lab-question')).toBeInTheDocument()
  })
})
