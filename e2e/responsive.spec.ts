import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 11: the main pages on a small phone, a phone held sideways and a
 * tablet. Nothing to tap may sit off the screen or under another control,
 * the 3D model fits its frame and follows a turn of the device, and large
 * system text never pushes the language switch away.
 */

const ROUTES = [
  '/home',
  '/math-lab',
  '/tasks/find-picture',
  '/tasks/trace',
  '/learn/space',
  '/worlds/dino',
  '/worlds/dino/explore/trex',
  // Learn Before Play: the lesson deck on every screen size
  '/worlds/dino/quiz',
  '/worlds/uzbekistan',
  '/worlds/uzbekistan/map',
  '/stories',
]

async function sixYearOld(page: Page, { pro = false } = {}) {
  await page.addInitScript((pro) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('kiddo.e2e.tours', 'off')
    const put = (key: string, state: unknown, version = 1) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language: 'ru', volume: 0.8 })
    const born = new Date()
    born.setFullYear(born.getFullYear() - 6)
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
    if (pro)
      put('kiddo.subscription', {
        plan: 'lifetime',
        source: 'payment',
        expiresAt: null,
        demoPro: false,
      })
  }, pro)
  await page.goto('/home')
  // the opening animation is tapped away once; then the app moves inside itself
  await page.mouse.click(5, 5)
}

async function go(page: Page, route: string) {
  await page.evaluate((path) => {
    history.pushState({}, '', path)
    dispatchEvent(new PopStateEvent('popstate'))
  }, route)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
}

/** Controls off the screen (outside sideways-scrolling rows) and the page's sideways overflow. */
function problems() {
  const inScrollRow = (el: Element) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true
    }
    return false
  }
  const off = [...document.querySelectorAll('button, a[href], [role=switch], input')]
    .filter((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || el.closest('[aria-hidden="true"]')) return false
      return (r.right > innerWidth + 1 || r.left < -1) && !inScrollRow(el)
    })
    .map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30))
  return { overflow: document.documentElement.scrollWidth - innerWidth, off }
}

/** How many controls in the top bar sit on top of each other. */
function barOverlaps() {
  const bar = document.querySelector('header.topbar')!
  const boxes = [...bar.querySelectorAll('button, a, [role=status]')]
    .filter((el) => !el.closest('[aria-hidden="true"]'))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 1)
  let count = 0
  for (let i = 0; i < boxes.length; i += 1)
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!
      const b = boxes[j]!
      if (
        a.left < b.right - 1 &&
        b.left < a.right - 1 &&
        a.top < b.bottom - 1 &&
        b.top < a.bottom - 1
      )
        count += 1
    }
  return count
}

for (const [name, size] of [
  ['small phone 320×568', { width: 320, height: 568 }],
  ['phone sideways 852×393', { width: 852, height: 393 }],
  ['tablet 768×1024', { width: 768, height: 1024 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport: size })

    test('no control off the screen, no sideways scroll (Russian, the longest words)', async ({
      page,
    }) => {
      await sixYearOld(page)
      for (const route of ROUTES) {
        await go(page, route)
        expect(await page.evaluate(problems), route).toEqual({ overflow: 0, off: [] })
      }
    })
  })
}

test.describe('a small phone', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('the game header keeps the bubble clear of its buttons', async ({ page }) => {
    await sixYearOld(page)
    await go(page, '/tasks/find-picture')
    const bubble = page.locator('[aria-live="polite"]').filter({ hasText: /\S/ }).first()
    const hint = page.getByRole('button', { name: /Подсказка/ }).first()
    const a = (await bubble.boundingBox())!
    const b = (await hint.boundingBox())!
    expect(a.x + a.width <= b.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true)
  })

  test('the trace board leaves its buttons on the screen', async ({ page }) => {
    await sixYearOld(page)
    await go(page, '/tasks/trace')
    const done = page.getByRole('button', { name: /Готово/ })
    const box = (await done.boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(568)
  })
})

test.describe('a phone with large system text', () => {
  test.use({ viewport: { width: 393, height: 852 } })

  test('the three languages stay side by side at normal text size', async ({ page }) => {
    await sixYearOld(page)
    await go(page, '/math-lab')
    const header = page.locator('header')
    await expect(header.getByRole('group', { name: 'Сменить язык' })).toBeVisible()
    await expect(header.getByRole('button', { name: /Язык: Русский/ })).toBeHidden()
  })

  test('at 150 % text the switch folds into one button that still works', async ({ page }) => {
    await sixYearOld(page)
    await page.addStyleTag({ content: 'html { font-size: 150% !important; }' })
    await go(page, '/math-lab')
    expect(await page.evaluate(problems)).toEqual({ overflow: 0, off: [] })
    const folded = page.getByRole('button', { name: /Язык: Русский/ })
    await expect(folded).toBeVisible()
    await folded.click()
    const menu = page.locator(`[id="${await folded.getAttribute('aria-controls')}"]`)
    await menu.getByRole('button', { name: 'English', exact: true }).click()
    await expect(page.getByRole('button', { name: /Language: English/ })).toBeVisible()
  })
})

test.describe('a small phone at normal text size', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('keeps the three languages side by side', async ({ page }) => {
    await sixYearOld(page)
    await go(page, '/home')
    await expect(page.getByRole('button', { name: /Язык: Русский/ })).toBeHidden()
  })

  test('a back button and PRO never sit under each other in the top bar', async ({ page }) => {
    await sixYearOld(page, { pro: true })
    for (const route of ['/math-lab', '/worlds/dino/explore/trex']) {
      await go(page, route)
      const overlaps = await page.evaluate(barOverlaps)
      expect(overlaps, route).toBe(0)
      expect(await page.evaluate(problems), route).toEqual({ overflow: 0, off: [] })
    }
  })
})

test.describe('very large system text (200 %)', () => {
  for (const width of [320, 360]) {
    test(`at ${width} px the top bar keeps every control on screen and apart`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await sixYearOld(page, { pro: width === 320 })
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
      for (const route of ['/math-lab', '/tasks/find-picture', '/worlds/dino/explore/trex']) {
        await go(page, route)
        expect(await page.evaluate(barOverlaps), route).toBe(0)
        expect(await page.evaluate(problems), route).toEqual({ overflow: 0, off: [] })
      }
    })
  }
})

test('turning a small phone sideways unfolds the language switch again', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await sixYearOld(page, { pro: true })
  await go(page, '/worlds/dino/explore/trex')
  const folded = page.getByRole('button', { name: /Язык: Русский/ })
  await expect(folded).toBeVisible()
  await page.setViewportSize({ width: 768, height: 700 })
  await expect(folded).toBeHidden()
  await expect(page.locator('header').getByRole('group', { name: 'Сменить язык' })).toBeVisible()
  await page.setViewportSize({ width: 320, height: 700 })
  await expect(folded).toBeVisible()
  expect(await page.evaluate(barOverlaps)).toBe(0)
})

test('the 3D model fills its square frame and follows a turn of the device', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })
  await sixYearOld(page)
  await go(page, '/worlds/dino/explore/trex')
  const open = page.getByTestId('explorer-open-3d')
  if (await open.isVisible()) await open.click()
  const canvas = page.locator('[data-testid="explorer-3d"] canvas')
  await expect(canvas).toBeVisible({ timeout: 15_000 })
  const square = async () => {
    const box = (await canvas.boundingBox())!
    return {
      inside: box.x >= 0 && box.x + box.width <= page.viewportSize()!.width,
      ratio: box.width / box.height,
    }
  }
  expect(await square()).toMatchObject({ inside: true })
  expect((await square()).ratio).toBeCloseTo(1, 1)
  await page.setViewportSize({ width: 852, height: 393 })
  await page.waitForTimeout(800)
  expect(await square()).toMatchObject({ inside: true })
  expect((await square()).ratio).toBeCloseTo(1, 1)
  // leaving the page frees the WebGL canvas
  await go(page, '/home')
  await expect(canvas).toHaveCount(0, { timeout: 5000 })
})
