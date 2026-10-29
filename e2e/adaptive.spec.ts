import { expect, test, type Page } from '@playwright/test'
import { passMathExample } from './lesson.ts'

/*
 * Phase 15 QA: age is a starting point, not a ceiling. A parent adds a
 * ten-year-old (allowed now), the parent report explains the learning focus,
 * and the child's Math Lab starts at the level the age band suggests; the
 * child's answers decide from there (unit tests cover the evidence rules).
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
})

async function parentAddsChild(page: Page, name: string, age: number) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
  await page.getByRole('button', { name: '9', exact: true }).click()
  await page.getByRole('button', { name: 'Tekshirish' }).click()
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
  await page.getByRole('textbox', { name: 'Ismi' }).fill(name)
  const born = new Date()
  born.setFullYear(born.getFullYear() - age)
  born.setDate(born.getDate() - 30)
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
  await expect(page.getByText(`Yoshi: ${age}. Barcha o‘yinlar ochiq`)).toBeVisible()
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('button', { name: `${name} profilini tahrirlash` })).toBeVisible()
}

test('a ten-year-old: no age ceiling, focus explained to the parent, Math Lab starts higher', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await parentAddsChild(page, 'Doniyor', 10)

  await page.getByRole('tab', { name: 'Hisobot' }).click()
  const focus = page.getByTestId('focus-current')
  await expect(focus).toContainText('Matematika: 5-daraja')
  await expect(focus).toContainText('Yosh guruhi 10-12')
  await expect(page.getByTestId('focus-reasons')).toContainText('yoshga qarab boshlandi')

  await page.getByRole('button', { name: 'Bolalarga' }).click()
  await page.getByRole('button', { name: /Doniyor/ }).click()
  await expect(page.getByRole('heading', { name: 'Salom, Doniyor!' })).toBeVisible()
  await page.getByRole('link', { name: 'Matematika shahri', exact: true }).click()
  await expect(page).toHaveURL(/\/math-lab$/)
  await expect(page.getByTestId('lab-level').first()).toContainText('5')
  await page.getByTestId('lab-start').click()
  await passMathExample(page)
  const question = page.getByTestId('lab-question')
  await expect(question).toHaveAttribute('data-level', '5')
  // no evidence yet: the ladder starts with the lowest help, four cards (or signs)
  await expect(question).toHaveAttribute('data-hints', 'step-by-step')
  expect(errors).toEqual([])
})
