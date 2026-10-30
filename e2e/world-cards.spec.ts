import { expect, test } from '@playwright/test'
import { passMathExample } from './lesson.ts'

/*
 * Phase 28: World Card Evolution. A world's card on the Adventure Map grows
 * with the stars the child earns in that world (new → explorer → expert →
 * master) and shows a new stage once.
 */

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
})

test('a world card evolves after playing in that world, without overflowing', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: 'Sarguzashtlar xaritasi', exact: true }).click()
  const ocean = page.getByTestId('world-ocean')
  await expect(ocean).toHaveAttribute('data-stage', 'new')
  await expect(ocean.getByTestId('card-stage')).toContainText('Yangi olam')

  // a Math Lab run (an Ocean world activity), played through the app (a guest starts over on reload)
  await page.getByRole('link', { name: /^Matematika laboratoriyasi\./ }).click()
  await expect(page).toHaveURL(/\/math-lab$/)
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
  await page.getByRole('link', { name: /Shaharga qaytish/ }).click()
  await page.getByRole('link', { name: 'Sarguzashtlar xaritasi', exact: true }).click()

  await expect(ocean).toHaveAttribute('data-stage', 'explorer')
  await expect(ocean.getByTestId('card-stage')).toContainText('Kashfiyotchi')
  await expect(ocean.getByTestId('card-stage-up')).toHaveText('Yangi bosqich!')
  // one spoken announcement for the new stage (a page-level live region)
  await expect(page.getByTestId('stage-news')).toContainText('Kashfiyotchi — yangi bosqich!')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)

  // seen once: back on the map, the stage stays and the news is gone
  await page.getByRole('button', { name: 'Bosh sahifa', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: 'Sarguzashtlar xaritasi', exact: true }).click()
  await expect(ocean).toHaveAttribute('data-stage', 'explorer')
  await expect(ocean.getByTestId('card-stage-up')).toHaveCount(0)
})
