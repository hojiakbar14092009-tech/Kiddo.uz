import { expect, test } from '@playwright/test'
import { passMathExample } from './lesson.ts'

/*
 * Phase 27: the living pet shop. A pet walking with the robot becomes a closer
 * friend on every day the child plays (one heart, once a day); the shop shows
 * its hearts, and a tapped pet answers with its face.
 */

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    const put = (key: string, state: unknown, version: number) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language: 'uz', volume: 0.8, onboarded: true }, 2)
    // a profile (a guest starts fresh on every visit, its pet too)
    const born = new Date()
    born.setFullYear(born.getFullYear() - 5)
    born.setDate(born.getDate() - 30)
    put(
      'kiddo.family',
      {
        children: [
          {
            id: 'kid-a',
            name: 'Aziza',
            birthDate: born.toISOString().slice(0, 10),
            celebratedLevel: 5,
            gender: 'girl',
            mascot: 'girl',
            dailyLimitMinutes: 600,
            createdAt: new Date().toISOString(),
            homeworks: [],
          },
        ],
        activeChildId: 'kid-a',
      },
      3,
    )
    const empty = {
      coins: 0,
      learned: {},
      struggles: {},
      stickers: [],
      results: [],
      minutesByDay: {},
      outfits: [],
      wearing: {},
    }
    put('kiddo.progress', { byChild: { 'kid-a': { ...empty, pets: ['cat'], pet: 'cat' } } }, 3)
  })
})

test('playing with the pet along fills a friendship heart, shown in the shop', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/shop?tab=pets')
  const cat = page.getByRole('button', {
    name: /^Mushuk — Yonimda\. Do‘stlik: 0 \/ 5\. Yangi yurakchagacha: 1 kun$/,
  })
  await expect(cat).toBeVisible()
  await expect(cat.getByTestId('pet-bond')).toHaveAttribute('data-level', '0')
  await expect(page.getByText(/Har kuni birga o‘ynasang/)).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)

  await page.goto('/math-lab')
  await page.getByTestId('lab-start').click()
  for (let step = 0; step < 6; step += 1) {
    await passMathExample(page, step)
    const question = page.getByTestId('lab-question')
    await expect(question).toHaveAttribute('data-step', String(step))
    const answer = (await question.getAttribute('data-answer'))!
    if ((await question.getAttribute('data-kind')) === 'drag') {
      for (let n = 0; n < Number(answer); n += 1)
        await page.getByTestId('lab-object').first().click()
      await page.getByTestId('lab-done').click()
    } else {
      const sign = SIGN_LABEL[answer]
      await (
        sign
          ? question.getByRole('button', { name: sign, exact: true })
          : question
              .getByRole('button', { name: answer, exact: true })
              .or(question.getByRole('button', { name: new RegExp(`^${answer} ta `) }))
      ).click()
    }
    const next = page.locator(`[data-testid="lab-question"][data-step="${step + 1}"]`)
    const result = page.getByTestId('lab-result')
    await expect(result.or(next).or(page.getByTestId('lab-intro'))).toBeVisible({
      timeout: 10_000,
    })
    if (await result.isVisible()) break
  }
  await expect(page.getByTestId('lab-result')).toBeVisible({ timeout: 10_000 })
  // the first day with the pet: a heart, said once (the toast fades after a few seconds)
  await expect(page.getByText('Mushuk bilan do‘stligingiz o‘sdi! Yurakchalar: 1 / 5')).toBeAttached(
    {
      timeout: 3_000,
    },
  )

  await page.goto('/shop?tab=pets')
  const friend = page.getByRole('button', {
    name: /^Mushuk — Yonimda\. Do‘stlik: 1 \/ 5\. Yangi yurakchagacha: 2 kun$/,
  })
  await expect(friend.getByTestId('pet-bond')).toHaveAttribute('data-level', '1')
  await expect(friend).toContainText('Yangi yurakchagacha: 2 kun')
})
