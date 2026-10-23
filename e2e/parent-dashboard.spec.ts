import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

/** A fixed Math.random, so the parent gate asks 3 × 3 (as in kiddo.spec.ts). */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0
  })
})

async function solveParentGate(page: Page) {
  await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
  await page.getByRole('button', { name: '9', exact: true }).click()
  await page.getByRole('button', { name: 'Tekshirish' }).click()
}

/** Uzbek, demo parent, one five-year-old "Lola" made in the parent area; ends on the report. */
async function parentWithChild(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await solveParentGate(page)
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
  await page.getByRole('textbox', { name: 'Ismi' }).fill('Lola')
  const born = new Date()
  born.setFullYear(born.getFullYear() - 5)
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await expect(page.getByRole('button', { name: 'Lola profilini tahrirlash' })).toBeVisible()
  await page.getByRole('tab', { name: 'Hisobot' }).click()
}

/**
 * Some play of the child, written where the app keeps it (as finished Math
 * Lab runs, a story and a letter game would leave it), then a reload.
 */
async function seedPlay(page: Page) {
  await page.evaluate(() => {
    const family = JSON.parse(localStorage.getItem('kiddo.family') ?? '{}') as {
      state: { children: { id: string }[] }
    }
    const id = family.state.children[0]!.id
    const now = new Date()
    const iso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString()
    const day = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const runs = [
      {
        id: 'lab-1',
        activity: 'math-lab:objects:L2',
        strand: 'number',
        at: iso(30),
        stars: 1,
        independent: 2,
        total: 5,
      },
      {
        id: 'lab-2',
        activity: 'math-lab:objects:L2',
        strand: 'number',
        at: iso(20),
        stars: 1,
        independent: 2,
        total: 5,
      },
      {
        id: 'story-1',
        activity: 'story:lost-lamb',
        strand: 'language',
        at: iso(10),
        stars: 3,
        independent: 3,
        total: 3,
      },
      {
        id: 'dino-1',
        activity: 'dino:quiz:L2',
        strand: 'science',
        at: iso(5),
        stars: 3,
        independent: 5,
        total: 5,
      },
    ]
    const entries = [
      {
        id: 'e1',
        childKey: id,
        resource: 'star',
        amount: 3,
        reason: 'activity',
        refId: 'story-1',
        at: iso(10),
      },
      {
        id: 'e2',
        childKey: id,
        resource: 'crystal',
        amount: 1,
        reason: 'three-stars',
        refId: 'story:lost-lamb',
        at: iso(10),
      },
      {
        id: 'e3',
        childKey: id,
        resource: 'scroll',
        amount: 1,
        reason: 'tale',
        refId: 'story:lost-lamb',
        at: iso(10),
      },
    ]
    const universe = {
      balances: { star: 3, crystal: 1, seed: 0, part: 0, scroll: 1, key: 0 },
      ledger: {
        entries: [...entries].reverse(),
        keys: entries.map((e) => `${e.resource}|${e.reason}|${e.refId}`).reverse(),
      },
      best: { 'story:lost-lamb': 3, 'math-lab:objects:L2': 1, 'dino:quiz:L2': 3 },
      stats: {
        activities: 4,
        byStrand: { number: 2, language: 1, science: 1, social: 1 },
        earned: { star: 3, crystal: 1, scroll: 1 },
        daysActive: 1,
        lastDay: day(now),
      },
      partsDay: null,
      processed: runs.map((run) => run.id).reverse(),
      awards: [],
      achievements: { bookworm: 'bronze' },
      buildings: { 'math-land': 1 },
      questsClaimed: [],
      strands: {
        number: { level: 1, streak: 0, runs: 2, independent: 4, total: 10 },
        // one Feelings run so far: the level is still the age default, not shown
        social: { level: 2, streak: 1, runs: 1, independent: 4, total: 4 },
      },
      recent: [...runs].reverse(),
      mistakes: [
        { skill: 'sub:within5', strand: 'number', at: iso(20), activityId: 'lab-2' },
        { skill: 'sub:within5', strand: 'number', at: iso(30), activityId: 'lab-1' },
      ],
    }
    localStorage.setItem(
      'kiddo.universe',
      JSON.stringify({ state: { byChild: { [id]: universe } }, version: 1 }),
    )
    const progress = JSON.parse(
      localStorage.getItem('kiddo.progress') ?? '{"state":{"byChild":{}},"version":3}',
    ) as {
      state: { byChild: Record<string, Record<string, unknown>> }
    }
    progress.state.byChild[id] = {
      ...(progress.state.byChild[id] ?? {}),
      coins: 0,
      learned: {},
      struggles: {},
      stickers: [],
      results: [],
      minutesByDay: { [day(now)]: 18 },
      outfits: [],
      wearing: {},
      pets: [],
      pet: null,
    }
    localStorage.setItem('kiddo.progress', JSON.stringify(progress))
  })
  await page.reload()
  // a fresh page load asks the grown-ups question again
  await solveParentGate(page)
}

test('the parent dashboard shows calm empty panels for a new child', async ({ page }) => {
  await parentWithChild(page)
  await expect(page.getByRole('heading', { name: 'So‘nggi 7 kun', exact: true })).toBeVisible()
  await expect(page.getByText('Oxirgi 7 kunda hech narsa o‘ynalmadi.')).toBeVisible()
  await expect(
    page.getByText('Lola biroz o‘ynagach, ko‘nikmalar shu yerda ko‘rinadi.'),
  ).toBeVisible()
  await expect(page.getByTestId('data-location')).toHaveText(/Faqat shu qurilmada saqlanadi/)
  // no page-wide horizontal scroll
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('the parent dashboard shows a child’s week, skills, ideas and exports the data', async ({
  page,
}) => {
  await parentWithChild(page)
  await seedPlay(page)
  await expect(page).toHaveURL(/\/parent\/dashboard/)

  const week = page.locator('section', {
    has: page.getByRole('heading', { name: 'So‘nggi 7 kun', exact: true }),
  })
  await expect(week.getByText('Jami vaqt: 18 daq')).toBeVisible()
  await expect(week.getByText('Mashg‘ulotlar: 4')).toBeVisible()
  await expect(week.getByText('Kristallar: 1')).toBeVisible()
  await expect(week.getByRole('img', { name: /daqiqalar, jami 18/ })).toBeVisible()
  await week.getByText('Raqamlarni jadval ko‘rinishida ko‘rsatish').click()
  await expect(week.getByTestId('week-table').getByRole('row').last()).toContainText('18')

  await expect(page.getByTestId('strand-number')).toContainText('Endi boshlayapti')
  await expect(page.getByTestId('strand-number')).toContainText('40%')
  // one adaptive run is not a measurement yet: accuracy, but no level word
  await expect(page.getByTestId('strand-social')).toContainText('100%')
  await expect(page.getByTestId('strand-social')).not.toContainText(
    /boshlayapti|qilyapti|Ishonchli|Kuchli|Ilg‘or/,
  )
  await expect(page.getByTestId('played-list')).toContainText('Hikoya: Adashgan qo‘zichoq')
  await expect(page.getByTestId('played-list')).toContainText('Dinozavrlar: viktorina')
  await expect(page.getByTestId('suggestions')).toContainText('Ayirish')
  await expect(page.getByTestId('medals')).toContainText('Medallar: 12 tadan 1')
  await expect(page.getByTestId('city')).toContainText('Matematika shahri: 3 darajadan 1')

  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Bola ma’lumotlarini yuklab olish' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/^kiddo-lola-\d{4}-\d{2}-\d{2}\.json$/)
  const data = JSON.parse(await readFile((await download.path())!, 'utf8')) as {
    format: string
    storage: string
    profile: { name: string }
    universe: { recent: unknown[]; mistakes: unknown[] }
    progress: { minutesByDay: Record<string, number> }
    gallery: unknown[]
  }
  expect(data.format).toBe('kiddo-child-export')
  expect(data.storage).toBe('device')
  expect(data.profile.name).toBe('Lola')
  expect(data.universe.recent).toHaveLength(4)
  expect(data.universe.mistakes).toHaveLength(2)
  expect(Object.values(data.progress.minutesByDay)).toContain(18)
  expect(data.gallery).toEqual([])

  // a suggestion opens the matching activity
  await page.getByRole('link', { name: 'Sonlar va sanash – Lola uchun ochish' }).click()
  await expect(page).toHaveURL(/\/math-lab$/)
  // …played as Lola, the child of the report
  const active = await page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('kiddo.family') ?? '{}') as {
          state: { activeChildId: string | null; children: { id: string }[] }
        }
      ).state,
  )
  expect(active.activeChildId).toBe(active.children[0]!.id)
})
