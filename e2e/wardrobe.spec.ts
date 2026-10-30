import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 31: the wardrobe has kinds of clothes for every child (no locks), and
 * the robot matures with the learner's real age: a 14-year-old sees calm
 * colours and an older robot, on a small phone without sideways scrolling.
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

test('a 14-year-old: calm wardrobe, every kind open, filters fit a small phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await seedChild(page, 14)
  await page.goto('/shop')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  const wardrobe = page.getByTestId('wardrobe')
  await expect(wardrobe).toHaveAttribute('data-stage', 'older')
  await expect(wardrobe.locator('li').first()).toHaveAttribute('data-category', 'smart')
  await expect(page.locator('[data-outfit-preview="cap"]')).toHaveAttribute('data-tone', 'muted')
  await expect(page.locator('svg[data-stage]').first()).toHaveAttribute('data-stage', 'older')

  await page.getByRole('button', { name: 'Milliy' }).click()
  await expect(page.getByRole('button', { name: 'Milliy' })).toHaveAttribute('aria-pressed', 'true')
  await expect(wardrobe.locator('li')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /^Do‘ppi/ })).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('a 5-year-old: the same wardrobe in bright colours, a young robot', async ({ page }) => {
  await seedChild(page, 5)
  await page.goto('/shop')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByTestId('wardrobe')).toHaveAttribute('data-stage', 'young')
  await expect(page.locator('[data-outfit-preview="cap"]')).toHaveAttribute('data-tone', 'bright')
  await expect(page.getByTestId('wardrobe').locator('li')).toHaveCount(18)
})
