import { expect, test, type Locator, type Page } from '@playwright/test'
import { passMathExample } from './lesson.ts'

/*
 * Phase 10: the tutor inside Math Lab (hint ladder), Kiddo's own learning
 * memory across a reload, the spaced review, and what the parent sees. This
 * build has no Kiddo server, so no AI is ever called (checked on the network).
 */

test.beforeEach(async ({ page }) => {
  // a fixed Math.random: the parent gate asks 3 × 3; questions repeat per run
  await page.addInitScript(() => {
    let state = 7
    Math.random = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
  })
})

async function solveParentGate(page: Page) {
  const gate = page.getByRole('dialog', { name: 'Faqat kattalar uchun' })
  await expect(gate).toBeVisible()
  const text =
    (await gate.locator('p[aria-live="polite"] span[aria-hidden="true"]').textContent()) ?? ''
  const match = /(\d+)\s*×\s*(\d+)/.exec(text)
  const answer = String(Number(match![1]) * Number(match![2]))
  for (const digit of answer) await gate.getByRole('button', { name: digit, exact: true }).click()
  await gate.getByRole('button', { name: 'Tekshirish' }).click()
}

/** A six-year-old "Aziz" (Math Lab level 3) made in the demo parent area, then chosen. */
async function sixYearOld(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await solveParentGate(page)
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
  await page.getByRole('textbox', { name: 'Ismi' }).fill('Aziz')
  const born = new Date()
  born.setFullYear(born.getFullYear() - 6)
  born.setDate(born.getDate() - 30)
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('button', { name: 'Aziz profilini tahrirlash' })).toBeVisible()
  await page.getByRole('button', { name: 'Bolalarga' }).click()
  await page.getByRole('button', { name: /Aziz/ }).click()
  await expect(page.getByRole('heading', { name: 'Salom, Aziz!' })).toBeVisible()
}

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

function answerCard(question: Locator, answer: string): Locator {
  const label = SIGN_LABEL[answer]
  if (label) return question.getByRole('button', { name: label, exact: true })
  return question.getByRole('button', { name: answer, exact: true })
}

async function childId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const family = JSON.parse(localStorage.getItem('kiddo.family') ?? '{}') as {
      state: { children: { id: string }[] }
    }
    return family.state.children[0]!.id
  })
}

test('tutor: hint ladder, memory after a reload, spaced review, parent summary', async ({
  page,
}) => {
  const aiCalls: string[] = []
  page.on('request', (request) => {
    if (/functions\/v1\/tutor|generativelanguage/.test(request.url())) aiCalls.push(request.url())
  })
  await sixYearOld(page)
  await page.goto('/math-lab')
  await page.getByTestId('lab-start').click()
  await passMathExample(page)
  const question = page.getByTestId('lab-question')
  await expect(question).toHaveAttribute('data-level', '3')

  // a sign question has two wrong cards only: answer it and go on
  while ((await question.getAttribute('data-kind')) === 'compare') {
    const step = await question.getAttribute('data-step')
    await answerCard(question, (await question.getAttribute('data-answer'))!).click()
    await expect(question).not.toHaveAttribute('data-step', step!)
  }
  const answer = (await question.getAttribute('data-answer'))!
  const wrong = question
    .locator('[data-status="idle"]')
    .filter({ hasNotText: new RegExp(`^${answer}$`) })

  // 1st mistake: a tiny clue only, from Kiddo itself
  await wrong.first().click()
  const help = page.getByTestId('lab-help')
  await expect(help).toHaveAttribute('data-hint-level', '1')
  await expect(help).toHaveAttribute('data-source', 'local')
  await expect(page.getByTestId('tutor-message')).not.toHaveText(
    new RegExp(`(^|\\D)${answer}(\\D|$)`),
  )
  // 2nd mistake: the picture help
  await wrong.first().click()
  await expect(help).toHaveAttribute('data-hint-level', '2')
  // more help: one wrong card goes away, then the worked solution
  await page.getByTestId('tutor-more').click()
  await expect(help).toHaveAttribute('data-hint-level', '3')
  await expect(question.locator('[data-status="removed"]')).toHaveCount(1)
  await page.getByTestId('tutor-more').click()
  await expect(help).toHaveAttribute('data-hint-level', '4')
  await expect(page.getByTestId('tutor-message')).toContainText('Mana yechimi:')
  const step = await question.getAttribute('data-step')
  // the glowing card pulses without end: Playwright never sees it "stable"
  await question.locator('[data-status="hint"]').click({ force: true })
  await passMathExample(page, Number(step) + 1)
  await expect(question).not.toHaveAttribute('data-step', step!)

  // the question went to Kiddo's own memory on this device
  const id = await childId(page)
  const saved = await page.evaluate(
    (child) =>
      JSON.parse(localStorage.getItem('kiddo.learning-memory') ?? '{}').state?.byChild?.[child],
    id,
  )
  const skills = Object.values(saved.skills) as { hintsRecent: number[] }[]
  expect(skills.some((s) => s.hintsRecent.includes(4))).toBe(true)

  // yesterday's confirmed difficulty with taking away, due for review today
  await page.evaluate((child) => {
    const key = 'kiddo.learning-memory'
    const data = JSON.parse(localStorage.getItem(key) ?? '{"state":{"byChild":{}},"version":1}')
    const yesterday = new Date(Date.now() - 26 * 3_600_000).toISOString()
    data.state.byChild[child] ??= { skills: {}, processed: [] }
    data.state.byChild[child].skills['math:sub:within10'] = {
      skill: 'math:sub:within10',
      level: 3,
      mastery: 0.5,
      evidence: 2,
      successStreak: 0,
      firstAt: yesterday,
      lastPracticedAt: yesterday,
      lastErrorAt: yesterday,
      retained: false,
      nextReviewAt: new Date(Date.now() - 3_600_000).toISOString(),
      reviewStep: 0,
      reviewCount: 0,
      misconceptions: {
        'off-by-one': {
          code: 'off-by-one',
          count: 2,
          items: ['sub:9-3', 'sub:8-3'],
          firstAt: yesterday,
          lastAt: yesterday,
          status: 'confirmed',
        },
      },
      hintsRecent: [1, 2],
      correctedAfterHint: 2,
      masteredAt: null,
    }
    localStorage.setItem(key, JSON.stringify(data))
  }, id)

  // a new session (reload): the review comes first, as a related item
  await page.goto('/math-lab')
  await page.getByTestId('lab-start').click()
  await expect(question).toHaveAttribute('data-review', 'true')
  await expect(question).toHaveAttribute('data-kind', 'sub')
  const reviewId = await question.getAttribute('data-answer')
  expect(reviewId).toBeTruthy()
  await expect(
    page.getByText('Shunga o‘xshash misolni yana bir bor sinab ko‘ramiz.').first(),
  ).toBeVisible()

  // the parent sees the skill, never a label for the child
  await page.goto('/parent/dashboard?tab=report')
  // a new page load asks the grown-ups' question again
  await solveParentGate(page)
  const memory = page.locator('#memory')
  await expect(memory).toContainText('Kiddo nimani eslab qoldi')
  await expect(memory.getByTestId('memory-needs')).toContainText('Ayirish')
  await page.getByRole('tab', { name: 'Sozlamalar' }).click()
  const ai = page.locator('#ai-tutor')
  await expect(ai.getByTestId('ai-tutor-child')).toHaveAttribute('data-availability', 'no-server')
  await expect(ai).toContainText('AI yordamchi ulanmagan')
  await expect(ai.getByRole('switch')).toHaveCount(0)

  // no request ever went to an AI
  expect(aiCalls).toEqual([])
})
