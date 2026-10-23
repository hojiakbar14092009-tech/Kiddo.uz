import { expect, test, type Page } from '@playwright/test'

/** The Emotions & Social Skills section, entered through Kiddo City's Friendship House. */

async function chooseUzbek(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

/** Answers every question: tries the cards in turn until the fitting one is praised. */
async function playRun(page: Page) {
  const next = page.getByRole('button', { name: /^(Keyingisi|Tugatish)$/ })
  for (let question = 0; question < 10; question += 1) {
    if (await page.getByTestId('activity-reward').isVisible()) return
    const options = page.getByTestId('feelings-option')
    await expect(options.first()).toBeVisible()
    const count = await options.count()
    for (let index = 0; index < count; index += 1) {
      const option = options.nth(index)
      if ((await option.getAttribute('aria-disabled')) === 'true') continue
      await option.click()
      await expect(page.getByTestId('feelings-feedback')).toBeVisible()
      if (await next.isVisible()) break
      // never "wrong": another look or another idea
      await expect(page.getByTestId('feelings-feedback')).not.toContainText(/noto‘g‘ri/i)
    }
    await next.click()
  }
}

test('a child plays a feelings game from the Friendship House and gets a reward', async ({
  page,
}) => {
  await chooseUzbek(page)
  await page.getByRole('link', { name: 'Do‘stlik uyi' }).click()
  await expect(page).toHaveURL(/\/feelings$/)

  await page.getByTestId('feelings-door-faces').click()
  await expect(page).toHaveURL(/\/feelings\/faces$/)
  // a guest starts at level 2: three faces to choose from
  await expect(page.getByTestId('feelings-option')).toHaveCount(3)
  await playRun(page)

  await expect(page.getByText('Barakalla! Tuyg‘ularni yaxshi tushunding.')).toBeVisible()
  await expect(page.getByTestId('activity-reward')).toBeVisible()
  await page.getByRole('link', { name: 'Boshqa o‘yin' }).click()
  await expect(page).toHaveURL(/\/feelings$/)
})

test('“What could you do?” shows a picture for every idea and ends with a reward', async ({
  page,
}) => {
  await chooseUzbek(page)
  await page.goto('/feelings/kindness')
  // a guest starts at level 2: two ideas, each with its own picture
  const options = page.getByTestId('feelings-option')
  await expect(options).toHaveCount(2)
  for (const option of await options.all()) {
    await expect(option.locator('svg[data-choice-art]')).toBeVisible()
  }
  await playRun(page)
  await expect(page.getByText('Barakalla! Sen mehribon do‘stsan.')).toBeVisible()
  await expect(page.getByTestId('activity-reward')).toBeVisible()
})

test('the calm corner breathes with a circle and can be left at any time', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/feelings/calm')
  await page.getByRole('button', { name: 'Boshlash' }).click()
  await expect(page.getByText('Nafas ol…')).toBeVisible()
  await expect(page.getByTestId('calm-circle')).toHaveAttribute('data-half', 'in')
  await expect(page.getByTestId('calm-circle')).toHaveAttribute('data-half', 'out', {
    timeout: 6_000,
  })
  await page.getByRole('link', { name: 'Tugatish' }).click()
  await expect(page).toHaveURL(/\/feelings$/)
  // nothing was scored
  await expect(page.getByTestId('activity-reward')).toHaveCount(0)
})

test('with reduced motion the calm corner is text steps at the child’s pace', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await chooseUzbek(page)
  await page.goto('/feelings/calm')
  await page.getByRole('button', { name: 'Boshlash' }).click()
  await expect(page.getByTestId('calm-step')).toContainText('Burning bilan sekin nafas ol')
  await page.getByRole('button', { name: 'Keyingi qadam' }).click()
  await expect(page.getByTestId('calm-step')).toContainText('Og‘zing bilan sekin nafas chiqar')
})
