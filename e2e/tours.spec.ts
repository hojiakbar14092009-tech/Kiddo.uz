import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 25 (full contract): guided discovery on the real Home, per child.
 * First visit: the full tour on the actual things; second: a short reminder;
 * then nothing. Another child starts with their own full tour.
 */

test.use({ viewport: { width: 390, height: 844 } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.removeItem('kiddo.e2e.tours')
    const put = (key: string, state: unknown, version: number) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language: 'uz', volume: 0, onboarded: true, guestTours: {} }, 2)
    const born = new Date()
    born.setFullYear(born.getFullYear() - 5)
    born.setDate(born.getDate() - 30)
    const homework = [
      {
        kind: 'letters',
        id: 'hw-1',
        language: 'uz',
        game: 'find-letter',
        letterIds: ['a'],
        assignedAt: new Date().toISOString(),
        completedAt: null,
        mistakes: null,
      },
    ]
    const child = (id: string, name: string) => ({
      id,
      name,
      birthDate: born.toISOString().slice(0, 10),
      celebratedLevel: 5,
      gender: 'girl',
      mascot: 'girl',
      dailyLimitMinutes: 600,
      createdAt: new Date().toISOString(),
      homeworks: id === 'kid-a' ? homework : [],
      birthdayGifts: [born.getFullYear() + 5],
    })
    put(
      'kiddo.family',
      { children: [child('kid-a', 'Aziza'), child('kid-b', 'Bobur')], activeChildId: 'kid-a' },
      3,
    )
  })
})

/** A game may first teach a new letter: the child meets it, then the board appears. */
async function meetLetters(page: Page) {
  const board = page.getByTestId('memory-board')
  for (let i = 0; i < 6 && !(await board.isVisible()); i += 1) {
    const go = page.getByTestId('letter-intro-go')
    await expect(go.or(board)).toBeVisible()
    if (await go.isVisible()) await go.click()
  }
  await expect(board).toBeVisible()
}

async function walkTour(page: Page) {
  const marks = page.getByTestId('coach-marks')
  await expect(marks).toBeVisible({ timeout: 15_000 })
  const steps: string[] = []
  while (await marks.isVisible()) {
    steps.push((await marks.getAttribute('data-step'))!)
    // the bubble never leaves the screen
    const box = (await page.getByRole('dialog').boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    await page.getByTestId('coach-next').click()
  }
  return steps
}

test('the Home tour: full the first time, a reminder the second, then none — per child', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/home')
  const first = await walkTour(page)
  expect(first).toEqual(['journey', 'plan', 'homework', 'coins', 'city', 'parent'])

  await page.reload()
  const second = await walkTour(page)
  expect(second).toEqual(['plan', 'homework'])

  await page.reload()
  await page.waitForTimeout(5000)
  await expect(page.getByTestId('coach-marks')).toHaveCount(0)

  // Bobur has not seen it: his own full tour, Aziza's count unchanged
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('kiddo.family')!) as {
      state: { activeChildId: string }
    }
    raw.state.activeChildId = 'kid-b'
    localStorage.setItem('kiddo.family', JSON.stringify(raw))
  })
  await page.reload()
  await expect(page.getByTestId('coach-marks')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('coach-marks')).toHaveAttribute('data-step', 'journey')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('coach-marks')).toHaveCount(0)
  const tours = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('kiddo.family')!) as {
      state: { children: { id: string; tours?: Record<string, number> }[] }
    }
    return Object.fromEntries(raw.state.children.map((c) => [c.id, c.tours ?? {}]))
  })
  expect(tours).toEqual({ 'kid-a': { home: 2 }, 'kid-b': { home: 1 } })
})

test('in a game: the answers, then the way home; leaving mid-way still counts', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/home')
  await page.keyboard.press('Escape') // Home's own tour: not this test's subject
  await page.goto('/tasks/memory')
  const marks = page.getByTestId('coach-marks')
  // during the letter lesson the tour waits: it begins with the answers
  await page.waitForTimeout(2500)
  await expect(marks).toHaveCount(0)
  await meetLetters(page)
  await expect(marks).toBeVisible({ timeout: 15_000 })
  await expect(marks).toHaveAttribute('data-step', 'answer')
  await expect(page.getByRole('dialog', { name: 'Javobni tanla' })).toBeVisible()
  // the board under the bubble still answers the child
  await page.getByTestId('coach-next').click()
  await expect(marks).toHaveAttribute('data-step', 'back')
  // the child leaves without finishing: the tour was seen anyway
  await page.goto('/home')
  const play = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('kiddo.family')!) as {
      state: { children: { id: string; tours?: Record<string, number> }[] }
    }
    return raw.state.children.find((c) => c.id === 'kid-a')?.tours?.play
  })
  expect(play).toBe(1)
  // the next game: only the short reminder (the answers)
  await page.goto('/tasks/memory')
  await meetLetters(page)
  await expect(marks).toBeVisible({ timeout: 15_000 })
  await expect(marks).toHaveAttribute('data-step', 'answer')
  await page.getByTestId('coach-next').click()
  await expect(marks).toHaveCount(0)
})
