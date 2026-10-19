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

async function openProTab(page: Page) {
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await solveParentGate(page)
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
  await page.goto('/parent/dashboard?tab=pro')
  // a fresh page load asks the grown-ups question again
  await solveParentGate(page)
}

test('no ad yet: no promo code', async ({ page }) => {
  await chooseUzbek(page)
  await openProTab(page)
  await page.getByRole('button', { name: 'Promokodni olish' }).click()
  await expect(page.getByText('Hozircha reklama yo‘q.', { exact: false })).toBeVisible()
})

test('the admin puts up an ad; a parent watches it to the end and gets a promo code once', async ({
  page,
}) => {
  // The admin adds an ad and sets the monthly price; the year is worked out (−20 %).
  await page.goto('/admin')
  await page.getByLabel('Admin PIN').fill('2026')
  await page.getByRole('button', { name: 'Ochish' }).click()
  await page.getByRole('button', { name: 'Reklamalar' }).click()
  await expect(
    page.getByText('Hozircha reklama yo‘q – ota-onalar promokod ola olmaydi.'),
  ).toBeVisible()
  await page.getByLabel('Reklama nomi').fill('Kuzgi chegirma')
  await page.getByLabel(/^Video \(MP4/).setInputFiles('e2e/fixtures/ad.webm')
  await page.getByRole('button', { name: 'Reklama qo‘shish' }).click()
  await expect(page.getByText('Kuzgi chegirma')).toBeVisible()

  await page.getByRole('button', { name: 'Sozlamalar' }).click()
  await page.getByLabel('PRO – 1 oy narxi').fill('35000')
  await expect(page.getByTestId('yearly-price')).toHaveText('336 000 so‘m')
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByText('Saqlandi.', { exact: false })).toBeVisible()

  // A parent sees the admin's prices and gets a code for watching the ad.
  await chooseUzbek(page)
  await openProTab(page)
  await expect(page.getByRole('radio', { name: /1 oy.*35\s000/ })).toBeVisible()
  await expect(page.getByRole('radio', { name: /1 yil.*336\s000/ })).toBeVisible()

  await page.getByRole('button', { name: 'Promokodni olish' }).click()
  await expect(page.getByRole('dialog', { name: 'Reklama' })).toBeVisible()
  const code = page.getByTestId('promo-code')
  await expect(code).toBeVisible({ timeout: 15_000 })
  await expect(code).toHaveAttribute('aria-label', /^(KIDDO07|BOLAJON30)$/)
  await page
    .getByRole('dialog', { name: /promokodingiz/ })
    .getByRole('button', { name: 'Faollashtirish' })
    .click()
  await expect(page.getByRole('heading', { name: 'PRO ochildi!' })).toBeVisible()
  await page.getByRole('button', { name: 'Zo‘r, boshladik!' }).click()

  // Only once: the button is gone, the used code is shown.
  await expect(page.getByRole('button', { name: 'Promokodni olish' })).toHaveCount(0)
  await expect(page.getByText('Promokod faqat 1 marta beriladi', { exact: false })).toBeVisible()
})

test('the six new learning sections open from home without errors', async ({ page }) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await chooseUzbek(page)
  await expect(page.getByRole('heading', { name: 'Yangi bo‘limlar' })).toBeVisible()
  for (const name of [
    'Birinchi so‘zim',
    'Matematika',
    'Koinot',
    'Ertaklar',
    'Bog‘da top',
    'Maskotga yordam ber',
  ]) {
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page).toHaveURL(/\/learn\//)
    await expect(page.locator('.learn-title').filter({ visible: true }).first()).toContainText(name)
    await page.goto('/home')
  }
  expect(errors).toEqual([])
})
