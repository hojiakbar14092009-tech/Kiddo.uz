import { expect, test } from '@playwright/test'

/*
 * Phase 25: the first visit — language, then a short interactive tour with
 * KidoBot (or a skip), then home. The tour fits a 320 px phone and a desktop.
 */

// a first visit: no tour seen yet
test.use({ storageState: { cookies: [], origins: [] } })

test('first visit: language, the KidoBot tour (every step answers), then home', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/welcome$/)
  for (const step of ['robot', 'coin', 'speaker', 'help', 'parent']) {
    await expect(page.getByTestId('welcome-step')).toHaveAttribute('data-step', step)
    await page.getByTestId('welcome-try').click()
    await expect(page.getByTestId('welcome-feedback')).not.toHaveClass(/invisible/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    )
    if (step !== 'parent') await page.getByTestId('welcome-next').click()
  }
  await page.getByTestId('welcome-finish').click()
  await expect(page).toHaveURL(/\/home$/)
  // the tour is seen once
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
})

test.describe('a small phone', () => {
  test.use({ viewport: { width: 320, height: 568 } })
  test('the tour fits and can be skipped', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Русский' }).click()
    await expect(page.getByTestId('welcome-step')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
    const next = page.getByTestId('welcome-next')
    const box = (await next.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    await page.getByTestId('welcome-skip').click()
    await expect(page).toHaveURL(/\/home$/)
  })
})

test.describe('a phone held sideways', () => {
  test.use({ viewport: { width: 740, height: 360 } })
  test('the step, its target and the buttons all fit on the screen', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.getByTestId('welcome-step')).toBeVisible()
    for (const id of ['welcome-try', 'welcome-next', 'welcome-skip']) {
      const box = (await page.getByTestId(id).boundingBox())!
      expect(box.y + box.height).toBeLessThanOrEqual(360)
      expect(box.x + box.width).toBeLessThanOrEqual(740)
    }
  })
})
