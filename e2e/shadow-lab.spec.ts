import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 34: the Shadow Lab on a small phone — the shadow is projected from the
 * slider values (it changes as the object moves), the controls work with
 * touch and keyboard, a whole mission finishes, and nothing overflows.
 */

async function seedChild(page: Page, age: number) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.evaluate((age) => {
    const now = new Date()
    const born = new Date(now.getFullYear() - age, now.getMonth(), now.getDate() - 30)
    const family = JSON.parse(localStorage.getItem('kiddo.family') ?? '{"state":{},"version":3}')
    family.state.children = [
      {
        id: 'c1',
        name: 'Aziz',
        birthDate: born.toISOString().slice(0, 10),
        celebratedLevel: 6,
        gender: 'girl',
        mascot: 'girl',
        dailyLimitMinutes: 60,
        createdAt: '2026-01-01T00:00:00.000Z',
        birthdayGifts: [now.getFullYear()],
        tours: { home: 2, play: 2, reward: 2 },
      },
    ]
    family.state.activeChildId = 'c1'
    localStorage.setItem('kiddo.family', JSON.stringify(family))
  }, age)
}

test('a 5-year-old matches a shadow by moving the object nearer the lamp', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await seedChild(page, 5)
  await page.goto('/learn/space')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  await page.getByTestId('shadow-lab-link').click()
  await expect(page).toHaveURL(/\/shadow-lab$/)
  await page.getByTestId('shadow-start').click()

  const shadow = page.getByTestId('shadow-wall').locator('[data-shadow]')
  const before = await shadow.getAttribute('points')
  const slider = page.getByRole('slider', { name: 'Buyum chiroqdan uzoqligi' })
  await slider.focus()
  // the keyboard moves the object (7 → 3.5: seven steps of 0.5)
  for (let i = 0; i < 7; i += 1) await page.keyboard.press('ArrowLeft')
  await expect(slider).toHaveValue('3.5')
  expect(await shadow.getAttribute('points')).not.toBe(before)
  await page.getByTestId('shadow-check').click()
  await expect(page.getByTestId('shadow-verdict')).toHaveText('Zo‘r! Soya to‘g‘ri tushdi.')
  await expect(page.getByTestId('shadow-next')).toBeFocused()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('the light-only puzzle moves only the light, with the plus and minus buttons', async ({
  page,
}) => {
  await seedChild(page, 8)
  await page.goto('/shadow-lab')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  await page.getByTestId('shadow-start').click()
  await page.getByTestId('shadow-check').click()
  await page.getByTestId('shadow-check').click()
  await page.getByTestId('shadow-check').click()
  await page.getByRole('button', { name: 'Lumi ko‘rsatsin' }).click()
  await page.getByTestId('shadow-next').click()
  // views
  const choices = page.getByTestId('shadow-choices')
  await choices.locator(`[data-choice="${await choices.getAttribute('data-answer')}"]`).click()
  await page.getByTestId('shadow-next').click()
  // build: circle, square, square
  await page.locator('[data-slot="0"]').click()
  await page.locator('[data-slot="0"]').click()
  await page.locator('[data-slot="0"]').click()
  await page.locator('[data-slot="1"]').click()
  await page.locator('[data-slot="2"]').click()
  await page.getByTestId('shadow-check').click()
  await page.getByTestId('shadow-next').click()
  // light only: the object controls are not there
  await expect(page.getByTestId('shadow-puzzle')).toHaveAttribute('data-mode', 'light')
  await expect(page.locator('[data-control="distance"]')).toHaveCount(0)
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: 'Chiroq: chap — o‘ng: ko‘paytirish' }).click()
  }
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'Chiroq: past — yuqori: kamaytirish' }).click()
  }
  await page.getByTestId('shadow-check').click()
  await expect(page.getByTestId('shadow-verdict')).toHaveText('Zo‘r! Soya to‘g‘ri tushdi.')
})
