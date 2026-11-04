import { expect, test } from '@playwright/test'

/*
 * Phase 78: the story animals are real rigged 3D characters on the story stage.
 * A chosen animal hero loads its own model (public/animals), the stage plays it,
 * and when a model cannot load the flat picture stays and the story goes on.
 */

test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
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
})

test('a fox hero walks the story stage as a rigged 3D model', async ({ page }, info) => {
  test.setTimeout(120_000)
  await page.goto('/learn/my-story')
  const model = page.waitForResponse((r) => r.url().endsWith('/animals/fox.glb') && r.ok())
  for (const id of ['fox', 'forest', 'kite', 'treasure'])
    await page.getByTestId(`my-story-choice-${id}`).click()
  const stage = page.getByTestId('my-story-stage')
  await expect(stage).toHaveAttribute('data-hero-model', 'fox')
  await model
  await page.waitForTimeout(3500)
  await stage.screenshot({ path: info.outputPath('fox-stage.png') })
})

test('when a model cannot load, the stage keeps the picture and the story goes on', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/animals/*.glb', (route) => route.abort())
  await page.goto('/learn/my-story')
  for (const id of ['elephant', 'forest', 'kite', 'treasure'])
    await page.getByTestId(`my-story-choice-${id}`).click()
  const stage = page.getByTestId('my-story-stage')
  await expect(stage).toHaveAttribute('data-hero-model', 'elephant')
  await page.waitForTimeout(1500)
  await expect(stage).toBeVisible()
  await page.getByTestId('my-story-next').click()
  await expect(page.getByTestId('my-story-text')).toBeVisible()
  expect(errors).toEqual([])
})
