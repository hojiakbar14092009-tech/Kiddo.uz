/*
 * Real Kiddo screens for the ad, in uz, ru and en, at 1080×2338 (a 390×844
 * phone at 2.77×). Run against a preview of the app:
 *
 *   npm run build && npx vite preview --port 4180 --strictPort
 *   node marketing/ad-clip/capture.cjs marketing/ad-clip/public/shots
 *
 * Writes <lang>-home, -intro, -question and -report.png. The report belongs
 * to a demo child, "Madina", made in the parent area and given a few days of
 * play in local storage (the same fields e2e/parent-dashboard.spec.ts seeds).
 */
const { chromium } = require('playwright')
const path = require('node:path')

const BASE = 'http://localhost:4180'
const OUT = path.resolve(process.argv[2] || 'public/shots')
const STATE = path.resolve(__dirname, '../../e2e/state/onboarded.json')
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2.77,
  storageState: STATE,
}
const MORNING = new Date('2026-11-03T10:15:00+05:00')

const setLanguage = (page, lang) =>
  page.evaluate((l) => {
    const settings = JSON.parse(localStorage.getItem('kiddo.settings'))
    settings.state.language = l
    localStorage.setItem('kiddo.settings', JSON.stringify(settings))
  }, lang)

const shot = async (page, name, wait = 1200) => {
  await page.waitForTimeout(wait)
  await page.screenshot({ path: path.join(OUT, `${name}.png`) })
  console.log(name)
}

/** Home in the morning, the letter card and its question, for a guest. */
async function childScreens(browser, lang) {
  const context = await browser.newContext(PHONE)
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  await page.clock.install({ time: MORNING })
  await page.addInitScript(() => {
    Math.random = () => 0.3
  })
  await page.goto(BASE)
  await setLanguage(page, lang)
  await page.goto(`${BASE}/home`)
  await shot(page, `${lang}-home`, 6000)
  await page.locator('main button, main a').first().click()
  await shot(page, `${lang}-intro`, 3500)
  await page
    .locator('main button')
    .filter({ hasText: /Topamiz|Ищем|find/i })
    .first()
    .click()
  await shot(page, `${lang}-question`, 2500)
  await context.close()
}

/** The parent report for a demo child with a few days of play. */
async function reportScreens(browser) {
  const context = await browser.newContext(PHONE)
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  // the grown-ups question is then always 12 × 3
  await page.addInitScript(() => {
    Math.random = () => 0
  })
  const gate = async (check) => {
    await page.getByRole('button', { name: '3', exact: true }).click()
    await page.getByRole('button', { name: '6', exact: true }).click()
    await page.getByRole('button', { name: check }).click()
  }
  await page.goto(BASE)
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await page.waitForURL(/\/home$/)
  await page.getByRole('link', { name: 'Ota-ona bo‘limi' }).click()
  await gate('Tekshirish')
  await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
  await page.getByRole('textbox', { name: 'Ismi' }).fill('Madina')
  const born = new Date()
  born.setFullYear(born.getFullYear() - 5)
  born.setDate(born.getDate() - 40)
  await page.getByLabel(/^Tug‘ilgan kuni/).fill(born.toISOString().slice(0, 10))
  await page.getByRole('button', { name: 'Saqlash' }).click()
  await page.waitForTimeout(1000)
  await page.evaluate(() => {
    const id = JSON.parse(localStorage.getItem('kiddo.family')).state.children[0].id
    const now = new Date()
    const iso = (m) => new Date(now.getTime() - m * 60000).toISOString()
    const day = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const runs = [
      {
        id: 'lab-1',
        activity: 'math-lab:objects:L2',
        strand: 'number',
        at: iso(40),
        stars: 2,
        independent: 4,
        total: 5,
      },
      {
        id: 'story-1',
        activity: 'story:lost-lamb',
        strand: 'language',
        at: iso(25),
        stars: 3,
        independent: 3,
        total: 3,
      },
      {
        id: 'dino-1',
        activity: 'dino:quiz:L2',
        strand: 'science',
        at: iso(10),
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
        at: iso(25),
      },
    ]
    const universe = {
      balances: { star: 8, crystal: 0, seed: 0, part: 0, scroll: 0, key: 0 },
      ledger: { entries, keys: entries.map((e) => `${e.resource}|${e.reason}|${e.refId}`) },
      best: { 'story:lost-lamb': 3, 'math-lab:objects:L2': 2, 'dino:quiz:L2': 3 },
      stats: {
        activities: 3,
        byStrand: { number: 1, language: 1, science: 1 },
        earned: { star: 8 },
        daysActive: 5,
        lastDay: day(now),
      },
      partsDay: null,
      processed: runs.map((r) => r.id).reverse(),
      awards: [],
      achievements: { bookworm: 'bronze' },
      buildings: { 'math-land': 1 },
      questsClaimed: [],
      strands: { number: { level: 2, streak: 2, runs: 3, independent: 12, total: 15 } },
      recent: [...runs].reverse(),
      mistakes: [],
    }
    localStorage.setItem(
      'kiddo.universe',
      JSON.stringify({ state: { byChild: { [id]: universe } }, version: 1 }),
    )
    const progress = JSON.parse(
      localStorage.getItem('kiddo.progress') ?? '{"state":{"byChild":{}},"version":3}',
    )
    const minutes = {}
    ;[14, 12, 16, 11, 13].forEach((m, k) => {
      minutes[day(new Date(now.getTime() - k * 86400000))] = m
    })
    progress.state.byChild[id] = {
      ...(progress.state.byChild[id] ?? {}),
      coins: 0,
      learned: {},
      struggles: {},
      stickers: [],
      results: [],
      minutesByDay: minutes,
      outfits: [],
      wearing: {},
      pets: [],
      pet: null,
    }
    localStorage.setItem('kiddo.progress', JSON.stringify(progress))
  })
  const labels = {
    uz: ['Tekshirish', 'Hisobot'],
    ru: ['Проверить', 'Отчёт'],
    en: ['Check', 'Report'],
  }
  for (const [lang, [check, report]] of Object.entries(labels)) {
    await setLanguage(page, lang)
    await page.goto(`${BASE}/parent/dashboard?tab=report`)
    await page.waitForTimeout(1500)
    await gate(check)
    await page.getByRole('tab', { name: report }).click()
    await shot(page, `${lang}-report`, 2000)
  }
  await context.close()
}

/** The splash screen's symbol and wordmark, as SVG files next to the shots folder. */
async function logos(browser) {
  const page = await browser.newPage()
  await page.goto(`${BASE}/home`)
  await page.waitForTimeout(3500)
  const svgs = await page.locator('svg[aria-label="Kiddo"]').evaluateAll((all) =>
    all.map((svg) => {
      const copy = svg.cloneNode(true)
      copy.removeAttribute('class')
      copy.removeAttribute('style')
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      return { symbol: svg.hasAttribute('data-kiddo-symbol'), html: copy.outerHTML }
    }),
  )
  const fs = require('node:fs')
  fs.writeFileSync(path.join(OUT, '..', 'symbol.svg'), svgs.find((s) => s.symbol).html)
  fs.writeFileSync(path.join(OUT, '..', 'wordmark.svg'), svgs.filter((s) => !s.symbol).at(-1).html)
  console.log('symbol.svg, wordmark.svg')
  await page.close()
}

;(async () => {
  require('node:fs').mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  await logos(browser)
  for (const lang of ['uz', 'ru', 'en']) await childScreens(browser, lang)
  await reportScreens(browser)
  await browser.close()
})()
