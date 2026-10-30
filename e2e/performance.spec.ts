import { expect, test, type Page, type Request } from '@playwright/test'

/*
 * Phase 12: what a child's first screen downloads, as deterministic budgets
 * (request lists and bytes, never timings). The numbers come from the Phase 12
 * measurement of the production build (weak device: the 3D code is not used):
 *   scripts 301 KB → 271 KB, images 617 KB → 134 KB (393×852), transferred.
 * A budget may grow only with a reason written next to it.
 */
const BUDGET_KB = {
  /**
   * All JavaScript of the first screen. Phase 12: 300 (about 10 % above the
   * measured 271 KB). Raised to 340 on 2026-10-30 (Phase 32), with the reason:
   * Phases 13–31 put the connected universe, Kiddo City scenes, the journey,
   * homework, age profiles, rewards and the wardrobe on the everyday screens,
   * measured at 312 KB before Phase 22 and 320 KB at Phase 31 (the test had
   * not been run since). The new opening adds no pictures and removes the
   * splash pets. three.js and the other languages stay out (checked below).
   */
  scripts: 340,
  /**
   * All images of the first screen: the city icons in view, so it grows with
   * the screen (134 KB at 393×852, 169 KB on the test tablet incl. the splash
   * pets of that time; 617 KB before). Since Phase 32 the opening is vector only.
   */
  images: 200,
}

interface Loaded {
  url: string
  type: string
  bytes: number
}

async function child(page: Page, language: 'uz' | 'ru', strong = false) {
  await page.addInitScript(
    ({ language, strong }) => {
      if (strong) Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      localStorage.clear()
      localStorage.setItem('kiddo.e2e.tours', 'off')
      const put = (key: string, state: unknown, version = 1) =>
        localStorage.setItem(key, JSON.stringify({ state, version }))
      put('kiddo.settings', { language, volume: 0.8 })
      const born = new Date()
      born.setFullYear(born.getFullYear() - 6)
      // a month past the birthday: no birthday party in the way (birthday.spec.ts has it)
      born.setDate(born.getDate() - 30)
      put(
        'kiddo.family',
        {
          children: [
            {
              id: 'kid',
              name: 'Aziz',
              birthDate: born.toISOString().slice(0, 10),
              celebratedLevel: 6,
              gender: 'boy',
              mascot: 'boy',
              dailyLimitMinutes: 600,
              createdAt: new Date().toISOString(),
              homeworks: [],
            },
          ],
          activeChildId: 'kid',
        },
        3,
      )
    },
    { language, strong },
  )
}

/** Everything the page downloads from now on (body bytes as transferred). */
function record(page: Page): Loaded[] {
  const loaded: Loaded[] = []
  page.on('requestfinished', async (request: Request) => {
    const sizes = await request.sizes().catch(() => null)
    loaded.push({
      url: new URL(request.url()).pathname,
      type: request.resourceType(),
      bytes: sizes?.responseBodySize ?? 0,
    })
  })
  return loaded
}

const kb = (items: Loaded[], type: string) =>
  items.filter((item) => item.type === type).reduce((sum, item) => sum + item.bytes, 0) / 1024

test.describe('the first screen', () => {
  test('stays within its download budget and loads nothing it does not show', async ({ page }) => {
    await child(page, 'uz')
    const loaded = record(page)
    await page.goto('/home', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)

    expect(kb(loaded, 'script'), 'scripts KB').toBeLessThanOrEqual(BUDGET_KB.scripts)
    expect(kb(loaded, 'image'), 'images KB').toBeLessThanOrEqual(BUDGET_KB.images)
    const urls = loaded.map((item) => item.url)
    // one language's texts: the Russian and English chunks stay on the server
    expect(urls.filter((url) => /\/assets\/(ru|en)-[\w-]+\.js$/.test(url))).toEqual([])
    // the opening is vector only (Phase 32): it loads no pet or world pictures
    expect(urls.filter((url) => url.startsWith('/pets/'))).toEqual([])
    // no sound before the child has touched anything
    expect(urls.filter((url) => url.endsWith('.mp3'))).toEqual([])
    // a weak device never downloads three.js
    expect(urls.filter((url) => /three|react-three-fiber/.test(url))).toEqual([])
  })

  test('a Russian-speaking child gets Russian texts from the first paint', async ({ page }) => {
    await child(page, 'ru')
    const loaded = record(page)
    await page.goto('/home', { waitUntil: 'networkidle' })
    const urls = loaded.map((item) => item.url)
    expect(urls.some((url) => /\/assets\/ru-[\w-]+\.js$/.test(url))).toBe(true)
    expect(urls.some((url) => /\/assets\/en-[\w-]+\.js$/.test(url))).toBe(false)
    await page.mouse.click(5, 5)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Привет')
  })
})

test('a page with a 3D model keeps the robot in 2D: one WebGL canvas, the model', async ({
  page,
}) => {
  await child(page, 'uz', true)
  await page.goto('/home', { waitUntil: 'networkidle' })
  await page.mouse.click(5, 5)
  await page.evaluate(() => {
    history.pushState({}, '', '/worlds/dino/explore/trex')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  const model = page.locator('[data-testid="explorer-3d"] canvas')
  await expect(model).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(2500) // the robot would have started by now (onIdle)
  await expect(page.locator('canvas')).toHaveCount(1)
})
