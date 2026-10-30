import { expect, test, type Page } from '@playwright/test'
import { passMathExample } from './lesson.ts'
import {
  applyEvidence,
  type Evidence,
  type SkillMemory,
} from '../src/domain/learningMemory/memory.ts'

/*
 * Phase 16 QA: the Mistake Garden is a view of the learning memory. Plants
 * are seeded from real evidence (the same pure rules the app runs) and grow
 * only through answers in Math Lab, never through a button in the garden.
 * Flows: A seed, B practice → sprout, C retained independent success → bloom,
 * D same after a reload, E child isolation; localization and viewports.
 */

const HOUR = 3_600_000

/** A skill's memory after a real difficulty (two items, two sessions) and what came after. */
function memoryOf(skill: string, stage: 'seed' | 'plant' | 'bloom', hoursAgo = 72): SkillMemory {
  const start = Date.now() - hoursAgo * HOUR
  const at = (h: number) => new Date(start + h * HOUR).toISOString()
  let n = 0
  const ev = (over: Partial<Evidence>): Evidence => {
    n += 1
    return {
      id: `seed-${skill}-${n}|q`,
      skill,
      item: `add:${n}+3`,
      at: at(n),
      firstTry: true,
      helpedBefore: false,
      errors: [],
      maxHint: 0,
      review: false,
      level: 2,
      ...over,
    }
  }
  const list = [
    ev({ firstTry: false, errors: ['off-by-one'], maxHint: 1 }),
    ev({ firstTry: false, errors: ['off-by-one'], maxHint: 1 }),
  ]
  if (stage !== 'seed') list.push(ev({}), ev({}))
  if (stage === 'bloom') list.push(ev({}), ev({ at: at(40), review: true }))
  let memory: SkillMemory | undefined
  for (const e of list) memory = applyEvidence(memory, e)
  return memory!
}

interface Seed {
  language?: 'uz' | 'ru' | 'en'
  active?: 'kid-a' | 'kid-b'
  memory: Record<string, Record<string, SkillMemory>>
}

/** A family of two five-year-olds and their learning memory, as the app saves them (once per tab). */
async function seed(page: Page, data: Seed) {
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('kiddo.e2e.tours', 'off')
    Math.random = () => 0
    const put = (key: string, state: unknown, version = 1) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language: data.language ?? 'uz', volume: 0.8 })
    const born = new Date()
    born.setFullYear(born.getFullYear() - 5)
    born.setDate(born.getDate() - 30)
    const child = (id: string, name: string) => ({
      id,
      name,
      birthDate: born.toISOString().slice(0, 10),
      celebratedLevel: 5,
      gender: 'girl',
      mascot: 'girl',
      dailyLimitMinutes: 600,
      createdAt: new Date().toISOString(),
      homeworks: [],
    })
    put(
      'kiddo.family',
      {
        children: [child('kid-a', 'Aziza'), child('kid-b', 'Bobur')],
        activeChildId: data.active ?? 'kid-a',
      },
      3,
    )
    const byChild: Record<string, unknown> = {}
    for (const [id, skills] of Object.entries(data.memory)) byChild[id] = { skills, processed: [] }
    put('kiddo.learning-memory', { byChild })
  }, data)
  await page.addInitScript(() => {
    Math.random = () => 0
  })
}

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

async function answerRight(page: Page) {
  await passMathExample(page)
  const question = page.getByTestId('lab-question')
  const kind = await question.getAttribute('data-kind')
  const answer = (await question.getAttribute('data-answer'))!
  if (kind === 'drag') {
    for (let i = 0; i < Number(answer); i += 1) await page.getByTestId('lab-object').first().click()
    await expect(page.getByTestId('lab-basket')).toHaveAttribute('data-count', answer)
    await page.getByTestId('lab-done').click()
    return
  }
  const label = SIGN_LABEL[answer]
  await (
    label
      ? question.getByRole('button', { name: label, exact: true })
      : question
          .getByRole('button', { name: answer, exact: true })
          .or(question.getByRole('button', { name: new RegExp(`^${answer} ta `) }))
  ).click()
}

/** From a plant's card into Math Lab, a whole session answered on one's own, and back to the garden. */
async function practise(page: Page, skill: string) {
  await page.locator(`[data-testid="garden-plant"][data-skill="${skill}"]`).click()
  await page.getByTestId('plant-practise').click()
  await expect(page).toHaveURL(/\/math-lab\?practice=/)
  await page.getByTestId('lab-start').click()
  let reviewed = false
  for (let step = 0; step < 5; step += 1) {
    await passMathExample(page, step)
    const question = page.getByTestId('lab-question')
    await expect(question).toHaveAttribute('data-step', String(step))
    if ((await question.getAttribute('data-review')) === 'true') reviewed = true
    await answerRight(page)
  }
  expect(reviewed).toBe(true)
  await page.getByTestId('lab-to-garden').click()
  await expect(page).toHaveURL(/\/mistake-garden$/)
}

const plant = (page: Page, skill: string) =>
  page.locator(`[data-testid="garden-plant"][data-skill="${skill}"]`)

test('A, B, D, E: a seed from real difficulty, practice grows it, it stays, and it is only this child’s', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await seed(page, {
    memory: { 'kid-a': { 'math:add:within10': memoryOf('math:add:within10', 'seed', 4) } },
  })
  await page.goto('/mistake-garden')

  // A: the garden shows the seed, named for a child
  await expect(plant(page, 'math:add:within10')).toHaveAttribute('data-stage', 'seed')
  await expect(plant(page, 'math:add:within10')).toHaveAccessibleName('10 gacha qo‘shish — Urug‘')

  // B: practice in Math Lab (opening it alone grows nothing); answers grow it
  await plant(page, 'math:add:within10').click()
  await expect(page.getByTestId('plant-sheet-next')).toHaveText(
    'Bir marta mashq qil – urug‘ unib chiqadi.',
  )
  await page.getByRole('button', { name: 'Yopish' }).click()
  await practise(page, 'math:add:within10')
  const grown = plant(page, 'math:add:within10')
  await expect(grown).toHaveAttribute('data-grew', 'true')
  // it grew (a sprout or a growing plant), but no flower yet: the last mistake was
  // only hours ago, so the look a day later (retention) is still to come
  const stage = await grown.getAttribute('data-stage')
  expect(['sprout', 'plant']).toContain(stage)
  await grown.click()
  if (stage === 'plant') {
    await expect(page.getByTestId('plant-sheet-next')).toContainText('Ertaga')
  }
  await page.getByRole('button', { name: 'Yopish' }).click()

  // D: a reload (a new session) shows the same plant at the same stage
  await page.reload()
  await expect(plant(page, 'math:add:within10')).toHaveAttribute('data-stage', stage!)

  // E: another child on the same device sees an empty, calm garden
  await page.evaluate(() => {
    const family = JSON.parse(localStorage.getItem('kiddo.family')!) as {
      state: { activeChildId: string }
    }
    family.state.activeChildId = 'kid-b'
    localStorage.setItem('kiddo.family', JSON.stringify(family))
  })
  await page.reload()
  await expect(page.getByTestId('garden-empty')).toBeVisible()
  await expect(page.getByTestId('garden-plant')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('C: a growing plant blooms only after a retained independent success', async ({ page }) => {
  test.setTimeout(120_000)
  await seed(page, {
    memory: { 'kid-a': { 'math:add:within10': memoryOf('math:add:within10', 'plant') } },
  })
  await page.goto('/mistake-garden')
  await expect(plant(page, 'math:add:within10')).toHaveAttribute('data-stage', 'plant')
  await practise(page, 'math:add:within10')
  await expect(plant(page, 'math:add:within10')).toHaveAttribute('data-stage', 'bloom')
  await plant(page, 'math:add:within10').click()
  await expect(page.getByTestId('plant-sheet')).toContainText('Men buni o‘rgandim!')
  await expect(page.getByTestId('plant-practise')).toHaveCount(0)
})

test('Russian, every viewport: no sideways scroll, labels and the practice button visible', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await seed(page, {
    language: 'ru',
    memory: {
      'kid-a': {
        'math:missing:sub': memoryOf('math:missing:sub', 'seed'),
        'math:compare:groups': memoryOf('math:compare:groups', 'plant'),
        'math:two-step:within20': memoryOf('math:two-step:within20', 'bloom'),
      },
    },
  })
  await page.goto('/mistake-garden')
  await expect(page.getByRole('heading', { name: 'Сейчас в саду тихо 🌱' })).toHaveCount(0)
  for (const [width, height] of [
    [320, 568],
    [360, 800],
    [852, 393],
    [768, 1024],
    [1024, 768],
    [1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height })
    await expect(plant(page, 'math:missing:sub')).toContainText('Пропущенное число в вычитании')
    await expect(plant(page, 'math:two-step:within20')).toContainText('Цветок')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow, `${width}×${height}`).toBeLessThanOrEqual(0)
    // every plant is a big enough touch target
    for (const box of await page
      .getByTestId('garden-plant')
      .evaluateAll((all) => all.map((el) => el.getBoundingClientRect()))) {
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  }
  await page.setViewportSize({ width: 320, height: 568 })
  await plant(page, 'math:missing:sub').click()
  await expect(page.getByTestId('plant-practise')).toBeInViewport()
  await expect(page.getByTestId('plant-practise')).toHaveText('Тренироваться')
})
