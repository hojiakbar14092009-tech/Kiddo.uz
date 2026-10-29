import { expect, test, type Page } from '@playwright/test'
import { passLesson } from './lesson.ts'
import { CITIES, CITY_IDS, FOOD_IDS } from '../src/features/worlds/uzbekistan/content.ts'

/** "My Uzbekistan": the free path a guest can play, and a PRO item behind its lock. */

async function chooseUzbek(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

test('the map game: tap the matching city in every round and get a reward', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/worlds/uzbekistan')
  await page.getByTestId('uz-game-map').click()
  await expect(page).toHaveURL(/\/worlds\/uzbekistan\/map$/)
  // Learn Before Play: the labelled map, city by city, first
  await expect(page.getByTestId('lesson-map')).toBeVisible()
  await passLesson(page)

  // a guest starts at level 2: "Find …!" with three cities on the map, four rounds
  for (let round = 0; round < 4; round += 1) {
    await expect(page.getByTestId('uz-city')).toHaveCount(3)
    const prompt = (await page.getByTestId('uz-map-prompt').textContent()) ?? ''
    const answer = CITY_IDS.find((id) => CITIES[id].find.uz === prompt)
    expect(answer, prompt).toBeTruthy()
    await page.locator(`[data-testid="uz-city"][data-city="${answer}"]`).click()
    await expect(page.getByTestId('uz-feedback')).toContainText('Barakalla!')
    await page.getByRole('button', { name: round < 3 ? 'Keyingisi' : 'Tugatish' }).click()
  }
  await expect(page.getByTestId('activity-reward')).toBeVisible()
  await expect(page.getByText('Barakalla! Sen O‘zbekiston shaharlarini bilasan.')).toBeVisible()
})

test('the dasturxon can be set with taps only; a toy comes back', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/worlds/uzbekistan/table')
  await passLesson(page)
  for (let round = 0; round < 3; round += 1) {
    const items = page.getByTestId('uz-table-item')
    await expect(items.first()).toBeVisible()
    const ids = await items.evaluateAll((list) => list.map((el) => el.getAttribute('data-item')))
    if (round === 0) {
      const toy = ids.find((id) => !(FOOD_IDS as readonly (string | null)[]).includes(id))
      await page.locator(`[data-testid="uz-table-item"][data-item="${toy}"]`).click()
      await expect(page.getByTestId('uz-feedback')).toBeVisible()
      await expect(page.getByTestId('uz-cloth')).toHaveAttribute('data-count', '0')
    }
    for (const id of ids) {
      if (!(FOOD_IDS as readonly (string | null)[]).includes(id)) continue
      await page.locator(`[data-testid="uz-table-item"][data-item="${id}"]`).click()
    }
    await expect(page.getByTestId('uz-feedback')).toContainText('Dasturxon tayyor!')
    await page.getByRole('button', { name: round < 2 ? 'Keyingisi' : 'Tugatish' }).click()
  }
  await expect(page.getByTestId('activity-reward')).toBeVisible()
})

test('a PRO item shows its lock and does not open on Free', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/worlds/uzbekistan')
  const patterns = page.getByRole('button', { name: 'Naqshlar (PRO)' })
  await expect(patterns).toHaveAttribute('data-locked', 'true')
  await patterns.click()
  await expect(page.getByText(/Bu sayohat PRO versiyada/)).toBeVisible()
  await expect(page).toHaveURL(/\/worlds\/uzbekistan$/)
  // a saved link shows the calm note, never the game
  await page.goto('/worlds/uzbekistan/patterns')
  await expect(page.getByTestId('uz-locked')).toBeVisible()
  await expect(page.getByTestId('uz-pattern-row')).toHaveCount(0)
})

test('a free landmark opens with its picture and three facts', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/worlds/uzbekistan/explore/registan')
  await expect(page.getByTestId('explorer')).toBeVisible()
  await expect(page.getByTestId('uz-facts').getByRole('listitem')).toHaveCount(3)
})
