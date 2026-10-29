import { expect, test, type Page } from '@playwright/test'
import { passLesson, passLessonIfShown } from './lesson.ts'

/** The Dinosaur world, entered through Kiddo City's Dino Park, as a guest (Free). */

const NAMES: Record<string, string> = {
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

async function chooseUzbek(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

/** Answers every quiz question right on the first try. */
async function playQuiz(page: Page) {
  const result = page.getByTestId('dino-result')
  for (let step = 0; step < 8; step += 1) {
    const question = page.locator(`[data-testid="quiz-question"][data-step="${step}"]`)
    await expect(question.or(result)).toBeVisible()
    if (await result.isVisible()) return
    const answer = (await question.getAttribute('data-answer'))!
    await question.getByRole('button', { name: NAMES[answer], exact: true }).click()
  }
}

test('a guest explores a dinosaur, digs up bones and finishes the quiz', async ({ page }) => {
  // three activities in a row (each answer waits for its praise)
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await chooseUzbek(page)
  await page.getByRole('link', { name: 'Dinozavrlar bog‘i' }).click()
  await expect(page).toHaveURL(/\/worlds\/dino$/)

  // explore: with WebGL the model opens in 3D (by itself or with the button) and is built;
  // without it the still picture stays with its note
  await page.getByTestId('dino-mode-explore').click()
  await page.getByTestId('dino-card-trex').click()
  await expect(page).toHaveURL(/\/worlds\/dino\/explore\/trex$/)
  const explorer = page.getByTestId('explorer')
  await expect(explorer).toBeVisible()
  const webgl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    return (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) !== null
  })
  const open3d = page.getByTestId('explorer-open-3d')
  if (webgl) {
    if ((await explorer.getAttribute('data-mode')) === 'still') await open3d.click()
    await expect(explorer).toHaveAttribute('data-mode', '3d')
    await expect(page.getByTestId('explorer-3d')).toHaveAttribute('data-ready', 'true')
  } else {
    await expect(explorer).toHaveAttribute('data-mode', 'still')
    await expect(open3d).toHaveCount(0)
  }
  await page.getByTestId('hotspot-teeth').click()
  await expect(page.getByTestId('dino-spot')).toContainText('Katta tishlar')
  expect(errors).toEqual([])

  // the dig: taps brush the sand away (no dragging needed), then the bone is matched
  await page.goto('/worlds/dino/dig')
  // Learn Before Play: the animals and their bones first
  await passLesson(page)
  await page.getByTestId('dig-start').click()
  for (let bone = 0; bone < 4; bone += 1) {
    const run = page.getByTestId('dig-run')
    if (!(await run.isVisible())) break
    const board = page.getByTestId('dig-board')
    for (let pass = 0; pass < 3; pass += 1) {
      if ((await run.getAttribute('data-uncovered')) === 'true') break
      const box = (await board.boundingBox())!
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          if ((await run.getAttribute('data-uncovered')) === 'true') break
          const x = box.x + ((col + 0.5 + pass * 0.3) / 5) * box.width
          const y = box.y + ((row + 0.5 + pass * 0.3) / 5) * box.height
          await page.mouse.click(
            Math.min(x, box.x + box.width - 2),
            Math.min(y, box.y + box.height - 2),
          )
        }
      }
    }
    await expect(run).toHaveAttribute('data-uncovered', 'true')
    await expect(page.getByTestId('dig-prompt')).toHaveText('Bu kimning suyagi?')
    const dino = (await run.getAttribute('data-dino'))!
    await run.getByRole('button', { name: NAMES[dino], exact: true }).click()
    // after the praise: the next bone, still under the sand, or the result
    await expect(
      page
        .locator('[data-testid="dig-run"][data-uncovered="false"]')
        .or(page.getByTestId('dino-result')),
    ).toBeVisible()
  }
  await expect(page.getByTestId('dino-result')).toBeVisible()
  await expect(page.getByTestId('activity-reward')).toBeVisible()

  // the quiz to its reward
  await page.getByRole('link', { name: 'Vodiyga qaytish' }).click()
  await page.getByTestId('dino-mode-quiz').click()
  await passLessonIfShown(page, 'quiz-start')
  await page.getByTestId('quiz-start').click()
  await playQuiz(page)
  await expect(page.getByTestId('dino-result')).toBeVisible()
  await expect(page.getByTestId('dino-score')).toHaveText('5 / 5 birinchi urinishda')
  await expect(page.getByTestId('activity-reward')).toContainText('yulduz')
  expect(errors).toEqual([])
})

test('a PRO dinosaur shows PRO on Free and does not open', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/worlds/dino/explore')
  const stego = page.getByTestId('dino-card-stegosaurus')
  await expect(stego).toHaveAccessibleName('Stegozavr (PRO)')
  await expect(page.getByTestId('dino-card-trex')).toHaveAccessibleName('Tiranozavr')
  await stego.click()
  await expect(page).toHaveURL(/\/worlds\/dino\/explore$/)
  await expect(
    page.getByText('Bu dinozavr PRO versiyada. Ota-onang yoqib berishi mumkin.'),
  ).toBeVisible()

  // its address alone does not open the model either
  await page.goto('/worlds/dino/explore/stegosaurus')
  await expect(page.getByTestId('dino-locked')).toBeVisible()
  await expect(page.getByTestId('explorer')).toHaveCount(0)
})
