import { expect, test } from '@playwright/test'

/*
 * Phase 26: living mascots. The robot roaming Home is never cut in half by
 * the sticky top bar when the page scrolls (it fades there and hops on to a
 * card in view), and its greeting follows the child's day.
 */

test.use({ viewport: { width: 390, height: 700 } })

test('scrolling Home: the roaming robot is never shown cut by the top bar', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  const robot = page.locator('[data-roaming-robot]')
  await expect(robot).toHaveCount(1)
  for (const y of [250, 600, 150, 900]) {
    await page.evaluate((top) => window.scrollTo({ top }), y)
    // sampled often, so a hop's arc is seen too
    for (let i = 0; i < 30; i += 1) {
      await page.waitForTimeout(100)
      const { under, robotTop, barBottom, opacity } = await page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('[data-roaming-robot]')!
        const header = document.querySelector('[data-topbar]')!.getBoundingClientRect()
        return {
          under: el.dataset.underBar === 'true',
          robotTop: el.getBoundingClientRect().top,
          barBottom: header.bottom,
          opacity: Number(getComputedStyle(el).opacity),
        }
      })
      // either clear of the bar, or faded away behind it
      const width = (await robot.boundingBox())?.width ?? 0
      // (2 px for rounding)
      if (!under) expect(robotTop + width * 0.3 + 2).toBeGreaterThanOrEqual(barBottom)
      else if (opacity >= 0.5) {
        // the fade takes 0.2 s: once it has run, a robot still behind the bar is faded
        await page.waitForTimeout(300)
        const later = await page.evaluate(() => {
          const el = document.querySelector<HTMLElement>('[data-roaming-robot]')!
          return {
            under: el.dataset.underBar === 'true',
            opacity: Number(getComputedStyle(el).opacity),
          }
        })
        if (later.under) expect(later.opacity).toBeLessThan(0.5)
      }
    }
  }
})

test('the greeting follows the day: the morning says good morning', async ({ page }) => {
  // 08:00 local time
  await page.clock.setFixedTime(new Date(2026, 9, 30, 8, 0, 0))
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page.getByTestId('roam-greeting')).toContainText('Xayrli tong!')
})
