import { expect, test, type Page } from '@playwright/test'
import { meetNewLetter } from './lesson.ts'

/*
 * Phase 19 QA: the 3D mascot family. Real rigged GLB characters load per
 * page context (one at a time), react to the child and to world events
 * (never sad after a mistake), fall back to a picture when a model or WebGL
 * fails, honour reduced motion, and the Mascot Lab inspects every one.
 */

// software WebGL in headless Chromium
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } })

const MASCOTS = [
  'kidobot',
  'astro',
  'dinoo',
  'ziyo',
  'lumi',
  'leafy',
  'melo',
  'pixel',
  'scribble',
  'story',
]

async function seed(page: Page, { cores = 8 }: { cores?: number } = {}) {
  await page.addInitScript((cores) => {
    // the test machine is weak; a normal phone or tablet gets the 3D mascot
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cores })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
    let state = 11
    Math.random = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('kiddo.e2e.tours', 'off')
    const put = (key: string, value: unknown, version = 1) =>
      localStorage.setItem(key, JSON.stringify({ state: value, version }))
    put('kiddo.settings', { language: 'uz', volume: 0.8 })
    const born = new Date()
    born.setFullYear(born.getFullYear() - 5)
    born.setDate(born.getDate() - 30)
    put(
      'kiddo.family',
      {
        children: [
          {
            id: 'kid',
            name: 'Aziza',
            birthDate: born.toISOString().slice(0, 10),
            celebratedLevel: 5,
            gender: 'girl',
            mascot: 'girl',
            dailyLimitMinutes: 600,
            createdAt: new Date().toISOString(),
            homeworks: [],
          },
        ],
        activeChildId: 'kid',
      },
      3,
    )
  }, cores)
}

/** The page's 3D mascot once its model is in (the picture placeholder is gone). */
function mascot3D(page: Page, id: string) {
  return page.locator(`[data-mascot="${id}"][data-clip]`)
}

test('every mascot is a real rigged 3D character with clips and a face (Mascot Lab)', async ({
  page,
}) => {
  // ten models in software WebGL, then eight signature moves (Phase 77)
  test.setTimeout(360_000)
  await seed(page)
  await page.goto('/dev/mascots')
  const stage = page.getByTestId('lab-stage')
  for (const id of MASCOTS) {
    await page.getByTestId(`lab-mascot-${id}`).click()
    await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
    await expect(stage).toHaveAttribute('data-failed', 'false')
    const stat = (name: string) => page.locator(`[data-stat="${name}"]`)
    await expect(stat('bones')).not.toHaveText('0')
    expect(Number(await stat('bones').textContent())).toBeGreaterThanOrEqual(20)
    expect(Number(await stat('morphTargets').textContent())).toBeGreaterThanOrEqual(14)
    expect(Number(await stat('animations').textContent())).toBeGreaterThanOrEqual(20)
    // the back is modelled too: turn it round
    await page.getByTestId('lab-view-180').click()
    // the shared command "wave": each mascot waves its own way (Ziyo welcomes)
    // (a model that has just appeared may still be settling into its idle: ask again)
    await expect(async () => {
      await page.getByTestId('lab-clip-wave').click()
      await expect(stage).toHaveAttribute('data-clip', id === 'ziyo' ? 'welcome' : 'wave', {
        timeout: 2_000,
      })
    }).toPass({ timeout: 15_000 })
  }
  // Phase 77: the signature moves from the owner's sheets are real clips
  for (const [id, clip] of [
    ['dinoo', 'roar'],
    ['lumi', 'sparkle_jump'],
    ['lumi', 'hug'],
    ['ziyo', 'bow'],
    ['ziyo', 'clap'],
    ['kidobot', 'thumbs_up'],
    ['astro', 'thumbs_up'],
    ['story', 'hug'],
  ] as const) {
    await page.getByTestId(`lab-mascot-${id}`).click()
    await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
    await expect(async () => {
      await page.getByTestId(`lab-clip-${clip}`).click()
      await expect(stage).toHaveAttribute('data-clip', clip, { timeout: 2_000 })
    }).toPass({ timeout: 15_000 })
  }
  // Phase 76: drag the model round, the arrow keys turn it, Home faces it front
  await page.getByTestId('lab-view-0').click()
  const yaw = page.getByTestId('lab-yaw')
  await stage.scrollIntoViewIfNeeded()
  const box = (await stage.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect(yaw).toHaveValue('90')
  await stage.focus()
  await page.keyboard.press('ArrowRight')
  await expect(yaw).toHaveValue('105')
  await page.keyboard.press('Home')
  await expect(yaw).toHaveValue('0')
  // one model in memory at a time: the others were released
  await page.waitForTimeout(500)
  expect(
    Number(await page.locator('[data-stat="models in memory"]').textContent()),
  ).toBeLessThanOrEqual(10)
})

test('each world has its own guide, one at a time, and home gets KidoBot back', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await seed(page)
  const visits: [string, string][] = [
    ['/home', 'kidobot'],
    ['/learn/space', 'astro'],
    ['/worlds/dino', 'dinoo'],
    ['/worlds/uzbekistan', 'ziyo'],
    ['/mistake-garden', 'leafy'],
    ['/tasks/find-letter', 'scribble'],
    ['/learn/words', 'story'],
    ['/spaceport', 'pixel'],
    ['/home', 'kidobot'],
  ]
  for (const [route, id] of visits) {
    await page.goto(route)
    await expect(mascot3D(page, id)).toBeVisible({ timeout: 30_000 })
    // no stale mascot and no second canvas for the same guide
    await expect(page.locator('[data-mascot]')).toHaveCount(1)
    await expect(page.locator('[data-mascot] canvas')).toHaveCount(1)
  }
})

test('a wrong answer makes the guide think, not sad; it reacts to the world', async ({ page }) => {
  test.setTimeout(150_000)
  await seed(page)
  await page.goto('/tasks/find-letter')
  const guide = mascot3D(page, 'scribble')
  await expect(guide).toBeVisible({ timeout: 30_000 })
  await meetNewLetter(page)
  const answer = await page.locator('[data-answer]').first().getAttribute('data-answer')
  const wrong = page.locator(`[data-option]:not([data-option="${answer}"])`).first()
  await wrong.click()
  await expect(guide).toHaveAttribute('data-clip', /^(think|encourage|write)$/)
  await expect(guide).not.toHaveAttribute('data-clip', /sad/)
})

test('a model that fails to load leaves a picture of the mascot and a working page', async ({
  page,
}) => {
  await seed(page)
  await page.route('**/mascots/astro.glb', (route) => route.abort())
  await page.goto('/learn/space')
  await expect(page.locator('[data-mascot-poster="astro"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-mascot] canvas')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Koinot' })).toBeVisible()
})

test('a weak device gets the still picture, never an empty box', async ({ page }) => {
  await seed(page, { cores: 2 })
  await page.goto('/worlds/dino')
  await expect(page.locator('[data-mascot-poster="dinoo"]').first()).toBeVisible({
    timeout: 30_000,
  })
  await expect(page.locator('[data-mascot] canvas')).toHaveCount(0)
})

test('reduced motion: the 3D mascot holds still (no idle sway, no blinking)', async ({ page }) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seed(page)
  await page.goto('/learn/space')
  const guide = mascot3D(page, 'astro')
  await expect(guide).toBeVisible({ timeout: 30_000 })
  // a greeting may play first (a short pose change); then the base pose holds
  // (in the evening the mascot's base pose is sleep, which must hold still too)
  await expect(guide).toHaveAttribute('data-clip', /^(float|idle|talk|sleep)$/, {
    timeout: 15_000,
  })
  // once a face change has blended in, the picture stops changing (with motion, breathing and
  // blinking never let two frames 1.5 s apart match)
  await expect
    .poll(
      async () => {
        const a = await guide.screenshot()
        await page.waitForTimeout(1500)
        return a.equals(await guide.screenshot())
      },
      { timeout: 30_000, intervals: [200] },
    )
    .toBe(true)
})
