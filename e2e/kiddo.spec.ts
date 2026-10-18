import { expect, test, type Page } from '@playwright/test'

/** Starts every test as a first visit, with a fixed Math.random so the parent gate asks 3 × 3. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
})

async function chooseUzbek(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

async function solveParentGate(page: Page) {
  await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
  await page.getByRole('button', { name: '9', exact: true }).click()
  await page.getByRole('button', { name: 'Tekshirish' }).click()
}

test('a child picks a language and sees today’s plan', async ({ page }) => {
  await chooseUzbek(page)
  await expect(page.getByRole('heading', { name: 'Bugungi reja' })).toBeVisible()
  await expect(page.getByRole('link', { name: '1. Harfni top — Navbatdagi' })).toBeVisible()
})

test('a right answer earns praise, a finished game earns coins', async ({ page }) => {
  await chooseUzbek(page)
  await page.getByRole('link', { name: '1. Harfni top — Navbatdagi' }).click()

  let previous = ''
  for (let round = 0; round < 5; round += 1) {
    const prompt = page.getByText(/harfini top!$/).last()
    // Wait for the next round's instruction before reading the letter.
    await expect(prompt).not.toHaveText(previous, { timeout: 5_000 })
    previous = await prompt.innerText()
    const letter = previous.replace(' harfini top!', '').trim()
    await page.getByRole('button', { name: `${letter} harfi`, exact: true }).click()
    await expect(page.getByText(/^(Yahoooo|Wow|Hooray|Yay|Woohoo)! /)).toBeVisible()
  }

  await expect(page).toHaveURL(/\/reward$/, { timeout: 10_000 })
  await expect(page.getByText('Coinlar: +5')).toBeVisible()
  await expect(page.getByRole('status', { name: /Coinlar: 7/ })).toBeVisible()
})

test('Free shows the PRO crown instead of a voice', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/alphabet/a')
  await page.getByRole('button', { name: 'Yana tinglash (PRO)' }).click()
  await expect(page.getByText('Ovozli o‘rganish PRO versiyada!')).toBeVisible()
})

test('the parent area is behind the grown-ups gate', async ({ page }) => {
  await chooseUzbek(page)
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await solveParentGate(page)
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()

  await page.getByRole('textbox', { name: 'Ismi' }).fill('Lola')
  // A five-year-old: born five years ago today.
  const born = new Date()
  born.setFullYear(born.getFullYear() - 5)
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('button', { name: 'Lola profilini tahrirlash' })).toBeVisible()

  await page.getByRole('button', { name: 'Bolalarga' }).click()
  await expect(page).toHaveURL(/\/child-select$/)
  await page.getByRole('button', { name: /Lola/ }).click()
  await expect(page.getByRole('heading', { name: 'Salom, Lola!' })).toBeVisible()
})

test('works offline after the first visit', async ({ page, context }) => {
  await chooseUzbek(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await context.setOffline(true)
  await page.goto('/alphabet')
  await expect(page.getByRole('button', { name: 'A — ari' })).toBeVisible()
  await context.setOffline(false)
})
