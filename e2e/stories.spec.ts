import { expect, test, type Page } from '@playwright/test'
import { phraseKey } from '../src/services/audio/phrases.ts'
import { STORY_TEXT_UZ } from '../src/features/stories/text.uz.ts'

/*
 * The Story Engine: a free story with a choice (guest), a PRO story's lock,
 * "Read to me" on Free, a child reading a story twice (one scroll), and a
 * PRO child hearing a PRO story from its recordings.
 */

const LAMB_FIRST = 'Baland tog‘larda, oq o‘tov yonida Oppoq ismli kichkina qo‘zichoq yashardi.'
const LAMB_DOWN = 'Oppoq ehtiyotlab bir qadam bosdi, tuyoqlari ostidan mayda toshlar dumalab ketdi.'
const STAR_TITLE = 'Yulduzli tun'
const STAR_FIRST = 'Keng dashtda oppoq o‘tov turardi.'

async function chooseUzbek(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'O‘zbekcha' }).click()
  await expect(page).toHaveURL(/\/home$/)
}

async function turnTo(page: Page, id: string) {
  await page.getByTestId('story-next').click()
  await expect(page.getByTestId('story-reader')).toHaveAttribute('data-page', id)
}

/** A five-year-old child profile in Uzbek (optionally with PRO, as a promo code gives it). */
async function seedChild(page: Page, { pro }: { pro: boolean }) {
  await page.addInitScript(
    ({ pro }) => {
      if (localStorage.getItem('e2e-seeded')) return
      localStorage.setItem('e2e-seeded', '1')
      const born = new Date()
      born.setFullYear(born.getFullYear() - 5)
      born.setDate(born.getDate() - 10)
      localStorage.setItem(
        'kiddo.settings',
        JSON.stringify({ state: { language: 'uz', volume: 0.8 }, version: 1 }),
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
                celebratedLevel: 5,
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
    },
    { pro },
  )
}

/** Reads "The Lost Lamb" by the rock path to its end and opens the questions. */
async function readLamb(page: Page) {
  await expect(page.getByTestId('story-reader')).toHaveAttribute('data-page', 'p1')
  await turnTo(page, 'p2')
  await turnTo(page, 'p3')
  await turnTo(page, 'p4')
  await page.getByTestId('story-choice-stay').click()
  await expect(page.getByTestId('story-reader')).toHaveAttribute('data-page', 'stay1')
  await turnTo(page, 'stay2')
  await turnTo(page, 'home')
  await page.getByTestId('story-choice-thank').click()
  await expect(page.getByTestId('story-reader')).toHaveAttribute('data-page', 'end-thank')
  await page.getByTestId('story-to-questions').click()
}

/**
 * Answers every question right on the first try. The page does not say which
 * answer is right; the test looks it up in the story's own words (the first
 * label of a question is its right answer).
 */
async function answerAll(page: Page, storyId: string) {
  const words = STORY_TEXT_UZ[storyId]!
  const result = page.getByTestId('story-result')
  for (let step = 0; step < 5; step += 1) {
    const question = page.getByTestId('story-question')
    await expect(question.or(result)).toBeVisible()
    if (await result.isVisible()) break
    const id = (await question.getAttribute('data-question'))!
    const right = words.questions[id]!.options[0]!
    await question.getByRole('button', { name: right, exact: true }).click()
    await expect(page.locator(`[data-testid="story-question"][data-question="${id}"]`)).toHaveCount(
      0,
      { timeout: 5_000 },
    )
  }
  await expect(result).toBeVisible()
}

const scrolls = (page: Page) =>
  page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('kiddo.universe') ?? '{}') as {
      state?: { byChild?: Record<string, { balances?: { scroll?: number } }> }
    }
    return saved.state?.byChild?.kid1?.balances?.scroll ?? 0
  })

test('a free story is read with a choice to the questions and the reward', async ({ page }) => {
  test.setTimeout(60_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await chooseUzbek(page)
  // the Story Library building of Kiddo City opens the stories
  await page.getByRole('link', { name: 'Ertaklar kutubxonasi', exact: true }).click()
  await expect(page).toHaveURL(/\/stories$/)
  await page.getByTestId('story-card-lost-lamb').click()
  await expect(page).toHaveURL(/\/stories\/lost-lamb$/)

  await expect(page.getByTestId('story-text')).toContainText(LAMB_FIRST)
  await turnTo(page, 'p2')
  await turnTo(page, 'p3')
  await turnTo(page, 'p4')
  // the choice: two buttons with pictures, no "next"
  await expect(page.getByTestId('story-next')).toHaveCount(0)
  await page.getByTestId('story-choice-down').click()
  await expect(page.getByTestId('story-text')).toContainText(LAMB_DOWN)
  await turnTo(page, 'down2')
  await turnTo(page, 'home')
  await page.getByTestId('story-choice-close').click()
  await expect(page.getByTestId('story-reader')).toHaveAttribute('data-page', 'end-close')
  await expect(page.getByText('Tamom!')).toBeVisible()
  await page.getByTestId('story-to-questions').click()

  // a guest is at language level 2: three who/what questions with picture answers
  const question = page.getByTestId('story-question')
  await expect(question).toBeVisible()
  expect(['who', 'what']).toContain(await question.getAttribute('data-kind'))
  // the page never tells which answer is right
  expect(await question.getAttribute('data-answer')).toBeNull()
  expect(await question.getAttribute('data-answer-label')).toBeNull()
  await answerAll(page, 'lost-lamb')
  await expect(page.getByTestId('story-score')).toHaveText('Birinchi urinishda: 3 / 3')
  await expect(page.getByTestId('activity-reward')).toContainText('+1 o‘ram')
  expect(errors).toEqual([])
})

test('a PRO story stays locked on Free, also by its direct link', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/stories')
  const card = page.getByRole('button', { name: `${STAR_TITLE} (PRO)` })
  await expect(card).toHaveAttribute('data-locked', 'true')
  await card.click()
  await expect(page).toHaveURL(/\/stories$/)
  await expect(page.getByText(/Bu hikoya PRO versiyada/)).toBeVisible()

  await page.goto('/stories/star-night')
  await expect(page.getByTestId('story-locked')).toBeVisible()
  await expect(page.getByTestId('story-reader')).toHaveCount(0)
  await expect(page.getByText(STAR_FIRST)).toHaveCount(0)
})

test('“Read to me” on Free shows PRO and plays nothing', async ({ page }) => {
  await chooseUzbek(page)
  await page.goto('/stories/grandma-garden')
  const narrate = page.getByRole('button', { name: 'O‘qib ber (PRO)' })
  await expect(narrate).toBeVisible()
  await expect(narrate).toHaveAttribute('data-state', 'locked')
  await narrate.click()
  await expect(page.getByTestId('story-note')).toHaveText(
    'Ovozli o‘qish PRO versiyada. Matnni birga o‘qiymiz!',
  )
  // nothing is playing
  const playing = await page.evaluate(() =>
    [...document.querySelectorAll('audio')].some((audio) => !audio.paused),
  )
  expect(playing).toBe(false)
})

test('a child reads a story twice: one scroll, also after a reload', async ({ page }) => {
  test.setTimeout(90_000)
  await seedChild(page, { pro: false })
  await page.goto('/stories/lost-lamb')
  await readLamb(page)
  await answerAll(page, 'lost-lamb')
  await expect(page.getByTestId('activity-reward')).toContainText('+1 o‘ram')
  expect(await scrolls(page)).toBe(1)

  // a reload starts the story again; reading it again pays no second scroll
  await page.reload()
  await readLamb(page)
  await answerAll(page, 'lost-lamb')
  await expect(page.getByTestId('story-score')).toBeVisible()
  await expect(page.getByTestId('activity-reward')).not.toContainText('o‘ram')
  expect(await scrolls(page)).toBe(1)
})

test('with PRO a child opens a PRO story and hears its page from the recordings', async ({
  page,
}) => {
  test.setTimeout(60_000)
  const clips: string[] = []
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname
    if (path.startsWith('/audio/voice/') && response.ok()) clips.push(path)
  })
  await seedChild(page, { pro: true })
  await page.goto('/stories')
  const card = page.getByTestId('story-card-star-night')
  await expect(card).toHaveAttribute('data-locked', 'false')
  await card.click()
  await expect(page).toHaveURL(/\/stories\/star-night$/)
  await expect(page.getByTestId('story-text')).toContainText(STAR_FIRST)
  // the Uzbek voice is said openly to be synthetic
  await expect(page.getByTestId('story-voice-note')).toContainText('vaqtinchalik sun’iy ovoz')

  const narrate = page.getByTestId('story-narrate')
  await narrate.click()
  await expect(narrate).toHaveAttribute('aria-pressed', 'true')
  // the page is read to its end from the real clips (no "not recorded" note)
  await expect(narrate).toHaveAttribute('data-state', 'done', { timeout: 30_000 })
  await expect(page.getByTestId('story-note')).toHaveCount(0)
  for (const line of STORY_TEXT_UZ['star-night']!.pages.p1!) {
    expect(clips).toContain(`/audio/voice/uz/${phraseKey('uz', line)}.mp3`)
  }
})
