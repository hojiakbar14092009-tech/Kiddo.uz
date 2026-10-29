import { expect, test, type Page } from '@playwright/test'
import { meetNewLetter } from './lesson.ts'

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

  let previous: string | null = null
  for (let round = 0; round < 5; round += 1) {
    const options = page.getByTestId('task-options')
    const intro = page.getByTestId('letter-intro')
    // the next round: a new letter's introduction, or new answers on the board
    await expect
      .poll(
        async () =>
          (await intro.isVisible()) ||
          ((await options.isVisible()) && (await options.getAttribute('data-answer')) !== previous),
      )
      .toBe(true)
    // Learn Before Play: a new letter is shown before it is asked
    await meetNewLetter(page)
    previous = await options.getAttribute('data-answer')
    await page.locator(`[data-option="${previous}"]`).click()
    await expect(page.getByText(/^(Yahoooo|Wow|Hooray|Yay|Woohoo)! /)).toBeVisible()
  }

  await expect(page).toHaveURL(/\/reward$/, { timeout: 10_000 })
  await expect(page.getByText('Coinlar: +5')).toBeVisible()
  await expect(page.getByRole('status', { name: /Coinlar: 7/ })).toBeVisible()
})

test('the demo: the voice is free (no PRO crown on “listen again”)', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/alphabet/a')
  await expect(page.getByRole('button', { name: 'Yana tinglash', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Yana tinglash (PRO)' })).toHaveCount(0)
  await expect(page.getByRole('status', { name: 'Bepul' })).toHaveCount(0)
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
  // a month past the birthday: no birthday party in the way (birthday.spec.ts has it)
  born.setDate(born.getDate() - 30)
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
  await page.getByRole('button', { name: 'Demo administrator sifatida kirish' }).click()
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

  // The demo shows parents no prices or purchase; they get a code for watching the ad.
  await chooseUzbek(page)
  await openProTab(page)
  await expect(page.getByRole('radio')).toHaveCount(0)
  await expect(page.getByTestId('pro-demo-note')).toBeVisible()

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

test('demo admin: enter, look around, turn demo PRO on, leave; the app is unaffected', async ({
  page,
}) => {
  await chooseUzbek(page)
  await page.goto('/admin')
  await page.getByRole('button', { name: 'Demo administrator sifatida kirish' }).click()
  await expect(page.getByTestId('demo-admin-banner')).toBeVisible()
  await expect(page.getByTestId('demo-overview')).toBeVisible()
  // a refresh keeps the demo session for this tab
  await page.reload()
  await expect(page.getByTestId('demo-admin-banner')).toBeVisible()
  await page.getByRole('button', { name: 'Demo', exact: true }).click()
  await expect(page.getByTestId('demo-promo-list').locator('li')).toHaveCount(10)
  await page.getByTestId('demo-pro-switch').click()
  await expect(page.getByTestId('demo-pro-switch')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('demo-reset').click()
  await expect(page.getByTestId('demo-pro-switch')).toHaveAttribute('aria-checked', 'false')
  await page.getByRole('button', { name: 'Chiqish' }).click()
  await expect(
    page.getByRole('button', { name: 'Demo administrator sifatida kirish' }),
  ).toBeVisible()
  // the child's app is as before
  await page.goto('/home')
  await expect(page.getByRole('heading', { name: 'Kiddo shahri' })).toBeVisible()
  await expect(page.getByTestId('demo-admin-banner')).toHaveCount(0)
})

test('a parent opens PRO with a demo promo code, once', async ({ page }) => {
  await chooseUzbek(page)
  await openProTab(page)
  const field = page.getByRole('textbox', { name: 'Kodni kiriting' })
  await field.fill('  kiddodemo05 ')
  await page.getByRole('button', { name: 'Qo‘llash' }).click()
  await expect(page.getByRole('heading', { name: 'PRO ochildi!' })).toBeVisible()
  await page.getByRole('button', { name: 'Zo‘r, boshladik!' }).click()
  await field.fill('KIDDODEMO05')
  await page.getByRole('button', { name: 'Qo‘llash' }).click()
  await expect(page.getByText('Bu promokod allaqachon ishlatilgan.')).toBeVisible()
})

/** The device admin PIN of the production-flags build (playwright.config.ts). */
const E2E_ADMIN_PIN = process.env.VITE_ADMIN_PIN ?? '481516'

test(
  'production build: Free shows the PRO crown instead of a voice',
  { tag: '@production' },
  async ({ page }) => {
    await chooseUzbek(page)
    await page.goto('/alphabet/a')
    await page.getByRole('button', { name: 'Yana tinglash (PRO)' }).click()
    await expect(page.getByText('Ovozli o‘rganish PRO versiyada!')).toBeVisible()
  },
)

test(
  'production build: no demo admin; the PIN admin sets prices and parents see them',
  { tag: '@production' },
  async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByTestId('demo-admin-entry')).toHaveCount(0)
    await page.getByLabel('Admin PIN').fill(E2E_ADMIN_PIN)
    await page.getByRole('button', { name: 'Ochish' }).click()
    await expect(page.getByTestId('demo-admin-banner')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Demo', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Sozlamalar' }).click()
    await page.getByLabel('PRO – 1 oy narxi').fill('35000')
    await expect(page.getByTestId('yearly-price')).toHaveText('336 000 so‘m')
    await page.getByRole('button', { name: 'Saqlash' }).click()
    await expect(page.getByText('Saqlandi.', { exact: false })).toBeVisible()

    await chooseUzbek(page)
    await openProTab(page)
    await expect(page.getByRole('radio', { name: /1 oy.*35\s000/ })).toBeVisible()
    await expect(page.getByRole('radio', { name: /1 yil.*336\s000/ })).toBeVisible()
    await expect(page.getByTestId('pro-demo-note')).toHaveCount(0)
    // the public demo codes do nothing here
    await page.getByRole('textbox', { name: 'Kodni kiriting' }).fill('KIDDODEMO05')
    await page.getByRole('button', { name: 'Qo‘llash' }).click()
    await expect(page.getByRole('heading', { name: 'PRO ochildi!' })).toHaveCount(0)
  },
)

test('the learning sections open from their Kiddo City buildings without errors', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await chooseUzbek(page)
  await expect(page.getByRole('heading', { name: 'Kiddo shahri' })).toBeVisible()
  // building on the city → the section title inside
  for (const [building, section] of [
    ['So‘zlar ustaxonasi', 'Birinchi so‘zim'],
    ['Rasadxona', 'Koinot'],
    ['Sehrli bog‘', 'Bog‘da top'],
    ['Robot ustaxonasi', 'Maskotga yordam ber'],
  ] as const) {
    await page.getByRole('link', { name: building, exact: true }).click()
    await expect(page).toHaveURL(/\/learn\//)
    await expect(page.locator('.learn-title').filter({ visible: true }).first()).toContainText(
      section,
    )
    await page.goto('/home')
  }
  // The Story Library opens the Story Engine, which links on to the classic tales.
  await page.getByRole('link', { name: 'Ertaklar kutubxonasi', exact: true }).click()
  await expect(page).toHaveURL(/\/stories$/)
  await expect(page.getByRole('heading', { name: 'Hikoyalar' })).toBeAttached()
  await page.getByTestId('stories-classic-tales').click()
  await expect(page).toHaveURL(/\/learn\/tales$/)
  await expect(page.locator('.learn-title').filter({ visible: true }).first()).toContainText(
    'Ertaklar',
  )
  await page.goto('/home')
  // Math Land opens the adaptive Math Lab, which links to the step-by-step lessons.
  await page.getByRole('link', { name: 'Matematika shahri', exact: true }).click()
  await expect(page).toHaveURL(/\/math-lab$/)
  await expect(page.getByRole('heading', { name: 'Matematika laboratoriyasi' })).toBeVisible()
  expect(errors).toEqual([])
})

test('the city opens the Adventure Map and the collection', async ({ page }) => {
  await chooseUzbek(page)
  await page.getByRole('link', { name: 'Sarguzashtlar xaritasi', exact: true }).click()
  await expect(page).toHaveURL(/\/adventure$/)
  await expect(page.getByText('Sen shu yerdasan')).toBeVisible()
  await page.goto('/home')
  await page.getByTestId('resource-bar').click()
  await expect(page).toHaveURL(/\/collection$/)
  await expect(page.getByText('Kolleksiya hali bo‘sh')).toBeVisible()
})
