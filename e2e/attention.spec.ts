import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { passLesson } from './lesson.ts'

/*
 * Phases 58–60: the attention helper (asked once, a grown-up's answer, the robot
 * reminding and then offering science games), the three science games and the
 * cartoons with Free's two free ones.
 */

type Consent = 'unasked' | 'granted' | 'denied'

async function child(page: Page, consent: Consent, { firstRun = false } = {}) {
  await page.addInitScript(
    ({ consent, firstRun }) => {
      // the grown-ups' question asks 12 × 3
      Math.random = () => 0
      // seeded once per test, so what the app writes later survives a reload
      if (sessionStorage.getItem('seeded')) return
      sessionStorage.setItem('seeded', '1')
      const put = (key: string, state: unknown, version: number) =>
        localStorage.setItem(key, JSON.stringify({ state, version }))
      if (firstRun) localStorage.removeItem('kiddo.e2e.tours')
      else localStorage.setItem('kiddo.e2e.tours', 'off')
      put('kiddo.settings', { language: 'uz', volume: 0, onboarded: true, guestTours: {} }, 2)
      put('kiddo.attention', { consent, answeredAt: null, camera: false }, 1)
      const born = new Date()
      born.setFullYear(born.getFullYear() - 5)
      born.setDate(born.getDate() - 30)
      put(
        'kiddo.family',
        {
          children: [
            {
              id: 'k',
              name: 'Bek',
              birthDate: born.toISOString().slice(0, 10),
              celebratedLevel: 5,
              gender: 'boy',
              mascot: 'boy',
              dailyLimitMinutes: 600,
              createdAt: new Date().toISOString(),
              homeworks: [],
              birthdayGifts: [born.getFullYear() + 5],
            },
          ],
          activeChildId: 'k',
        },
        3,
      )
    },
    { consent, firstRun },
  )
}

async function ready(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
}

async function solveParentGate(page: Page) {
  await expect(page.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeVisible()
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: '6', exact: true }).click()
  await page.getByRole('button', { name: 'Tekshirish' }).click()
}

/** A science game: its rules and the try first (the first time), then it starts. */
async function startSci(page: Page) {
  await expect(page.getByTestId('lesson-deck').or(page.getByTestId('sci-start'))).toBeVisible()
  if (await page.getByTestId('lesson-deck').isVisible()) await passLesson(page)
  else await page.getByTestId('sci-start').click()
}

const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('kiddo.attention') ?? '{}').state?.consent)

test.describe('the attention helper', () => {
  test('is asked once, cannot be skipped, and a grown-up answers', async ({ page }) => {
    await child(page, 'unasked', { firstRun: true })
    await ready(page, '/home')
    const consent = page.getByTestId('attention-consent')
    await expect(consent).toBeVisible()
    // why it exists, why it helps, the camera and the free version are explained
    await expect(consent).toContainText('Nega bu foydali?')
    await expect(consent).toContainText('Bepul tarifda robot gapirmaydi')
    // no way past it: Escape does nothing and there is no close button
    await page.keyboard.press('Escape')
    await expect(consent).toBeVisible()
    await expect(consent.getByRole('button', { name: /yopish|close/i })).toHaveCount(0)
    // a child's tap is not an answer: the grown-ups' question comes first
    await consent.getByRole('button', { name: 'Yo‘q, kerak emas' }).click()
    await solveParentGate(page)
    await expect(consent).toHaveCount(0)
    expect(await stored(page)).toBe('denied')
    // asked only once
    await page.reload()
    await expect(page.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
    await expect(page.getByTestId('attention-consent')).toHaveCount(0)
  })

  test('“yes” turns it on; the camera is a separate choice', async ({ page }) => {
    await child(page, 'unasked', { firstRun: true })
    await ready(page, '/home')
    await page.getByRole('button', { name: 'Ha, ruxsat beraman' }).click()
    await solveParentGate(page)
    const camera = page.getByTestId('attention-camera')
    await expect(camera).toBeVisible()
    await camera.getByRole('button', { name: 'Kamerasiz' }).click()
    await expect(page.getByTestId('attention-consent')).toHaveCount(0)
    await expect(camera).toHaveCount(0)
    expect(await stored(page)).toBe('granted')
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('kiddo.attention') ?? '{}').state?.camera,
      ),
    ).toBe(false)
  })

  test('reminds a child who stops touching, then offers three science games', async ({ page }) => {
    await page.clock.install()
    await child(page, 'granted')
    await ready(page, '/sci/magnet')
    await startSci(page)
    const nudge = page.getByTestId('attention-nudge')
    await page.clock.runFor(26_000)
    // the child's own name comes first (Phase 71)
    await expect(nudge).toContainText('Bek! Hoy, men shu yerdaman!')
    await page.clock.runFor(26_000)
    // the second time the robot is warmer ("you can do it")
    await expect(nudge).toContainText(/Ozgina qoldi|Sen zo‘rsan|birga davom/)
    await page.clock.runFor(26_000)
    const offer = page.getByTestId('attention-offer')
    await expect(offer).toBeVisible()
    await expect(offer.getByRole('button')).toHaveCount(7) // the top five, “all games” and “later”
    await expect(page.getByTestId('attention-all-games')).toBeVisible()
    await offer.getByRole('button', { name: 'Suzadimi, cho‘kadimi?' }).click()
    await expect(page).toHaveURL(/\/sci\/float$/)

    // the parent's report keeps it all, for this child only, as counts
    const day = await page.evaluate(() => {
      const log = JSON.parse(localStorage.getItem('kiddo.attention') ?? '{}').state?.log ?? {}
      return Object.values(log.k ?? {})[0]
    })
    expect(day).toEqual({ reminders: 2, away: 0, offers: 1, games: 1 })
  })

  test('the parent sees the attention report for the child', async ({ page }) => {
    await child(page, 'granted')
    await page.addInitScript(() => {
      const raw = JSON.parse(localStorage.getItem('kiddo.attention') ?? '{}')
      if (raw.state?.log) return
      const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date())
      raw.state = {
        ...raw.state,
        log: { k: { [day]: { reminders: 3, away: 1, offers: 1, games: 1 } } },
      }
      localStorage.setItem('kiddo.attention', JSON.stringify(raw))
    })
    await ready(page, '/parent/dashboard?tab=settings')
    await solveParentGate(page)
    await page.getByRole('button', { name: 'Demo rejimda kirish' }).click()
    await page.goto('/parent/dashboard?tab=settings')
    const gate = page.getByRole('dialog', { name: 'Faqat kattalar uchun' })
    await expect(gate.or(page.getByTestId('attention-setting'))).toBeVisible()
    if (await gate.isVisible()) await solveParentGate(page)
    const report = page.getByTestId('attention-report')
    await expect(report).toContainText('Diqqat hisoboti: Bek')
    await expect(page.getByTestId('attention-total-reminders')).toHaveText('3')
    await expect(page.getByTestId('attention-total-away')).toHaveText('1')
    await expect(page.getByTestId('attention-total-games')).toHaveText('1')
  })

  test('without consent the robot never reminds', async ({ page }) => {
    await page.clock.install()
    await child(page, 'denied')
    await ready(page, '/sci/magnet')
    await page.clock.runFor(80_000)
    await expect(page.getByTestId('attention-nudge')).toHaveCount(0)
    await expect(page.getByTestId('attention-offer')).toHaveCount(0)
  })
})

test.describe('the science games', () => {
  test('the magnet picks up only iron', async ({ page }) => {
    await child(page, 'denied')
    await ready(page, '/sci/magnet')
    await startSci(page)
    await page.getByTestId('magnet-apple').click()
    await expect(page.getByText('Yopishmadi. Bu temir emas.')).toBeVisible()
    for (const id of ['key', 'clip', 'spoon', 'bolt'])
      await page.getByTestId(`magnet-${id}`).click()
    await expect(page.getByTestId('sci-finished')).toBeVisible()
  })

  test('float or sink: guess, watch, and finish', async ({ page }) => {
    await child(page, 'denied')
    await ready(page, '/sci/float')
    await startSci(page)
    for (const floats of [true, false, true, false, true, false]) {
      const button = page.getByTestId(floats ? 'float-guess-float' : 'float-guess-sink')
      await expect(button).toBeEnabled()
      await button.click()
    }
    await expect(page.getByTestId('sci-finished')).toBeVisible({ timeout: 15_000 })
  })

  test('a droplet’s trip goes round the water cycle', async ({ page }) => {
    await child(page, 'denied')
    await ready(page, '/sci/water')
    await startSci(page)
    await page.getByTestId('water-sun').click()
    const cloud = page.getByTestId('water-cloud')
    await expect(cloud).toBeEnabled()
    for (let tap = 0; tap < 4; tap += 1) await cloud.click()
    await expect(page.getByTestId('sci-finished')).toBeVisible({ timeout: 15_000 })
  })

  test('the Explore hub shows the games and the cartoons', async ({ page }) => {
    await child(page, 'denied')
    await ready(page, '/explore')
    await expect(page.getByRole('link', { name: 'Magnit sehri' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Multfilmlar' })).toBeVisible()
  })
})

test.describe('the cartoons', () => {
  test('a feed: the first plays at once, a hand teaches the swipe, Free gets two', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await child(page, 'denied')
    // the test browser has no H.264: every cartoon is served as a tiny WebM instead
    const clip = readFileSync(new URL('./fixtures/short.webm', import.meta.url))
    await page.route('**/video/shorts/**/*.mp4', (route) =>
      route.fulfill({ body: clip, contentType: 'video/webm' }),
    )
    await ready(page, '/shorts')
    const playing = (id: string) =>
      page
        .locator(`[data-testid=short-${id}] video`)
        .evaluate((v) => (v as HTMLVideoElement).currentTime > 0)
    // the first cartoon starts by itself
    await expect.poll(() => playing('water')).toBe(true)
    await expect(page.getByTestId('shorts-free-left')).toContainText('1')
    // a child who does not swipe is shown how; the hand also moves on when tapped
    await expect(page.getByTestId('shorts-swipe-hint')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('shorts-swipe-hint').click()
    await expect.poll(() => playing('magnet')).toBe(true)
    await expect(page.getByTestId('shorts-swipe-hint')).toHaveCount(0)
    await expect(page.getByTestId('shorts-free-left')).toContainText('tugadi')
    // the third waits for PRO, calmly
    await page
      .getByTestId('shorts-feed')
      .locator('div')
      .first()
      .evaluate((feed) => {
        feed.scrollTo(0, feed.clientHeight * 2)
      })
    await expect(page.getByTestId('short-float')).toHaveAttribute('data-locked', 'true')
    await expect(page.getByTestId('short-float').getByTestId('shorts-pro')).toBeVisible()
  })
})
