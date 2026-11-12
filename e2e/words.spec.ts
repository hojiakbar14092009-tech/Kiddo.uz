import { expect, test, type Page } from '@playwright/test'

/*
 * A word never breaks inside itself ("Пингвинёно / к", "Sarguzashtl / ar") on the
 * smallest phones, in all three languages and ages (Russian has the longest words): card titles, tabs,
 * chips and the mascot's bubble shrink a little instead, and never below 13 px.
 * The counting pictures stay big enough for a small finger.
 */

const ROUTES = [
  '/home',
  '/learn',
  '/explore',
  '/my-world',
  '/stories',
  '/learn/my-story',
  '/math-lab',
  '/alphabet/num-3',
]

async function child(page: Page, language: 'uz' | 'ru' | 'en', age: number) {
  await page.addInitScript(
    ({ language, age }) => {
      localStorage.setItem('kiddo.e2e.tours', 'off')
      const put = (key: string, state: unknown, version: number) =>
        localStorage.setItem(key, JSON.stringify({ state, version }))
      put('kiddo.settings', { language, volume: 0, onboarded: true, guestTours: {} }, 2)
      const born = new Date()
      born.setFullYear(born.getFullYear() - age)
      born.setDate(born.getDate() - 30)
      const child = {
        id: 'k',
        name: 'Bek',
        birthDate: born.toISOString().slice(0, 10),
        celebratedLevel: age,
        gender: 'boy',
        mascot: 'boy',
        dailyLimitMinutes: 600,
        createdAt: new Date().toISOString(),
        homeworks: [],
        birthdayGifts: [born.getFullYear() + age],
      }
      put('kiddo.family', { children: [child], activeChildId: 'k' }, 3)
    },
    { language, age },
  )
}

/** Words of 4+ letters drawn on two lines, and fitted labels below 13 px. */
function brokenWords() {
  const shown = (el: Element) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && Number(s.opacity) > 0.05
  }
  const split: string[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const el = node.parentElement
    if (!el || !shown(el) || el.closest('[aria-hidden=true]')) continue
    for (const m of node.textContent!.matchAll(/[^\s\-—–/]{4,}/g)) {
      const range = document.createRange()
      range.setStart(node, m.index)
      range.setEnd(node, m.index + m[0].length)
      const tops = new Set(
        [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)),
      )
      if (tops.size > 1) split.push(m[0])
    }
  }
  const tiny = [...document.querySelectorAll<HTMLElement>('[style*="--fit"]')]
    .filter(shown)
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12.9)
    .map((el) => el.textContent)
  const smallButtons = [...document.querySelectorAll('button')]
    .filter(shown)
    .filter((el) =>
      /^(\d+-rasm|Картинка \d+|Picture \d+)$/.test(el.getAttribute('aria-label') ?? ''),
    )
    .filter((el) => el.getBoundingClientRect().width < 44)
    .map((el) => el.getAttribute('aria-label'))
  return { split, tiny, smallButtons }
}

// the viewport is set here, so one project is enough
test.skip(() => test.info().project.name !== 'phone', 'the viewport is set by the test')

const CASES = [
  { language: 'uz', age: 5 },
  { language: 'ru', age: 4 },
  { language: 'ru', age: 6 },
  { language: 'en', age: 5 },
] as const

for (const width of [320, 360]) {
  test.describe(`a ${width} px phone`, () => {
    test.use({ viewport: { width, height: 760 } })
    for (const { language, age } of CASES) {
      test(`no word breaks inside itself (${language}, ${age} years)`, async ({ page }) => {
        // eight pages in one go; no pop-in springs, so each bubble is seen at its final size
        test.setTimeout(180_000)
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await child(page, language, age)
        for (const route of ROUTES) {
          await page.goto(route)
          await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
          await expect(page.locator('main').first()).toBeVisible()
          // the mascot's bubble comes in after a moment
          await page.waitForTimeout(800)
          expect({ route, ...(await page.evaluate(brokenWords)) }).toEqual({
            route,
            split: [],
            tiny: [],
            smallButtons: [],
          })
        }
      })
    }
  })
}
