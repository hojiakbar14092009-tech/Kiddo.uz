import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 49: find at home, an own story, three-language words and the
 * printable sheets of the parent area.
 */

/** A six-year-old "Aziz" playing in Uzbek (as in performance.spec.ts), seeded once per test. */
async function child(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('kiddo.e2e.tours', 'off')
    const put = (key: string, state: unknown, version = 1) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language: 'uz', volume: 0.8, onboarded: true }, 2)
    const born = new Date()
    born.setFullYear(born.getFullYear() - 6)
    // a month past the birthday: no birthday party in the way (birthday.spec.ts has it)
    born.setDate(born.getDate() - 30)
    put(
      'kiddo.family',
      {
        children: [
          {
            id: 'kid',
            name: 'Aziz',
            birthDate: born.toISOString().slice(0, 10),
            celebratedLevel: 6,
            gender: 'boy',
            mascot: 'boy',
            dailyLimitMinutes: 600,
            createdAt: new Date().toISOString(),
            homeworks: [],
          },
        ],
        activeChildId: 'kid',
      },
      3,
    )
  })
}

test('find at home: the robot asks for a thing and "Topdim!" pays nuts once', async ({ page }) => {
  await child(page)
  await page.goto('/explore')
  await page.getByRole('link', { name: 'Uyda top' }).click()
  await expect(page).toHaveURL(/\/explore\/find-home$/)
  await expect(page.getByTestId('find-prompt')).toContainText('ko‘rsat')
  await expect(page.getByTestId('find-safe')).toHaveText('Ko‘rsatib ber, ko‘tarma!')
  await page.getByRole('button', { name: 'Topdim!' }).click()
  await expect(page.getByTestId('find-result')).toContainText('+2 yong‘oq')
  await expect(page.getByTestId('find-progress')).toContainText('1 / 3')
  // a second press the same day only praises
  await page.getByRole('button', { name: 'Topdim!' }).click()
  await expect(page.getByTestId('find-result')).toContainText('Bugun buni topding')
})

test('own story: four picture steps, then the story plays to the end', async ({ page }) => {
  await child(page)
  await page.goto('/learn')
  await page.getByRole('link', { name: 'O‘z ertagim' }).click()
  await expect(page.getByTestId('my-story-prompt')).toHaveText('Ertak qahramoni kim bo‘ladi?')
  for (const id of ['rabbit', 'space', 'lantern', 'friend']) {
    await page.getByTestId(`my-story-choice-${id}`).click()
  }
  const text = page.getByTestId('my-story-text')
  await expect(text).toContainText('Bir bor ekan, kichkina quyoncha bor ekan.')
  for (let card = 0; card < 3; card += 1) await page.getByTestId('my-story-next').click()
  await expect(text).toContainText('Yo‘lda do‘stimiz tipratikanni uchratdi.')
  await expect(text).toContainText('Ertak shu yerda tugadi!')
  await expect(page.getByTestId('my-story-again')).toBeVisible()
})

test('own story: twelve cards at every step, new heroes and endings fit a small phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await child(page)
  await page.goto('/learn/my-story')
  for (const id of ['unicorn', 'castle', 'paintbrush', 'treasure']) {
    await expect(page.getByRole('list').first().getByRole('button')).toHaveCount(12)
    await page.getByTestId(`my-story-choice-${id}`).click()
  }
  const text = page.getByTestId('my-story-text')
  await expect(text).toContainText('Bir bor ekan, sehrli yakkashox bor ekan.')
  for (let card = 0; card < 3; card += 1) await page.getByTestId('my-story-next').click()
  await expect(text).toContainText('Do‘stimiz oltin xazina topdi.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('three-language word: each word in its own language, tapped one by one', async ({ page }) => {
  await child(page)
  await page.goto('/learn')
  await page.getByRole('link', { name: 'Uch tilli so‘z' }).click()
  await expect(page).toHaveURL(/\/learn\/three-words$/)
  for (const [language, word] of [
    ['uz', 'Olma'],
    ['ru', 'Яблоко'],
    ['en', 'Apple'],
  ] as const) {
    const button = page.getByTestId(`tri-word-${language}`)
    await expect(button.locator(`[lang="${language}"]`)).toHaveText(word)
    await button.click()
  }
  await page.getByTestId('tri-next').click()
  await expect(page.getByTestId('tri-word-ru').locator('[lang="ru"]')).toHaveText('Кот')
  await expect(page.getByTestId('tri-counter')).toHaveText('2 / 30')
})

test('printable sheets: the parent opens an A4 sheet and the print dialog', async ({ page }) => {
  // a fixed Math.random: the parent gate asks 12 × 3; window.print is recorded, not opened
  await page.addInitScript(() => {
    Math.random = () => 0
    ;(window as unknown as { printed: number }).printed = 0
    window.print = () => {
      ;(window as unknown as { printed: number }).printed += 1
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: '6', exact: true }).click()
  await page.getByRole('button', { name: 'Tekshirish' }).click()
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
  await page.getByRole('textbox', { name: 'Ismi' }).fill('Lola')
  const born = new Date()
  born.setFullYear(born.getFullYear() - 5)
  born.setDate(born.getDate() - 30)
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('button', { name: 'Lola profilini tahrirlash' })).toBeVisible()

  await page.getByRole('tab', { name: 'Uy vazifasi' }).click()
  const panel = page.locator('#worksheets')
  await expect(panel.getByRole('heading', { name: 'Chop etiladigan varaqlar' })).toBeVisible()
  await panel.getByRole('radio', { name: 'Harflarni chizish' }).click()
  await panel.getByRole('radio', { name: 'English' }).click()
  await page.getByTestId('worksheet-open').click()

  await expect(page).toHaveURL(/\/parent\/print\/letters\?lang=en$/)
  const sheet = page.getByTestId('worksheet')
  await expect(sheet).toBeVisible()
  await expect(page.getByTestId('sheet-name')).toHaveText('Ism: Lola')
  await expect(sheet.locator('[data-letter]')).toHaveCount(26)
  // on a phone the sheet fits the screen: no sideways scrolling
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
  await page.getByTestId('sheet-print').click()
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1)

  // printed, the sheet is exactly one A4 page (the rest of the page is hidden)
  await page.emulateMedia({ media: 'print' })
  const pdf = (await page.pdf({ preferCSSPageSize: true, printBackground: true })).toString(
    'latin1',
  )
  expect(pdf.match(/\/Type\s*\/Page(?!s)/g)?.length).toBe(1)
  // A4 portrait in points (595 × 842)
  expect(pdf).toMatch(/\/MediaBox\s*\[\s*0\s+0\s+59[45](\.\d+)?\s+84[12](\.\d+)?\s*\]/)
})
