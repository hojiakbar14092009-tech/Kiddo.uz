import { expect, test, type Page } from '@playwright/test'

/*
 * The connected universe's signature flow, played as a child plays it, in
 * one visit (a guest's world lives as long as the page, so every move is an
 * in-app link or button, never a reload):
 * Math Lab (3 stars: crystal + part) → Spaceport (rocket) → Mars (rare seed)
 * → Practice Garden (plant) → science runs (the dinosaur quiz) → bloom →
 * Science Lab (experiment) → the journey's promised crystals.
 */

async function seedRandom(page: Page, seed: number) {
  await page.addInitScript((start) => {
    let state = start
    Math.random = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
  }, seed)
}

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

async function answerMathRight(page: Page) {
  const question = page.getByTestId('lab-question')
  const kind = await question.getAttribute('data-kind')
  const answer = (await question.getAttribute('data-answer'))!
  if (kind === 'drag') {
    for (let n = 0; n < Number(answer); n += 1) await page.getByTestId('lab-object').first().click()
    await expect(page.getByTestId('lab-basket')).toHaveAttribute('data-count', answer)
    await page.getByTestId('lab-done').click()
    return
  }
  const label = SIGN_LABEL[answer]
  const button = label
    ? question.getByRole('button', { name: label, exact: true })
    : question
        .getByRole('button', { name: answer, exact: true })
        .or(question.getByRole('button', { name: new RegExp(`^${answer} ta `) }))
  await button.click()
}

const DINO_NAMES: Record<string, string> = {
  trex: 'Tiranozavr',
  triceratops: 'Triseratops',
  stegosaurus: 'Stegozavr',
  brachiosaurus: 'Braxiozavr',
  pteranodon: 'Pteranodon',
  ankylosaurus: 'Ankilozavr',
  plant: 'O‘simlik',
  meat: 'Go‘sht',
  fish: 'Baliq',
}

async function playDinoQuiz(page: Page) {
  const result = page.getByTestId('dino-result')
  for (let step = 0; step < 8; step += 1) {
    const question = page.locator(`[data-testid="quiz-question"][data-step="${step}"]`)
    await expect(question.or(result)).toBeVisible()
    if (await result.isVisible()) return
    const answer = (await question.getAttribute('data-answer'))!
    await question.getByRole('button', { name: DINO_NAMES[answer], exact: true }).click()
  }
  await expect(result).toBeVisible()
}

const back = (page: Page) => page.getByRole('button', { name: 'Orqaga' }).first().click()

test('the first journey links maths, space, the garden, biology and the lab', async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await seedRandom(page, 7)
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)

  const card = page.getByTestId('journey-card')
  await expect(card).toHaveAttribute('data-done', '0')
  await expect(card).toContainText('Oxirida kristall: +2')
  // the science lab waits for the Mars flower
  await expect(page.getByTestId('building-/science-lab')).toContainText('Mars guli ochilganda')

  // 1. a maths challenge with three stars
  await card.getByTestId('journey-go').click()
  await expect(page).toHaveURL(/\/math-lab$/)
  await page.getByTestId('lab-start').click()
  for (let step = 0; step < 5; step += 1) {
    await expect(page.getByTestId('lab-question')).toHaveAttribute('data-step', String(step))
    await answerMathRight(page)
  }
  await expect(page.getByTestId('lab-result')).toBeVisible({ timeout: 5_000 })
  await expect(page.getByTestId('activity-reward')).toContainText('kristall')
  await back(page)
  await expect(page).toHaveURL(/\/home$/)
  await expect(card).toHaveAttribute('data-done', '1')

  // 2. the rocket, built with the crystal and the part
  await card.getByTestId('journey-go').click()
  await expect(page).toHaveURL(/\/spaceport$/)
  await page.getByTestId('build-rocket').click()
  await expect(page.getByTestId('rocket-level')).toHaveText('Raketa: 1-daraja')

  // 3. Mars: the rare seed under the rocks
  await page.getByTestId('fly-mars').click()
  await expect(page).toHaveURL(/\/spaceport\/mars$/)
  for (const rock of [0, 1, 2]) await page.getByTestId(`mars-rock-${rock}`).click()
  await page.getByTestId('take-seed').click()
  await expect(page.getByTestId('mars-found')).toBeVisible()

  // 4. planted in the Practice (Mistake) Garden
  await page.getByRole('link', { name: 'Mashq bog‘iga' }).click()
  await expect(page).toHaveURL(/\/mistake-garden$/)
  await page.getByTestId('plant-seed').click()
  await expect(page.getByTestId('mars-bed')).toHaveAttribute('data-stage', '0')
  await back(page)
  await expect(page).toHaveURL(/\/home$/)
  await expect(card).toHaveAttribute('data-done', '4')

  // 5. biology: three dinosaur quizzes done well make the flower grow
  await page.getByRole('link', { name: 'Dinozavrlar bog‘i' }).click()
  await page.getByTestId('dino-mode-quiz').click()
  await page.getByTestId('quiz-start').click()
  for (let quiz = 0; quiz < 3; quiz += 1) {
    if (quiz > 0) await page.getByTestId('dino-again').click()
    await playDinoQuiz(page)
  }
  await page.getByRole('link', { name: 'Vodiyga qaytish' }).click()
  await back(page)
  await expect(page).toHaveURL(/\/home$/)
  // the bloom opened the lab: the city shows it open, the journey moved on
  await expect(card).toHaveAttribute('data-done', '5')
  await expect(page.getByTestId('building-/science-lab')).not.toContainText('Mars guli ochilganda')

  // 6. the Science Lab's first experiment ends the journey
  await card.getByTestId('journey-go').click()
  await expect(page).toHaveURL(/\/science-lab$/)
  await page.getByTestId('lab-start').click()
  for (const answer of ['droplet', 'sun', 'sunflower', 'seedling']) {
    await page.getByTestId(`lab-option-${answer}`).click()
  }
  await expect(page.getByTestId('lab-finished')).toBeVisible()
  await page.getByRole('link', { name: 'Shaharga' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(card).toHaveAttribute('data-done', '6')
  await expect(card).toContainText('Sayohat tugadi!')
  expect(errors).toEqual([])
})
