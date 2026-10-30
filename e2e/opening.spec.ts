import { expect, test } from '@playwright/test'

/*
 * Phase 32: the cinematic opening plays once per launch with the standalone
 * symbol (vector only), lasts about 2.8–4 s, never replays on route changes,
 * and becomes a short fade under reduced motion.
 */

test('the opening plays once, then Home; route changes never replay it', async ({ page }) => {
  await page.goto('/')
  const splash = page.locator('[data-splash]')
  await expect(splash).toBeVisible()
  const symbol = splash.locator('[data-kiddo-symbol]')
  await expect(symbol).toHaveAttribute('aria-label', 'Kiddo')
  for (const part of ['light', 'star', 'world', 'orbit-back', 'orbit-front', 'moon']) {
    await expect(symbol.locator(`[data-part="${part}"]`)).toHaveCount(1)
  }
  const started = Date.now()
  await expect(splash).toHaveCount(0, { timeout: 8_000 })
  const shown = Date.now() - started
  expect(shown).toBeGreaterThan(2_000)
  expect(shown).toBeLessThan(5_500)

  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await page.goBack()
  await expect(page).toHaveURL(/\/home$/)
  await expect(splash).toHaveCount(0)
})

test('reduced motion: a short fade instead of the choreography', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/')
  const splash = page.locator('[data-splash]')
  await expect(splash).toBeVisible()
  await expect(splash).toHaveCount(0, { timeout: 2_500 })
  await context.close()
})

test('a key skips the opening, and the screen behind waits (not reachable) until then', async ({
  page,
}) => {
  await page.goto('/')
  const splash = page.locator('[data-splash]')
  await expect(splash).toBeVisible()
  const behind = await page.evaluate(() =>
    [...document.querySelector('[data-splash]')!.parentElement!.children]
      .filter((node) => !node.hasAttribute('data-splash'))
      .every((node) => (node as HTMLElement).inert),
  )
  expect(behind).toBe(true)
  await page.keyboard.press('Escape')
  await expect(splash).toHaveCount(0, { timeout: 1_500 })
  const reachable = await page.evaluate(() => !document.querySelector('[inert]'))
  expect(reachable).toBe(true)
})

test('a tap skips the opening', async ({ page }) => {
  await page.goto('/')
  const splash = page.locator('[data-splash]')
  await expect(splash).toBeVisible()
  await splash.click()
  await expect(splash).toHaveCount(0, { timeout: 1_500 })
})
