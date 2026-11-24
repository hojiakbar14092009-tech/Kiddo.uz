// Screen load times (B1 baseline, re-run in B5): a cold full load of each route on a
// Pixel 7 with the CPU slowed 4x (a weak Android), until the lazy screen replaced the
// loading screen (DOM ready; the opening overlay paints on top, so no FCP). Median of 3 fresh contexts. Needs a running build:
//   npx vite build --mode e2e && npx vite preview --port 4180
//   node scripts/measure-load.mjs [http://localhost:4180]
import { chromium, devices } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:4180'
const ROUTES = [
  '/home',
  '/learn',
  '/explore',
  '/alphabet',
  '/learn/math',
  '/learn/space',
  '/games',
  '/shop',
  '/studio',
  '/shorts',
  '/collection',
  '/parent',
]
const RUNS = 3
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

const browser = await chromium.launch()
const rows = []
for (const path of ROUTES) {
  const ready = []
  for (let i = 0; i < RUNS; i += 1) {
    const context = await browser.newContext(devices['Pixel 7'])
    const page = await context.newPage()
    // an onboarded family with one 6-year-old (as e2e/homework.spec.ts seeds it)
    await page.addInitScript(() => {
      const put = (key, state, version) =>
        localStorage.setItem(key, JSON.stringify({ state, version }))
      localStorage.setItem('kiddo.e2e.tours', 'off')
      put('kiddo.settings', { language: 'uz', volume: 0, onboarded: true, guestTours: {} }, 2)
      const born = new Date()
      born.setFullYear(born.getFullYear() - 6)
      born.setDate(born.getDate() - 30)
      const child = {
        id: 'kid-a',
        name: 'Aziza',
        birthDate: born.toISOString().slice(0, 10),
        celebratedLevel: 6,
        gender: 'girl',
        mascot: 'girl',
        dailyLimitMinutes: 600,
        createdAt: new Date().toISOString(),
        homeworks: [],
        birthdayGifts: [born.getFullYear() + 6],
      }
      put('kiddo.family', { children: [child], activeChildId: 'kid-a' }, 3)
    })
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await page.goto(BASE + path, { waitUntil: 'commit' })
    // the screen is there: no loading screen, and the app rendered more than the opening overlay
    await page.waitForFunction(
      () => {
        const root = document.getElementById('root')
        return (
          !document.querySelector('[data-loading-screen]') &&
          [...(root?.querySelectorAll('*') ?? [])].some(
            (n) => !n.closest('[data-splash]') && n.matches('h1, h2, button, a'),
          )
        )
      },
      null,
      { timeout: 30_000, polling: 'raf' },
    )
    ready.push(await page.evaluate(() => Math.round(performance.now())))
    const landed = new URL(page.url()).pathname
    // self-check: a redirect (e.g. to a gate or login) is measured, but named
    rows.push(landed === path ? null : `${path} -> ${landed}`)
    await context.close()
  }
  console.log(
    `${path.padEnd(14)} ready ${String(median(ready)).padStart(5)} ms   [${ready.join(', ')}]`,
  )
}
const redirects = [...new Set(rows.filter(Boolean))]
if (redirects.length) console.log('redirected:', redirects.join('; '))
await browser.close()
