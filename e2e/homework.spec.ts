import { expect, test, type Page } from '@playwright/test'
import { passMathExample } from './lesson.ts'

/*
 * Phase 23: a parent gives an activity as homework; the child sees it first on
 * the home screen, plays it, and it counts by itself; the parent sees it done.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
})

const SIGN_LABEL: Record<string, string> = { '<': 'kichik', '>': 'katta', '=': 'teng' }

async function parentArea(page: Page) {
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await solveGate(page)
}

/** A fresh page load asks the grown-ups question again (3 × 3 with this Math.random). */
async function solveGate(page: Page) {
  await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
  await page.getByRole('button', { name: '9', exact: true }).click()
  await page.getByRole('button', { name: 'Tekshirish' }).click()
}

test('activity homework: given by the parent, played by the child, counted by itself', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await parentArea(page)
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
  await page.getByRole('textbox', { name: 'Ismi' }).fill('Lola')
  const born = new Date()
  born.setFullYear(born.getFullYear() - 6)
  // a month past the birthday: no birthday party in the way (birthday.spec.ts has it)
  born.setDate(born.getDate() - 30)
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('button', { name: 'Lola profilini tahrirlash' })).toBeVisible()

  // the homework tab: Math Lab, once, with a word for the child
  await page.goto('/parent/dashboard?tab=homework')
  await solveGate(page)
  await page.getByTestId('hw-activity-mathLab').click()
  await page.getByRole('radio', { name: '1 marta' }).click()
  await page.getByTestId('hw-note').fill('Barakalla!')
  await page.getByTestId('hw-activity-assign').click()
  await expect(
    page.getByTestId('hw-item').filter({ hasText: 'Matematika laboratoriyasi' }),
  ).toBeVisible()
  await expect(page.getByTestId('hw-progress')).toHaveText(/0 \/ 1/)

  // the child: the homework comes first, one tap opens the Math Lab
  await page.getByRole('button', { name: 'Bolalarga' }).click()
  await page.getByRole('button', { name: /Lola/ }).click()
  const card = page.getByTestId('activity-homework')
  await expect(card).toContainText('Barakalla!')
  await card.click()
  await expect(page).toHaveURL(/\/math-lab$/)
  await page.getByTestId('lab-start').click()
  for (let step = 0; step < 6; step += 1) {
    await passMathExample(page, step)
    const question = page.getByTestId('lab-question')
    await expect(question).toHaveAttribute('data-step', String(step))
    const answer = (await question.getAttribute('data-answer'))!
    if ((await question.getAttribute('data-kind')) === 'drag') {
      for (let n = 0; n < Number(answer); n += 1)
        await page.getByTestId('lab-object').first().click()
      await page.getByTestId('lab-done').click()
    } else {
      const sign = SIGN_LABEL[answer]
      await (
        sign
          ? question.getByRole('button', { name: sign, exact: true })
          : question
              .getByRole('button', { name: answer, exact: true })
              .or(question.getByRole('button', { name: new RegExp(`^${answer} ta `) }))
      ).click()
    }
    if (step === 5 || (await page.getByTestId('lab-result').isVisible())) break
  }
  await expect(page.getByTestId('lab-result')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Uy vazifasi bajarildi! Barakalla!')).toBeVisible()

  // home: no open homework any more; the parent sees it done
  await page.goto('/home')
  await expect(page.getByTestId('activity-homework')).toHaveCount(0)
  await page.goto('/parent/dashboard?tab=homework')
  await solveGate(page)
  await expect(page.getByTestId('hw-progress')).toHaveText(/1 \/ 1/)
})
