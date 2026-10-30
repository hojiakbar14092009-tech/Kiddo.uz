import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 22: difficulty and visual maturity are separate. A 14-year-old gets
 * the calm older look (plain page, smaller corners, flatter press shadows),
 * a 4-year-old the toy-box one; the badge shows the real age.
 */

test.use({ viewport: { width: 390, height: 844 } })

async function seed(page: Page, age: number) {
  await page.addInitScript((age) => {
    localStorage.setItem('kiddo.e2e.tours', 'off')
    const put = (key: string, state: unknown, version: number) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language: 'uz', volume: 0, onboarded: true, guestTours: {} }, 2)
    const born = new Date()
    born.setFullYear(born.getFullYear() - age)
    born.setDate(born.getDate() - 30)
    const child = {
      id: 'k',
      name: 'Bek',
      birthDate: born.toISOString().slice(0, 10),
      celebratedLevel: Math.min(6, age),
      gender: 'boy',
      mascot: 'boy',
      dailyLimitMinutes: 600,
      createdAt: new Date().toISOString(),
      homeworks: [],
      birthdayGifts: [born.getFullYear() + age],
    }
    put('kiddo.family', { children: [child], activeChildId: 'k' }, 3)
  }, age)
}

async function look(page: Page) {
  await page.goto('/alphabet?tab=numbers')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  return page.evaluate(() => {
    const html = document.documentElement
    const body = getComputedStyle(document.body)
    const pressed = document.querySelector('.shadow-press, .shadow-press-sm')
    return {
      age: html.dataset.age,
      band: html.dataset.band,
      pattern: body.backgroundImage,
      shadow: pressed ? getComputedStyle(pressed).boxShadow : '',
    }
  })
}

test('a 4-year-old: the toy-box look', async ({ page }) => {
  await seed(page, 4)
  const style = await look(page)
  expect(style).toMatchObject({ age: '4', band: '3-4' })
  expect(style.pattern).not.toBe('none')
})

test('a 14-year-old: easy work, the older look, the real age', async ({ page }) => {
  await seed(page, 14)
  const style = await look(page)
  expect(style).toMatchObject({ age: '6', band: '13-15', pattern: 'none' })
  // the press shadows are the flat older ones (never the 4–6 px toy press)
  expect(style.shadow).toMatch(/ [23]px 0px/)
  await page.goto('/home')
  await expect(page.getByText('14 yosh')).toBeVisible({ timeout: 30_000 })
})
