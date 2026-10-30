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

test('a new 14-year-old: a short neutral placement, then foundational work in the grown-up look', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await seed(page, 14)
  await page.goto('/math-lab')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByTestId('placement-intro')).toContainText('Qayerdan boshlashni')
  await page.getByTestId('placement-start').click()
  // keyboard reaches the neutral way out of an item
  await expect(page.getByTestId('placement-question')).toHaveAttribute('data-rung', 'easy')
  await page.getByTestId('placement-not-sure').focus()
  await page.keyboard.press('Enter')
  // one "I don't know yet" is not decisive: a second item of the same step, focus on it
  await expect(page.getByTestId('placement-question')).toHaveAttribute('data-attempt', '1')
  await expect(page.locator('#placement-prompt')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByTestId('placement-question').locator('button').first()).toBeFocused()
  await page.getByTestId('placement-not-sure').click()
  await expect(page.getByTestId('placement-done')).toBeVisible()
  await expect(page.locator('#placement-title')).toBeFocused()
  // no level, no score on the placement screens
  await expect(page.getByTestId('lab-level')).toHaveCount(0)
  await page.getByTestId('placement-go').click()
  // a new skill is first shown as a worked example (Learn Before Play)
  const question = page.locator('[data-testid="lab-question"]')
  const example = page.getByTestId('lab-intro-go')
  await expect(example.or(question)).toBeVisible()
  if (await example.isVisible()) await example.click()
  await expect(question).toHaveAttribute('data-level', '1')
  // easy work, grown-up look
  const band = await page.evaluate(() => document.documentElement.dataset.band)
  expect(band).toBe('13-15')
  // a reload does not ask again: the start is kept for this child
  await page.reload()
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  await expect(page.getByTestId('lab-start')).toBeVisible()
  await expect(page.getByTestId('placement-intro')).toHaveCount(0)
})

test('one slip in the placement is not decisive; each child has their own start', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.setItem('kiddo.e2e.tours', 'off')
    const put = (key: string, state: unknown, version: number) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language: 'uz', volume: 0, onboarded: true, guestTours: {} }, 2)
    const born = new Date()
    born.setFullYear(born.getFullYear() - 14)
    born.setDate(born.getDate() - 30)
    const child = (id: string, name: string) => ({
      id,
      name,
      birthDate: born.toISOString().slice(0, 10),
      celebratedLevel: 6,
      gender: 'boy',
      mascot: 'boy',
      dailyLimitMinutes: 600,
      createdAt: new Date().toISOString(),
      homeworks: [],
      birthdayGifts: [born.getFullYear() + 14],
    })
    put(
      'kiddo.family',
      { children: [child('a', 'Aziz'), child('b', 'Bobur')], activeChildId: 'a' },
      3,
    )
  })
  const switchTo = async (id: string) => {
    await page.evaluate((id) => {
      const raw = JSON.parse(localStorage.getItem('kiddo.family')!) as {
        state: { activeChildId: string }
      }
      raw.state.activeChildId = id
      localStorage.setItem('kiddo.family', JSON.stringify(raw))
    }, id)
    await page.reload()
    await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  }
  const answerRight = async () => {
    const probe = page.getByTestId('placement-question')
    const answer = await probe.getAttribute('data-answer')
    await probe.locator(`[data-choice="${answer}"]`).click()
  }

  await page.goto('/math-lab')
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  await page.getByTestId('placement-start').click()
  // one miss on the easy step, then right: the probe climbs on (not thrown to level 1)
  await page.getByTestId('placement-not-sure').click()
  await expect(page.getByTestId('placement-question')).toHaveAttribute('data-attempt', '1')
  await answerRight()
  await expect(page.getByTestId('placement-question')).toHaveAttribute('data-rung', 'medium')
  // two misses in a row on the medium step end it: a start at level 3
  await page.getByTestId('placement-not-sure').click()
  await page.getByTestId('placement-not-sure').click()
  await expect(page.getByTestId('placement-done')).toBeVisible()
  const placed = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('kiddo.universe') ?? '{}') as {
      state?: { byChild?: Record<string, { strands?: { number?: { level: number } } }> }
    }
    return raw.state?.byChild
  })
  expect(placed?.a?.strands?.number?.level).toBe(3)
  expect(placed?.b?.strands?.number).toBeUndefined()

  // Bobur: his own placement, Aziz's start untouched
  await switchTo('b')
  await expect(page.getByTestId('placement-intro')).toBeVisible()
  // back to Aziz: his start is kept, no second placement
  await switchTo('a')
  await expect(page.getByTestId('lab-start')).toBeVisible()
  await expect(page.getByTestId('placement-intro')).toHaveCount(0)
})
