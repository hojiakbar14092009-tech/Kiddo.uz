import { expect, test } from '@playwright/test'

/*
 * Phase 32: the cinematic opening plays once per launch with the standalone
 * symbol (vector only), lasts about 2.8–4 s, never replays on route changes,
 * and becomes a short fade under reduced motion and on later launches (MVP).
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

test('the next launch on the same device: a short fade, the child is not kept waiting (MVP)', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('[data-splash]')).toHaveAttribute('data-opening', 'full')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 8_000 })
  await page.reload()
  // the short version (0.9 s); not timed here: headless software WebGL can hold the page's thread
  await expect(page.locator('[data-splash]')).toHaveAttribute('data-opening', 'short')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 8_000 })
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
  // the skip is immediate (the screen behind is reachable); its 0.35 s fade can stretch past
  // 1.5 s while Home's 3D loads behind on headless software WebGL (B1 probe: 1 in 10 on tablet)
  await expect
    .poll(() => page.evaluate(() => !document.querySelector('[inert]')), { timeout: 1_500 })
    .toBe(true)
  await expect(splash).toHaveCount(0)
})

test('a tap skips the opening', async ({ page }) => {
  await page.goto('/')
  const splash = page.locator('[data-splash]')
  await expect(splash).toBeVisible()
  await splash.click()
  // as for the key: the skip at once, the fade in its own time
  await expect
    .poll(() => page.evaluate(() => !document.querySelector('[inert]')), { timeout: 1_500 })
    .toBe(true)
  await expect(splash).toHaveCount(0)
})
