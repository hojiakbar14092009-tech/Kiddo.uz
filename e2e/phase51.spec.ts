import { expect, test, type Page } from '@playwright/test'

/*
 * Phase 51: the admin opens the child app in a new tab, in a sandbox: a
 * throwaway child ("Mehmon"), an Uzbek bar on top, nothing saved to the
 * family's localStorage and nothing sent to the server.
 */

/** The real family of this device: one six-year-old, Aziz (as in phase49.spec.ts). */
async function family(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('kiddo.e2e.tours', 'off')
    const put = (key: string, state: unknown, version = 1) =>
      localStorage.setItem(key, JSON.stringify({ state, version }))
    put('kiddo.settings', { language: 'uz', volume: 0.8, onboarded: true }, 2)
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
  })
}

/** Every localStorage entry of a page, sorted by key. */
function snapshot(page: Page): Promise<[string, string][]> {
  return page.evaluate(() => {
    const entries: [string, string][] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key !== null) entries.push([key, localStorage.getItem(key) ?? ''])
    }
    return entries.sort(([a], [b]) => a.localeCompare(b))
  })
}

/** Anything that would be the server: Supabase, its REST API or its Edge Functions. */
const SERVER = /supabase|\/rest\/v1\/|\/functions\/v1\/|\/auth\/v1\//

test('admin opens the app in a sandbox tab; the family data stays untouched', async ({
  page,
  context,
}) => {
  await family(page)
  // the real app first: Aziz is this device's child
  await page.goto('/home')
  await expect(page.getByText('Salom, Aziz!')).toBeVisible()

  await page.goto('/admin')
  await page.getByRole('button', { name: 'Demo administrator sifatida kirish' }).click()
  await expect(page.getByTestId('demo-admin-banner')).toBeVisible()
  const before = await snapshot(page)
  expect(before.find(([key]) => key === 'kiddo.family')?.[1]).toContain('"name":"Aziz"')

  const requests: string[] = []
  context.on('request', (request) => requests.push(request.url()))

  const [preview] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Ilovani ochish' }).click(),
  ])
  await preview.waitForLoadState()

  // the bar, in Uzbek, with a real exit button
  const banner = preview.getByTestId('admin-preview-banner')
  await expect(banner).toContainText('Admin ko‘rish rejimi')
  await expect(banner).toContainText('Bu sinov profili. Hech narsa saqlanmaydi.')
  const exit = preview
    .getByRole('button', { name: 'Chiqish' })
    .and(preview.getByTestId('admin-preview-exit'))
  const box = await exit.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)

  // the sandbox child, not Aziz; the flag is no longer in the address
  await expect(preview.getByText('Salom, Mehmon!')).toBeVisible()
  await expect(preview.getByText('Aziz')).toHaveCount(0)
  await expect(preview).toHaveURL(/\/home$/)
  // the bar is in the flow: the app's first control starts below it
  const bannerBox = await banner.boundingBox()
  const header = await preview.locator('main, header').first().boundingBox()
  expect((header?.y ?? 0) + 1).toBeGreaterThanOrEqual(
    (bannerBox?.y ?? 0) + (bannerBox?.height ?? 0),
  )

  // play: "find at home" pays nuts in the sandbox (a reload stays in the sandbox)
  await preview.goto('/explore')
  await expect(banner).toBeVisible()
  await preview.getByRole('link', { name: 'Uyda top' }).click()
  await preview.getByRole('button', { name: 'Topdim!' }).click()
  await expect(preview.getByTestId('find-result')).toContainText('+2 yong‘oq')
  // the sandbox tab's storage is the in-memory one, and it holds the sandbox child's progress
  const sandbox = await preview.evaluate(() => {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i) ?? '')
    return {
      native: Object.getPrototypeOf(localStorage) === Storage.prototype,
      written: keys.some((key) => (localStorage.getItem(key) ?? '').includes('admin-preview')),
      aziz: keys.some((key) => (localStorage.getItem(key) ?? '').includes('Aziz')),
    }
  })
  expect(sandbox).toEqual({ native: false, written: true, aziz: false })

  // the family's storage is exactly as before (byte for byte), and nothing went to the server
  expect(await snapshot(page)).toEqual(before)
  expect(requests.filter((url) => SERVER.test(url))).toEqual([])

  // "Chiqish": the tab closes (or, where a browser refuses, goes to the admin panel)
  const closed = preview.waitForEvent('close').then(() => 'closed')
  // the tab may close while the click is still being reported: only a click on an open tab may fail
  await exit.click().catch((error: unknown) => {
    if (!preview.isClosed()) throw error
  })
  const outcome = await Promise.race([
    closed,
    preview
      .waitForURL(/\/admin$/, { timeout: 5_000 })
      .then(() => 'admin')
      .catch(() => 'stuck'),
  ])
  expect(['closed', 'admin']).toContain(outcome)
  if (outcome === 'admin') {
    await expect(preview.getByTestId('admin-preview-banner')).toHaveCount(0)
  }
  expect(await snapshot(page)).toEqual(before)
  const stored = JSON.parse(before.find(([key]) => key === 'kiddo.family')?.[1] ?? 'null') as {
    state: { children: { name: string }[] }
  }
  expect(stored.state.children.map((child) => child.name)).toEqual(['Aziz'])
  expect(requests.filter((url) => SERVER.test(url))).toEqual([])

  // a normal tab (no flag) is the real app again: Aziz, no bar
  const normal = await context.newPage()
  await normal.goto('/home')
  await expect(normal.getByText('Salom, Aziz!')).toBeVisible()
  await expect(normal.getByTestId('admin-preview-banner')).toHaveCount(0)
})

test('the flag alone is harmless: an empty sandbox, nothing of the family', async ({ page }) => {
  await family(page)
  await page.goto('/home')
  await expect(page.getByText('Salom, Aziz!')).toBeVisible()
  const before = await snapshot(page)

  // a typed address in another tab of the same browser
  const other = await page.context().newPage()
  await other.goto('/home?kiddoPreview=1')
  await expect(other.getByTestId('admin-preview-banner')).toBeVisible()
  await expect(other.getByText('Salom, Mehmon!')).toBeVisible()
  // the bar fits the narrowest phone: no sideways scroll, a full-size exit button
  await other.setViewportSize({ width: 320, height: 640 })
  await expect(other.locator('[data-splash]')).toHaveCount(0, { timeout: 30_000 })
  const exit = other.getByTestId('admin-preview-exit')
  await expect(exit).toBeInViewport()
  const box = await exit.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(await other.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await other.screenshot({ path: test.info().outputPath('banner-320.png') })
  await other.close()

  expect(await snapshot(page)).toEqual(before)
})
