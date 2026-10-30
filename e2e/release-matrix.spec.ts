import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 36 release matrix: the child's main places on the nine screen sizes of
 * the contract, in Russian (the longest words): no sideways scroll, nothing to
 * tap off the screen; the same at 200 % text; and the heavy places (3D mascot,
 * Scale Portal, Shadow Lab) entered and left again and again without the
 * WebGL contexts, timers or page size growing.
 */

const SIZES = [
  [320, 568],
  [360, 800],
  [393, 852],
  [852, 393],
  [768, 1024],
  [834, 1194],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
] as const

const ROUTES = [
  '/home',
  '/learn/math',
  '/math-lab',
  '/alphabet',
  '/learn/words',
  '/learn/garden',
  '/learn/space',
  '/scale-portal',
  '/shadow-lab',
  '/mistake-garden',
  '/collection',
  '/shop',
  '/stories',
  '/parent',
]

async function seed(page: Page, language: 'ru' | 'uz' | 'en' = 'ru') {
  await page.addInitScript((language) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('kiddo.e2e.tours', 'off')
    const put = (key: string, state: unknown, version = 1) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language, volume: 0 })
    const born = new Date()
    born.setFullYear(born.getFullYear() - 8)
    born.setDate(born.getDate() - 30)
    put(
      'kiddo.family',
      {
        children: [
          {
            id: 'kid',
            name: 'Aziz',
            birthDate: born.toISOString().slice(0, 10),
            celebratedLevel: 8,
            gender: 'boy',
            mascot: 'boy',
            dailyLimitMinutes: 600,
            createdAt: new Date().toISOString(),
            homeworks: [],
            birthdayGifts: [new Date().getFullYear()],
            tours: { home: 2, play: 2, reward: 2 },
          },
        ],
        activeChildId: 'kid',
      },
      3,
    )
  }, language)
  await page.goto('/home')
  await page.mouse.click(5, 5)
}

async function go(page: Page, route: string) {
  await page.evaluate((path) => {
    history.pushState({}, '', path)
    dispatchEvent(new PopStateEvent('popstate'))
  }, route)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
}

function problems() {
  const inScrollRow = (el: Element) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth) return true
    }
    return false
  }
  const off = [...document.querySelectorAll('button, a[href], [role=switch], input, select')]
    .filter((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0 || el.closest('[aria-hidden="true"], [inert]'))
        return false
      return (r.right > innerWidth + 1 || r.left < -1) && !inScrollRow(el)
    })
    .map((el) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30))
  const raw = (document.body.innerText.match(/\b[a-z]+(\.[a-zA-Z0-9_]+){2,}\b/g) ?? []).filter(
    (s) => !/\.(uz|ru|com|png|svg|js)\b/.test(s),
  )
  return { overflow: document.documentElement.scrollWidth - innerWidth, off, raw }
}

test.describe('release matrix @matrix', () => {
  // one browser project is enough: every test sets its own screen size
  test.skip(() => test.info().project.name !== 'tablet', 'tablet project only')
  test.describe.configure({ timeout: 180_000 })

  for (const [width, height] of SIZES) {
    test(`${width}×${height}: no sideways scroll, no control off the screen, no raw keys`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height })
      await seed(page)
      for (const route of ROUTES) {
        await go(page, route)
        expect.soft(await page.evaluate(problems), `${route} at ${width}×${height}`).toEqual({
          overflow: 0,
          off: [],
          raw: [],
        })
      }
    })
  }

  for (const scale of [150, 200]) {
    test(`${scale} % text on a phone: still no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 })
      await seed(page)
      await page.addStyleTag({ content: `html { font-size: ${scale}% !important; }` })
      for (const route of ROUTES) {
        await go(page, route)
        const { overflow, off } = await page.evaluate(problems)
        expect.soft({ overflow, off }, `${route} at ${scale}%`).toEqual({ overflow: 0, off: [] })
      }
    })
  }

  for (const language of ['uz', 'en'] as const) {
    test(`${language}: the new places show no raw keys`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 })
      await seed(page, language)
      for (const route of ROUTES) {
        await go(page, route)
        const { raw, overflow } = await page.evaluate(problems)
        expect.soft({ raw, overflow }, route).toEqual({ raw: [], overflow: 0 })
      }
    })
  }

  test('heavy places entered and left ten times: no growth of WebGL contexts, timers or page', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __gl: number; __timers: Set<number> }
      w.__gl = 0
      w.__timers = new Set()
      const get = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        kind: string,
        ...rest: unknown[]
      ) {
        const ctx = (get as (...a: unknown[]) => unknown).call(this, kind, ...rest)
        if (ctx && /webgl/.test(kind) && !(this as unknown as { __counted?: boolean }).__counted) {
          ;(this as unknown as { __counted?: boolean }).__counted = true
          w.__gl += 1
        }
        return ctx
      } as typeof get
      const si = window.setInterval
      const ci = window.clearInterval
      window.setInterval = ((fn: TimerHandler, ms?: number, ...a: unknown[]) => {
        const id = si(fn, ms, ...a)
        w.__timers.add(id)
        return id
      }) as typeof setInterval
      window.clearInterval = ((id?: number) => {
        if (id !== undefined) w.__timers.delete(id)
        ci(id)
      }) as typeof clearInterval
    })
    await page.setViewportSize({ width: 1024, height: 768 })
    await seed(page)
    const sample = () =>
      page.evaluate(() => {
        const w = window as unknown as { __timers: Set<number> }
        return {
          canvases: document.querySelectorAll('canvas').length,
          intervals: w.__timers.size,
          nodes: document.getElementsByTagName('*').length,
        }
      })
    const cycle = async () => {
      for (const route of ['/scale-portal', '/shadow-lab', '/home', '/collection', '/home'])
        await go(page, route)
    }
    await cycle()
    const first = await sample()
    for (let i = 0; i < 9; i += 1) await cycle()
    const last = await sample()
    // the same page after ten round trips: nothing left behind
    expect(last.canvases).toBeLessThanOrEqual(first.canvases)
    expect(last.intervals).toBeLessThanOrEqual(first.intervals + 1)
    expect(last.nodes).toBeLessThanOrEqual(first.nodes * 1.1)
  })
})
