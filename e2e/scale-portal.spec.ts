import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 33: the Scale Portal on a small phone — a guess at every portal, a
 * continuous zoom to the next place, the rail, a counted journey, and no
 * leaks when entering and leaving again and again.
 */

async function seedChild(page: Page, age: number) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.evaluate((age) => {
    const now = new Date()
    const born = new Date(now.getFullYear() - age, now.getMonth(), now.getDate() - 30)
    const family = JSON.parse(localStorage.getItem('kiddo.family') ?? '{"state":{},"version":3}')
    family.state.children = [
      {
        id: 'c1',
        name: 'Aziz',
        birthDate: born.toISOString().slice(0, 10),
        celebratedLevel: 6,
        gender: 'boy',
        mascot: 'boy',
        dailyLimitMinutes: 60,
        createdAt: '2026-01-01T00:00:00.000Z',
        birthdayGifts: [now.getFullYear()],
        tours: { home: 2, play: 2, reward: 2 },
      },
    ]
    family.state.activeChildId = 'c1'
    localStorage.setItem('kiddo.family', JSON.stringify(family))
  }, age)
}

test('an 8-year-old travels from a blood cell to the galaxy', async ({ page }) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.setViewportSize({ width: 320, height: 568 })
  await seedChild(page, 8)
  await page.goto('/learn/space')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  await page.getByTestId('scale-portal-link').click()
  await expect(page).toHaveURL(/\/scale-portal$/)
  await expect(page.getByTestId('scale-rail')).toHaveAttribute('data-detail', 'ratio')
  await page.getByTestId('scale-start').click()

  for (let step = 0; step < 9; step += 1) {
    const question = page.getByTestId('scale-question')
    await expect(question).toBeVisible()
    const answer = await question.getAttribute('data-answer')
    await question.locator(`[data-choice="${answer}"]`).click()
    await expect(page.getByTestId('scale-next')).toBeVisible({ timeout: 10_000 })
    if (step === 4) {
      // the camera really travelled: Earth is in view, the city has shrunk inside it
      await expect(page.getByTestId('scale-stage')).toHaveAttribute('data-nearest', 'earth')
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    }
    await page.getByTestId('scale-next').click()
  }
  await expect(page.getByTestId('scale-done')).toBeVisible()
  await expect(page.getByText('To‘g‘ri taxminlar: 9 / 9')).toBeVisible()
  expect(errors).toEqual([])
})

test('entering and leaving many times leaves nothing running', async ({ page }) => {
  await seedChild(page, 14)
  await page.goto('/learn/space')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  for (let round = 0; round < 4; round += 1) {
    await page.getByTestId('scale-portal-link').click()
    await page.getByTestId('scale-start').click()
    const question = page.getByTestId('scale-question')
    const answer = await question.getAttribute('data-answer')
    await question.locator(`[data-choice="${answer}"]`).click()
    // leave in the middle of a zoom
    await page.goBack()
    await expect(page).toHaveURL(/\/learn\/space$/)
  }
  await expect(page.locator('[data-stop-layer]')).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('the rail answers the keyboard, and Next takes the focus after a jump', async ({ page }) => {
  await seedChild(page, 11)
  await page.goto('/scale-portal')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  await page.getByRole('button', { name: 'Erkin kezish' }).click()
  const rail = page.getByRole('slider', { name: 'Masshtab relsi' })
  await rail.focus()
  for (let press = 0; press < 30; press += 1) await page.keyboard.press('ArrowRight')
  // 30 small steps take the camera from the blood cell past the ant
  await expect(page.getByTestId('scale-stage')).not.toHaveAttribute('data-nearest', 'cell')
  await page.getByTestId('scale-start').click()
  const question = page.getByTestId('scale-question')
  const answer = await question.getAttribute('data-answer')
  await question.locator(`[data-choice="${answer}"]`).click()
  await expect(page.getByTestId('scale-next')).toBeFocused({ timeout: 10_000 })
})
