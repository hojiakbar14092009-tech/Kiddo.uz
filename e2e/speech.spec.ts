import { expect, test, type Page } from '@playwright/test'
import { phraseKey } from '../src/services/audio/phrases.ts'

/*
 * The speaker button on a real learning page (Koinot quick check): it reads
 * the question on screen in the chosen language, Kiddo talks while it plays,
 * voices never overlap, and it stops on question change, language change and
 * leaving the page. On Free it makes no sound at all.
 */

type Lang = 'uz' | 'ru' | 'en'
const SPACE_STAGES = ['4', '5-1', '5-2', '5-3', '6-1', '6-2', '6-3']
const LANG_BUTTON: Record<Lang, string> = { uz: 'O‘zbekcha', ru: 'Русский', en: 'English' }

/** A six-year-old with every Koinot lesson taught, and (optionally) PRO. */
async function seed(page: Page, { language, pro }: { language: Lang; pro: boolean }) {
  await page.addInitScript(
    ({ language, pro, stages }) => {
      if (localStorage.getItem('e2e-seeded')) return
      localStorage.setItem('e2e-seeded', '1')
      const born = new Date()
      born.setFullYear(born.getFullYear() - 6)
      born.setDate(born.getDate() - 10)
      localStorage.setItem(
        'kiddo.settings',
        JSON.stringify({ state: { language, volume: 0.8 }, version: 1 }),
      )
      localStorage.setItem(
        'kiddo.family',
        JSON.stringify({
          state: {
            children: [
              {
                id: 'kid1',
                name: 'Lola',
                birthDate: born.toISOString().slice(0, 10),
                celebratedLevel: 6,
                gender: 'girl',
                mascot: 'girl',
                dailyLimitMinutes: 120,
                createdAt: new Date().toISOString(),
              },
            ],
            activeChildId: 'kid1',
          },
          version: 3,
        }),
      )
      if (pro) {
        localStorage.setItem(
          'kiddo.subscription',
          JSON.stringify({
            state: { plan: 'lifetime', expiresAt: null, source: 'promo', usedPromoCodes: [] },
            version: 2,
          }),
        )
      }
      const taught = Object.fromEntries(['uz', 'ru', 'en'].map((l) => [`space|${l}`, stages]))
      localStorage.setItem(
        'kiddo.learn',
        JSON.stringify({
          state: {
            byChild: {
              kid1: {
                skills: {},
                attempts: [],
                sessions: [],
                rewarded: [],
                stages: taught,
                lastOrder: {},
              },
            },
          },
          version: 1,
        }),
      )
    },
    { language, pro, stages: SPACE_STAGES },
  )
}

/** Every voice clip the page asks for, in order. */
function recordClips(page: Page): string[] {
  const clips: string[] = []
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.startsWith('/audio/voice/')) clips.push(path)
  })
  return clips
}

const clipOf = (language: Lang, text: string) =>
  `/audio/voice/${language}/${phraseKey(language, text)}.mp3`
const speaker = (page: Page) => page.getByTestId('learn-speak')
const prompt = (page: Page) => page.locator('.space-prompt')
/** The voice clips playing right now (Howler is on window in the browser). */
const playingClips = (page: Page) =>
  page.evaluate(() => {
    const howler = (
      window as unknown as {
        Howler?: { _howls: { playing(): boolean; _src: string | string[] }[] }
      }
    ).Howler
    return (howler?._howls ?? [])
      .filter((howl) => String(howl._src).includes('/audio/voice/') && howl.playing())
      .map((howl) => new URL(String(howl._src), location.href).pathname)
  })
/** How many voice clips are playing right now. */
const playingCount = (page: Page) =>
  page.evaluate(() => {
    const howler = (
      window as unknown as {
        Howler?: { _howls: { playing(): boolean; _src: string | string[] }[] }
      }
    ).Howler
    return (howler?._howls ?? []).filter(
      (howl) => String(howl._src).includes('/audio/voice/') && howl.playing(),
    ).length
  })

async function openQuickCheck(page: Page, label: RegExp) {
  await page.goto('/learn/space')
  await page.getByRole('button', { name: label }).click()
  await expect(prompt(page)).toBeVisible()
}

const START: Record<Lang, RegExp> = {
  uz: /Tekshiruvni boshlash/,
  ru: /Начать проверку/,
  en: /Start the check/,
}

test.describe('speaker button (PRO)', () => {
  for (const language of ['en', 'uz', 'ru'] as const) {
    test(`reads the current Koinot question in ${language}; Kiddo talks, then rests`, async ({
      page,
    }) => {
      test.setTimeout(60_000)
      await seed(page, { language, pro: true })
      const clips = recordClips(page)
      await openQuickCheck(page, START[language])
      const question = (await prompt(page).textContent())!.trim()

      await speaker(page).click()
      await expect.poll(() => clips).toContain(clipOf(language, question))
      await expect(speaker(page)).toHaveAttribute('data-status', 'speaking')
      await expect(page.getByTestId('mascot').first()).toHaveAttribute('data-mood', 'talk')
      // the clip ends: the button and Kiddo rest again
      await expect(speaker(page)).toHaveAttribute('data-status', 'idle', { timeout: 15_000 })
      await expect(page.getByTestId('mascot').first()).not.toHaveAttribute('data-mood', 'talk')
    })
  }

  test('next question: the new one is read, the old one never again', async ({ page }) => {
    test.setTimeout(60_000)
    await seed(page, { language: 'en', pro: true })
    const clips = recordClips(page)
    await openQuickCheck(page, START.en)
    const board = page.locator('section[aria-labelledby^="q-"]')
    const firstId = await board.getAttribute('aria-labelledby')
    const first = (await prompt(page).textContent())!.trim()
    await speaker(page).click()
    await expect.poll(() => clips).toContain(clipOf('en', first))

    // answer: a wrong card is simply tried again, so tap the cards until the next question comes
    const cards = board.locator('button[aria-label]')
    const total = await cards.count()
    for (let i = 0; i < total; i += 1) {
      if ((await board.getAttribute('aria-labelledby')) !== firstId) break
      const card = cards.nth(i)
      if ((await card.getAttribute('aria-disabled')) === 'true') continue
      await card.click()
      await page.waitForTimeout(400)
    }
    await expect(board).not.toHaveAttribute('aria-labelledby', firstId!, { timeout: 10_000 })
    const second = (await prompt(page).textContent())!.trim()
    // the old question is not heard any more (Kiddo's short praise may still finish)
    if (second !== first) expect(await playingClips(page)).not.toContain(clipOf('en', first))
    expect(await playingCount(page)).toBeLessThanOrEqual(1)

    const before = clips.length
    await speaker(page).click()
    await expect.poll(() => clips.slice(before)).toContain(clipOf('en', second))
    // only the new question is read (the old one too only if it is word for word the same)
    const extra = clips.slice(before).filter((clip) => clip !== clipOf('en', second))
    expect(extra).toEqual([])
  })

  test('pressed quickly many times: never more than one voice', async ({ page }) => {
    test.setTimeout(60_000)
    await seed(page, { language: 'en', pro: true })
    recordClips(page)
    await openQuickCheck(page, START.en)
    for (let i = 0; i < 6; i += 1) {
      await speaker(page).click()
      expect(await playingCount(page)).toBeLessThanOrEqual(1)
    }
    await expect.poll(() => playingCount(page)).toBe(1)
    for (let i = 0; i < 10; i += 1) {
      expect(await playingCount(page)).toBeLessThanOrEqual(1)
      await page.waitForTimeout(100)
    }
  })

  test('changing the language stops the voice; the next press reads Uzbek', async ({ page }) => {
    test.setTimeout(60_000)
    await seed(page, { language: 'en', pro: true })
    const clips = recordClips(page)
    await openQuickCheck(page, START.en)
    const english = (await prompt(page).textContent())!.trim()
    await speaker(page).click()
    await expect.poll(() => playingCount(page)).toBe(1)

    await page.getByRole('button', { name: LANG_BUTTON.uz, exact: true }).click()
    await expect.poll(() => playingCount(page)).toBe(0)
    await expect(speaker(page)).toHaveAttribute('data-status', 'idle')
    // the question on screen is in Uzbek now, and that is what gets read
    await expect(prompt(page)).toBeVisible()
    const uzbek = (await prompt(page).textContent())!.trim()
    expect(uzbek).not.toBe(english)
    const before = clips.length
    await speaker(page).click()
    await expect.poll(() => clips.slice(before)).toContain(clipOf('uz', uzbek))
  })

  test('leaving the page stops the voice at once', async ({ page }) => {
    test.setTimeout(60_000)
    await seed(page, { language: 'en', pro: true })
    recordClips(page)
    await openQuickCheck(page, START.en)
    await speaker(page).click()
    await expect.poll(() => playingCount(page)).toBe(1)
    await page.getByRole('button', { name: 'Home', exact: true }).first().click()
    await expect(page).toHaveURL(/\/home$/)
    await expect.poll(() => playingCount(page)).toBe(0)
  })
})

test('the demo: the speaker speaks without PRO (the voice is free)', async ({ page }) => {
  test.setTimeout(60_000)
  await seed(page, { language: 'uz', pro: false })
  const clips = recordClips(page)
  await openQuickCheck(page, START.uz)
  await expect(speaker(page)).not.toHaveAttribute('data-status', 'locked')
  await speaker(page).click()
  await expect.poll(() => clips.length, { timeout: 15_000 }).toBeGreaterThan(0)
  await expect(page.getByText(/PRO imkoniyati/)).toHaveCount(0)
})

test(
  'production build: on Free the speaker makes no sound and shows a calm PRO note',
  { tag: '@production' },
  async ({ page }) => {
    test.setTimeout(60_000)
    await seed(page, { language: 'uz', pro: false })
    const clips = recordClips(page)
    await openQuickCheck(page, START.uz)
    await expect(speaker(page)).toHaveAttribute('data-status', 'locked')
    await speaker(page).click()
    await expect(page.getByText(/Ovozli o‘qish – PRO imkoniyati/)).toBeVisible()
    await page.waitForTimeout(800)
    expect(clips).toEqual([])
    expect(await playingCount(page)).toBe(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  },
)

test('the speaker is easy to tap and overlaps nothing, from 320px phones to desktop', async ({
  page,
}) => {
  test.setTimeout(90_000)
  await seed(page, { language: 'en', pro: true })
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 844],
    [768, 1024],
    [1280, 900],
  ] as const) {
    await page.setViewportSize({ width, height })
    await openQuickCheck(page, START.en)
    const box = (await speaker(page).boundingBox())!
    expect(box.width, `${width}px: tap size`).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width, `${width}px: inside the screen`).toBeLessThanOrEqual(width)
    const others = [
      page.getByRole('button', { name: LANG_BUTTON.uz, exact: true }),
      page.getByRole('button', { name: LANG_BUTTON.en, exact: true }),
      page.getByRole('button', { name: /help/i }).first(),
    ]
    for (const other of others) {
      if ((await other.count()) === 0) continue
      const b = await other.first().boundingBox()
      if (!b) continue
      const overlap =
        box.x < b.x + b.width &&
        b.x < box.x + box.width &&
        box.y < b.y + b.height &&
        b.y < box.y + box.height
      expect(overlap, `${width}px: speaker overlaps another control`).toBe(false)
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, `${width}px: no sideways scroll`).toBeLessThanOrEqual(width)
  }
})
