import { expect, test, type Page } from '@playwright/test'
import { passLesson } from './lesson.ts'

/* Phases 62–67: the Games page (every game by subject) and the new games. */

async function child(page: Page, language: 'uz' | 'ru' | 'en' = 'uz') {
  await page.addInitScript((language) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem('kiddo.e2e.tours', 'off')
    const put = (key: string, state: unknown, version: number) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language, volume: 0, onboarded: true, guestTours: {} }, 2)
    put('kiddo.attention', { consent: 'denied', answeredAt: null, camera: false }, 1)
    const born = new Date()
    born.setFullYear(born.getFullYear() - 5)
    born.setDate(born.getDate() - 30)
    put(
      'kiddo.family',
      {
        children: [
          {
            id: 'k',
            name: 'Bek',
            birthDate: born.toISOString().slice(0, 10),
            celebratedLevel: 5,
            gender: 'boy',
            mascot: 'boy',
            dailyLimitMinutes: 600,
            createdAt: new Date().toISOString(),
            homeworks: [],
            birthdayGifts: [born.getFullYear() + 5],
          },
        ],
        activeChildId: 'k',
      },
      3,
    )
  }, language)
}

async function ready(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
}

test('Home leads to the Games page, where every subject has its games', async ({ page }) => {
  await child(page)
  await ready(page, '/home')
  await page.getByTestId('games-link').click()
  await expect(page).toHaveURL(/\/games$/)
  await expect(page.getByRole('heading', { level: 1, name: 'O‘yinlar' })).toBeVisible()
  for (const subject of ['Matematika', 'Harflar va so‘zlar', 'Tabiat va fan', 'Kosmos', 'Mantiq'])
    await expect(page.getByRole('heading', { level: 2, name: subject })).toBeVisible()
  await page.getByRole('link', { name: 'Magnit sehri' }).click()
  await expect(page).toHaveURL(/\/sci\/magnet$/)
})

for (const language of ['uz', 'ru', 'en'] as const) {
  test(`the Games page fits a 320 px phone (${language})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 })
    await child(page, language)
    await ready(page, '/games')
    const overflow = await page.evaluate(
      () => document.scrollingElement!.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
}

/** A mini-game: its rules and the try first (the first time), then it starts. */
async function start(page: Page) {
  await expect(page.getByTestId('lesson-deck').or(page.getByTestId('sci-start'))).toBeVisible()
  if (await page.getByTestId('lesson-deck').isVisible()) await passLesson(page)
  else await page.getByTestId('sci-start').click()
}

test('the magic scale: blocks even out the apples, five times', async ({ page }) => {
  test.setTimeout(60_000)
  await child(page)
  await ready(page, '/sci/scale')
  await start(page)
  const scale = page.locator('[data-balance]')
  for (const blocks of [[3], [2, 3], [1, 3], [3, 3, 1], [3, 3]]) {
    await expect(page.getByTestId('scale-add-1')).toBeEnabled()
    for (const weight of blocks) await page.getByTestId(`scale-add-${weight}`).click()
    await expect(scale).toHaveAttribute('data-balance', 'even')
  }
  await expect(page.getByTestId('sci-finished')).toBeVisible({ timeout: 15_000 })
})

test('the robot programmer: arrows lead it to the battery; a rock stops it', async ({ page }) => {
  // five levels, each walked step by step
  test.setTimeout(90_000)
  await child(page)
  await ready(page, '/sci/robot')
  await start(page)
  const robot = page.getByTestId('robot')
  // a wrong program bumps and comes back to the start
  await page.getByTestId('robot-down').click()
  await page.getByTestId('robot-go').click()
  await expect(page.getByText('Voy, to‘siq! Strelkani o‘zgartir.')).toBeVisible()
  await expect(robot).toHaveAttribute('data-x', '0')
  await page.getByRole('button', { name: /O‘chirish/ }).click()
  const levels: string[][] = [
    ['right', 'right'],
    ['up', 'up', 'up'],
    ['up', 'up', 'right', 'right'],
    ['right', 'right', 'right', 'down', 'down', 'down'],
    ['up', 'left', 'left', 'left', 'up', 'up'],
  ]
  for (const program of levels) {
    await expect(page.getByTestId('robot-go')).toBeDisabled()
    for (const move of program) await page.getByTestId(`robot-${move}`).click()
    await page.getByTestId('robot-go').click()
    await expect(page.getByText('Zo‘r! Robot batareyani topdi.')).toBeVisible({ timeout: 10_000 })
  }
  await expect(page.getByTestId('sci-finished')).toBeVisible({ timeout: 15_000 })
})

test('the word train: letters in order fill the wagons, five words', async ({ page }) => {
  test.setTimeout(90_000)
  await child(page)
  await ready(page, '/sci/train')
  await start(page)
  // a wrong first letter only wobbles
  await page.locator('[data-testid=tile-m]:enabled').first().click()
  await expect(page.getByText('Bu harf emas. Boshqasini bos.')).toBeVisible()
  for (const word of ['ari', 'non', 'olma', 'qor', 'baliq']) {
    await expect(page.getByTestId('train')).toHaveAttribute('data-word', '')
    for (const letter of word)
      await page.locator(`[data-testid=tile-${letter}]:enabled`).first().click()
    await expect(page.getByTestId('train')).toHaveAttribute('data-word', word)
  }
  await expect(page.getByTestId('sci-finished')).toBeVisible({ timeout: 15_000 })
})

test('the little shop: pay exactly, then count the change', async ({ page }) => {
  test.setTimeout(90_000)
  await child(page)
  await ready(page, '/sci/shop')
  await start(page)
  for (const coins of [
    [2, 1],
    [5, 1],
    [5, 2, 1],
  ]) {
    await expect(page.getByTestId('shop-sum')).toContainText('0')
    for (const coin of coins) await page.getByTestId(`shop-coin-${coin}`).click()
    await expect(page.getByText('Sotib olding! Rahmat.')).toBeVisible()
  }
  await page.getByTestId('shop-change-3').click()
  await expect(page.getByText('Yana bir sanab ko‘r.')).toBeVisible()
  await page.getByTestId('shop-change-2').click()
  await expect(page.getByText('Sotib olding! Rahmat.')).toBeVisible()
  await expect(page.getByTestId('shop-change-1')).toBeEnabled({ timeout: 5_000 })
  await expect(page.getByTestId('shop-question')).toContainText('4')
  await page.getByTestId('shop-change-1').click()
  await expect(page.getByTestId('sci-finished')).toBeVisible({ timeout: 15_000 })
})
