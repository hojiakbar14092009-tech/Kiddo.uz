import { expect, test, type Page } from '@playwright/test'
import { passMathExample } from './lesson.ts'
import {
  applyEvidence,
  type Evidence,
  type SkillMemory,
} from '../src/domain/learningMemory/memory.ts'

/*
 * Phase 18 QA: the next adventure is clear without an adult. One main quest
 * (the journey's current step) and at most two optional practice quests;
 * closed places say what they still need; a real reward is paid once even
 * on a double tap; progress belongs to one child and survives a reload.
 */

interface Seed {
  language?: 'uz' | 'ru' | 'en'
  memory?: Record<string, Record<string, SkillMemory>>
}

async function seed(page: Page, data: Seed = {}) {
  await page.addInitScript((data) => {
    let state = 7
    Math.random = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    const put = (key: string, value: unknown, version = 1) =>
      localStorage.setItem(key, JSON.stringify({ state: value, version }))
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
      { children: [child('kid-a', 'Aziza'), child('kid-b', 'Bobur')], activeChildId: 'kid-a' },
      3,
    )
    const byChild: Record<string, unknown> = {}
    for (const [id, skills] of Object.entries(data.memory ?? {})) {
      byChild[id] = { skills, processed: [] }
    }
    put('kiddo.learning-memory', { byChild })
  }, data)
}

function seedPlant(skill: string): SkillMemory {
  const start = Date.now() - 72 * 3_600_000
  let memory: SkillMemory | undefined
  for (const n of [1, 2]) {
    const evidence: Evidence = {
      id: `s${n}|q`,
      skill,
      item: `q:${n}`,
      at: new Date(start + n * 3_600_000).toISOString(),
      firstTry: false,
      helpedBefore: false,
      errors: ['wrong-choice'],
      maxHint: 0,
      review: false,
    }
    memory = applyEvidence(memory, evidence)
  }
  return memory!
}

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

async function answerMathRight(page: Page) {
  await passMathExample(page)
  const question = page.getByTestId('lab-question')
  const kind = await question.getAttribute('data-kind')
  const answer = (await question.getAttribute('data-answer'))!
  if (kind === 'drag') {
    for (let n = 0; n < Number(answer); n += 1) await page.getByTestId('lab-object').first().click()
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

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test('the next adventure: one main quest, a positive optional quest, a clear way', async ({
  page,
}) => {
  await seed(page, {
    memory: { 'kid-a': { 'language:reading-words': seedPlant('language:reading-words') } },
  })
  for (const [width, height] of [
    [320, 568],
    [393, 852],
  ] as const) {
    await page.setViewportSize({ width, height })
    await page.goto('/home')
    const card = page.getByTestId('journey-card')
    await expect(card).toHaveAttribute('data-done', '0')
    await card.getByTestId('journey-go').scrollIntoViewIfNeeded()
    await expect(card.getByTestId('journey-go')).toBeInViewport()
    const optional = page.getByTestId('quest-optional')
    await expect(optional).toHaveCount(1)
    await expect(optional).toContainText('O‘simligingga yordam ber: So‘zlarni o‘qish')
    await expect(optional.getByRole('link', { name: 'Boshlash' })).toHaveAttribute(
      'href',
      '/learn/words?from=garden',
    )
    await noSidewaysScroll(page)
  }
})

test('a closed place says what it still needs; a double tap builds once; reload and profiles hold', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await seed(page)
  // Mars is closed: what the rocket still needs, and the way to it
  await page.goto('/spaceport/mars')
  await expect(page.getByTestId('mars-locked')).toBeVisible()
  const needs = page.getByTestId('quest-needs')
  await expect(needs).toContainText('Yana 1 ta kristall kerak')
  await expect(needs).toContainText('Yana 1 ta detal kerak')

  // maths with three stars pays the crystal and the part
  await page.goto('/math-lab')
  await page.getByTestId('lab-start').click()
  for (let step = 0; step < 5; step += 1) {
    await passMathExample(page, step)
    await expect(page.getByTestId('lab-question')).toHaveAttribute('data-step', String(step))
    await answerMathRight(page)
  }
  await expect(page.getByTestId('lab-result')).toBeVisible()

  // a quick double tap on "build" builds once and spends once
  await page.goto('/spaceport')
  await page.getByTestId('build-rocket').dblclick()
  await expect(page.getByTestId('rocket-level')).toHaveText('Raketa: 1-daraja')
  const balances = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('kiddo.universe')!) as {
      state: { byChild: Record<string, { balances: Record<string, number> }> }
    }
    return saved.state.byChild['kid-a']!.balances
  })
  expect(balances.crystal).toBe(0)
  expect(balances.part).toBe(0)

  // the world changed for good: after a reload the journey has moved on
  await page.reload()
  await page.goto('/home')
  await expect(page.getByTestId('journey-card')).toHaveAttribute('data-done', '2')

  // another child starts their own journey
  await page.evaluate(() => {
    const family = JSON.parse(localStorage.getItem('kiddo.family')!) as {
      state: { activeChildId: string }
    }
    family.state.activeChildId = 'kid-b'
    localStorage.setItem('kiddo.family', JSON.stringify(family))
  })
  await page.reload()
  await expect(page.getByTestId('journey-card')).toHaveAttribute('data-done', '0')
})

test('the Adventure Map shows the journey; Russian on 320 px fits', async ({ page }) => {
  await seed(page, {
    language: 'ru',
    memory: { 'kid-a': { 'science:planet-order': seedPlant('science:planet-order') } },
  })
  for (const [width, height] of [
    [768, 1024],
    [1024, 768],
  ] as const) {
    await page.setViewportSize({ width, height })
    await page.goto('/adventure')
    await expect(page.getByTestId('journey-card')).toBeVisible()
    await noSidewaysScroll(page)
  }
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/home')
  await expect(page.getByTestId('quest-optional')).toContainText(
    'Помоги растению вырасти: Порядок планет',
  )
  await noSidewaysScroll(page)
})
