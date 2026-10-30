import { expect, test } from '@playwright/test'

/*
 * Phase 30: the Collection shows both medal collections (prestige changes the
 * medal's shape) and previews every Kiddo Universe sticker before it opens.
 */

test('medals evolve and Universe stickers are previewed, on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.evaluate(() => {
    const raw = JSON.parse(
      localStorage.getItem('kiddo.universe') ?? '{"state":{"byChild":{}},"version":2}',
    )
    raw.state.byChild.guest = {
      balances: { star: 0, crystal: 0, seed: 0, part: 0, scroll: 0, key: 0 },
      ledger: { entries: [], keys: [] },
      best: {},
      stats: { activities: 0, byStrand: {}, earned: {}, daysActive: 0, lastDay: null },
      partsDay: null,
      processed: [],
      awards: [],
      buildings: {},
      questsClaimed: [],
      ...(raw.state.byChild.guest ?? {}),
      achievements: { 'first-steps': 'silver', counter: 'bronze', 'number-path': 'gold' },
    }
    localStorage.setItem('kiddo.universe', JSON.stringify(raw))
  })
  await page.goto('/collection')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })

  await expect(page.getByTestId('medal-number-path')).toContainText('Yulduz turkumi')
  await expect(page.getByTestId('medal-counter')).toContainText('Bronza')
  // the tiers are different shapes: the top one glows, the lower ones do not
  await expect(page.getByTestId('medal-number-path').locator('.medal-glow')).toHaveCount(1)
  await expect(page.getByTestId('medal-first-steps').locator('.medal-glow')).toHaveCount(0)

  const map = page.getByTestId('ustick-discovery-map')
  await map.scrollIntoViewIfNeeded()
  await expect(map).toHaveAttribute('data-unlocked', 'true')
  const rocket = page.getByTestId('ustick-crystal-rocket')
  await expect(rocket).toHaveAttribute('data-unlocked', 'false')
  await expect(rocket).toContainText('Kristall raketa')
  await expect(rocket).toContainText('«Kashfiyotchi»: Kumush')
  await expect(page.getByTestId('universe-stickers-count')).toHaveText('Ochilgan: 1 / 12')

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
