import { expect, test, type Locator, type Page } from '@playwright/test'
import { passMathExample } from './lesson.ts'

/**
 * A repeatable Math.random. `0` is constant (the parent gate then asks 3 × 3);
 * any other seed is a small LCG, so the questions, objects and options differ.
 */
async function seedRandom(page: Page, seed: number) {
  await page.addInitScript((start) => {
    if (start === 0) {
      Math.random = () => 0
      return
    }
    let state = start
    Math.random = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
  }, seed)
}

/** A guest (Math Lab level 2) on the city screen, in Uzbek. */
async function guest(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

/** A four-year-old (Math Lab level 1) made in the parent area, then chosen on the child screen. */
async function fourYearOld(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
  await page.getByRole('button', { name: '9', exact: true }).click()
  await page.getByRole('button', { name: 'Tekshirish' }).click()
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()

  await page.getByRole('textbox', { name: 'Ismi' }).fill('Lola')
  const born = new Date()
  born.setFullYear(born.getFullYear() - 4)
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('button', { name: 'Lola profilini tahrirlash' })).toBeVisible()
  await page.getByRole('button', { name: 'Bolalarga' }).click()
  await page.getByRole('button', { name: /Lola/ }).click()
  await expect(page.getByRole('heading', { name: 'Salom, Lola!' })).toBeVisible()
}

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

function answerCard(question: Locator, answer: string): Locator {
  const label = SIGN_LABEL[answer]
  if (label) return question.getByRole('button', { name: label, exact: true })
  return question
    .getByRole('button', { name: answer, exact: true })
    .or(question.getByRole('button', { name: new RegExp(`^${answer} ta `) }))
}

/** Drags the first object onto the basket with a real pointer (mouse or finger). */
async function dragOneToBasket(page: Page) {
  const object = page.getByTestId('lab-object').first()
  const basket = page.getByTestId('lab-basket')
  const from = (await object.boundingBox())!
  const to = (await basket.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2, { steps: 3 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 })
  await page.mouse.up()
}

/** Answers the current question right; a basket question with one tap per object. */
async function answerRight(page: Page) {
  await passMathExample(page)
  const question = page.getByTestId('lab-question')
  const kind = await question.getAttribute('data-kind')
  const answer = (await question.getAttribute('data-answer'))!
  if (kind === 'drag') {
    for (let n = 0; n < Number(answer); n += 1) await page.getByTestId('lab-object').first().click()
    await expect(page.getByTestId('lab-basket')).toHaveAttribute('data-count', answer)
    await page.getByTestId('lab-done').click()
  } else {
    await answerCard(question, answer).click()
  }
}

/** Is the whole element inside the viewport (nothing to scroll to)? */
async function inView(locator: Locator) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth
  })
}

test('Math Lab: a four-year-old fills the basket (drag and tap) and finishes a session', async ({
  page,
}) => {
  await seedRandom(page, 0)
  await fourYearOld(page)
  // Math Land in Kiddo City opens the Math Lab
  await page.getByRole('link', { name: 'Matematika shahri' }).click()
  await expect(page).toHaveURL(/\/math-lab$/)
  // level 1 stays pictorial: no level number
  await expect(page.getByTestId('lab-level')).toHaveCount(0)
  await page.getByTestId('lab-start').click()

  for (let step = 0; step < 5; step += 1) {
    await passMathExample(page, step)
    const question = page.getByTestId('lab-question')
    await expect(question).toHaveAttribute('data-step', String(step))
    await expect(question).toHaveAttribute('data-level', '1')
    const kind = await question.getAttribute('data-kind')
    const answer = (await question.getAttribute('data-answer'))!

    if (kind === 'drag') {
      expect(step).toBe(0)
      // the first one with a drag, the rest with one tap each (straight into the basket)
      await dragOneToBasket(page)
      await expect(page.getByTestId('lab-basket')).toHaveAttribute('data-count', '1')
      for (let n = 1; n < Number(answer); n += 1) {
        await page.getByTestId('lab-object').first().click()
        await expect(page.getByTestId('lab-basket')).toHaveAttribute('data-count', String(n + 1))
      }
      await expect(page.getByTestId('lab-basket')).toHaveAttribute('data-count', answer)
      await page.getByTestId('lab-done').click()
    } else {
      await answerCard(question, answer).click()
    }
  }

  const result = page.getByTestId('lab-result')
  await expect(result).toBeVisible({ timeout: 5_000 })
  await expect(result.getByTestId('lab-score')).toHaveText('Mustaqil to‘g‘ri javoblar: 5/5')
  await expect(result.getByTestId('activity-reward')).toContainText('+3 yulduz')

  // nothing on the result screen is cut off or pushed out sideways
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width)
})

for (const seed of [7, 4242]) {
  test(`Math Lab: a guest plays a whole level-2 session (seed ${seed})`, async ({ page }) => {
    await seedRandom(page, seed)
    await guest(page)
    await page.goto('/math-lab')
    // one heading with the lab's name: the top bar's
    await expect(page.getByRole('heading', { name: 'Matematika laboratoriyasi' })).toHaveCount(1)
    await page.getByTestId('lab-start').click()
    for (let step = 0; step < 5; step += 1) {
      await passMathExample(page, step)
      const question = page.getByTestId('lab-question')
      await expect(question).toHaveAttribute('data-step', String(step))
      await expect(question).toHaveAttribute('data-level', '2')
      if (step === 0) await expect(question).toHaveAttribute('data-kind', 'drag')
      await answerRight(page)
    }
    const result = page.getByTestId('lab-result')
    await expect(result).toBeVisible({ timeout: 5_000 })
    await expect(result.getByTestId('lab-score')).toHaveText('Mustaqil to‘g‘ri javoblar: 5/5')
  })
}

test.describe('a small phone (320×568)', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  for (const seed of [0, 7, 99, 4242]) {
    test(`the basket shows with all the objects when the task opens (seed ${seed})`, async ({
      page,
    }) => {
      await seedRandom(page, seed)
      await guest(page)
      await page.goto('/math-lab')
      await page.getByTestId('lab-start').click()
      await passMathExample(page)
      const question = page.getByTestId('lab-question')
      await expect(question).toHaveAttribute('data-kind', 'drag')
      const basket = page.getByTestId('lab-basket')
      // basket, every object and "Done" are on screen without scrolling
      expect(await inView(basket)).toBe(true)
      expect(await inView(page.getByTestId('lab-done'))).toBe(true)
      for (const object of await page.getByTestId('lab-object').all()) {
        expect(await inView(object)).toBe(true)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)

      // one tap puts one in; the minus takes it out again
      const target = Number(await question.getAttribute('data-answer'))
      await page.getByTestId('lab-object').first().click()
      await expect(basket).toHaveAttribute('data-count', '1')
      await page.getByTestId('lab-take-out').click()
      await expect(basket).toHaveAttribute('data-count', '0')
      for (let n = 0; n < target; n += 1) await page.getByTestId('lab-object').first().click()
      await expect(basket).toHaveAttribute('data-count', String(target))
      expect(await inView(page.getByTestId('lab-done'))).toBe(true)
      await page.getByTestId('lab-done').click()
      await passMathExample(page, 1)
      await expect(question).toHaveAttribute('data-step', '1')
    })
  }
})

test.describe('no maximum age (Phase 22), on a small phone', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('a 40-year-old learner gets the profile, a mastery step and big numbers that fit', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    // a constant Math.random: the grown-ups question is 3 × 3
    await seedRandom(page, 0)
    await page.goto('/')
    await page.getByRole('button', { name: 'O‘zbekcha' }).click()
    await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
    await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
    await page.getByRole('button', { name: '9', exact: true }).click()
    await page.getByRole('button', { name: 'Tekshirish' }).click()
    await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
    await page.getByRole('textbox', { name: 'Ismi' }).fill('Dilshod')
    const born = new Date()
    born.setFullYear(born.getFullYear() - 40)
    await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
    await page.getByRole('button', { name: 'Saqlash' }).click()
    await expect(page.getByRole('button', { name: 'Dilshod profilini tahrirlash' })).toBeVisible()
    await page.getByRole('button', { name: 'Bolalarga' }).click()
    await page.getByRole('button', { name: /Dilshod/ }).click()

    await page.goto('/math-lab')
    await expect(page.getByTestId('lab-level').first()).toHaveAttribute('data-mastery', '3')
    await page.getByTestId('lab-start').click()
    await passMathExample(page, 0)
    const question = page.getByTestId('lab-question')
    await expect(question).toHaveAttribute('data-level', '5')
    await fitsPhone(page)

    // a whole session, every answer right
    for (let step = 0; step < 6; step += 1) {
      await passMathExample(page, step)
      await expect(question).toHaveAttribute('data-step', String(step))
      await answerRight(page)
    }
    await expect(page.getByTestId('lab-result')).toBeVisible({ timeout: 5_000 })

    // many sessions later (saved as the app saves it): mastery 11, numbers up to 99 999
    await page.evaluate(() => {
      const family = JSON.parse(localStorage.getItem('kiddo.family')!)
      const id = family.state.activeChildId as string
      const universe = JSON.parse(localStorage.getItem('kiddo.universe')!)
      const child = universe.state.byChild[id]
      child.strands = {
        ...child.strands,
        number: { level: 5, mastery: 11, streak: 0, runs: 30, independent: 180, total: 180 },
      }
      localStorage.setItem('kiddo.universe', JSON.stringify(universe))
    })
    await page.goto('/math-lab')
    await expect(page.getByTestId('lab-level').first()).toHaveAttribute('data-mastery', '11')
    await page.getByTestId('lab-start').click()
    await passMathExample(page, 0)
    const tokens = await page.getByTestId('lab-equation').locator(':scope > span').allTextContents()
    const biggest = Math.max(...tokens.map((t) => Number(t.replace(/\D/g, '')) || 0))
    expect(biggest).toBeGreaterThanOrEqual(10_000)
    await fitsPhone(page)
    // two slips: the help shows the numbers in columns, and it fits too
    const answer = await question.getAttribute('data-answer')
    for (const card of (await question.getByRole('button').all()).slice(0, 3)) {
      if ((await card.getAttribute('aria-label')) === answer) continue
      if (await card.isEnabled()) await card.click()
    }
    const columns = page.getByRole('img', { name: /= \?$/ })
    await expect(columns.first()).toBeVisible()
    await fitsPhone(page)
  })
})

/** Nothing pushes the page sideways, and every answer card shows its whole number. */
async function fitsPhone(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  for (const card of await page.getByTestId('lab-question').getByRole('button').all()) {
    expect(await card.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  }
}
