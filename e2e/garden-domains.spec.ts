import { expect, test, type Page } from '@playwright/test'
import { meetNewLetter, passLessonIfShown } from './lesson.ts'
import {
  applyEvidence,
  type Evidence,
  type SkillMemory,
} from '../src/domain/learningMemory/memory.ts'

/** Both children have met every Uzbek letter in the alphabet (Learn Before Play is not tested here). */
const UZ_LETTERS = 'a b d e f g h i j k l m n o p q r s t u v x y z o2 g2 sh ch ng tutuq'.split(' ')
const MET_LETTERS = UZ_LETTERS.map((id) => `letter.uz.${id}`)

/*
 * Phase 17 QA: one learning memory for every area. Language and science
 * plants grow from real activities (the letter game, the dinosaur quiz),
 * through the same evidence contract as maths; practice from the garden
 * leads to the right activity and back. Mixed gardens, child isolation and
 * reloads are checked on stored memory built with the app's own rules.
 */

const HOUR = 3_600_000

interface Seed {
  active?: 'kid-a' | 'kid-b'
  memory?: Record<string, Record<string, SkillMemory>>
}

/** A family of two five-year-olds (and optional memory), as the app saves them, once per tab. */
async function seed(page: Page, data: Seed, random = 11) {
  await page.addInitScript(
    ({ data, random, met }) => {
      let state = random
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
      const child = (id: string, name: string) => ({
        id,
        name,
        birthDate: born.toISOString().slice(0, 10),
        celebratedLevel: 5,
        gender: 'girl',
        mascot: 'girl',
        dailyLimitMinutes: 600,
        createdAt: new Date().toISOString(),
        homeworks: [],
      })
      put(
        'kiddo.family',
        {
          children: [child('kid-a', 'Aziza'), child('kid-b', 'Bobur')],
          activeChildId: data.active ?? 'kid-a',
        },
        3,
      )
      const byChild: Record<string, unknown> = {}
      for (const [id, skills] of Object.entries(data.memory ?? {})) {
        byChild[id] = { skills, processed: [] }
      }
      put('kiddo.learning-memory', { byChild })
      const learner = {
        skills: {},
        attempts: [],
        sessions: [],
        rewarded: [],
        stages: { lessons: met },
        lastOrder: {},
      }
      put('kiddo.learn', { byChild: { 'kid-a': learner, 'kid-b': learner } })
    },
    { data, random, met: MET_LETTERS },
  )
}

/** A skill's memory after a real difficulty and what came after (the app's own rules). */
function memoryOf(skill: string, stage: 'seed' | 'plant' | 'bloom'): SkillMemory {
  const start = Date.now() - 72 * HOUR
  let n = 0
  const ev = (over: Partial<Evidence>): Evidence => {
    n += 1
    return {
      id: `seed-${n}|q`,
      skill,
      item: `q:${n}`,
      at: new Date(start + n * HOUR).toISOString(),
      firstTry: true,
      helpedBefore: false,
      errors: [],
      maxHint: 0,
      review: false,
      ...over,
    }
  }
  const list = [
    ev({ firstTry: false, errors: ['wrong-choice'] }),
    ev({ firstTry: false, errors: ['wrong-choice'] }),
  ]
  if (stage !== 'seed') list.push(ev({}), ev({}))
  if (stage === 'bloom')
    list.push(ev({}), ev({ at: new Date(start + 40 * HOUR).toISOString(), review: true }))
  let memory: SkillMemory | undefined
  for (const e of list) memory = applyEvidence(memory, e)
  return memory!
}

const plant = (page: Page, skill: string) =>
  page.locator(`[data-testid="garden-plant"][data-skill="${skill}"]`)

/**
 * One letter game, right on the first tap except, with `miss`, one wrong
 * tap in the first round from `miss.from` whose letter is not `miss.avoid`.
 * Returns the letter of the round with the slip.
 */
async function playLetters(
  page: Page,
  miss?: { avoid?: string; from?: number },
): Promise<string | null> {
  let missed: string | null = null
  for (let round = 0; round < 5; round += 1) {
    await meetNewLetter(page)
    const options = page.getByTestId('task-options')
    await expect(options).toBeVisible()
    const answer = (await options.getAttribute('data-answer'))!
    if (miss && missed === null && round >= (miss.from ?? 0) && answer !== miss.avoid) {
      const ids = await options
        .locator('[data-option]')
        .evaluateAll((all) => all.map((el) => el.getAttribute('data-option')!))
      const wrong = ids.find((id) => id !== answer)!
      await options.locator(`[data-option="${wrong}"]`).click()
      missed = answer
    }
    await options.locator(`[data-option="${answer}"]`).click()
    await page.waitForTimeout(1_900)
  }
  await expect(page).toHaveURL(/\/reward$/)
  return missed
}

const DINO_NAMES: Record<string, string> = {
  trex: 'Tiranozavr',
  triceratops: 'Triseratops',
  stegosaurus: 'Stegozavr',
  brachiosaurus: 'Braxiozavr',
  pteranodon: 'Pteranodon',
  ankylosaurus: 'Ankilozavr',
  plant: 'O‘simlik',
  meat: 'Go‘sht',
  fish: 'Baliq',
}
const DIET = new Set(['eat', 'whoMeat', 'whoPlant'])

/** One dinosaur quiz; with `missDiet`, every diet question gets one wrong answer first. */
async function playDinoQuiz(page: Page, missDiet: boolean) {
  const result = page.getByTestId('dino-result')
  for (let step = 0; step < 8; step += 1) {
    const question = page.locator(`[data-testid="quiz-question"][data-step="${step}"]`)
    await expect(question.or(result)).toBeVisible()
    if (await result.isVisible()) return
    const answer = (await question.getAttribute('data-answer'))!
    const kind = (await question.getAttribute('data-kind'))!
    const right = DINO_NAMES[answer]!
    if (missDiet && DIET.has(kind)) {
      const names = await question.getByRole('button').allInnerTexts()
      const wrong = Object.values(DINO_NAMES).find(
        (name) => name !== right && names.some((text) => text.trim() === name),
      )!
      await question.getByRole('button', { name: wrong, exact: true }).click()
    }
    await question.getByRole('button', { name: right, exact: true }).click()
  }
  await expect(result).toBeVisible()
}

test('A + B, language: a real letter-game difficulty becomes a plant, garden practice grows it', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await seed(page, {})
  // two separate sessions, one slip each on different letters
  await page.goto('/tasks/find-letter')
  const first = await playLetters(page, {})
  await page.goto('/tasks/find-letter')
  // the second slip in the last round: the difficulty is confirmed, nothing after it yet
  await playLetters(page, { avoid: first ?? undefined, from: 4 })

  await page.goto('/mistake-garden')
  const letters = plant(page, 'language:letter-recognition')
  await expect(letters).toHaveAttribute('data-stage', 'seed')
  await expect(letters).toHaveAttribute('data-domain', 'language')
  await expect(letters).toHaveAccessibleName('Harflarni tanish — Urug‘')

  // B: practice from the plant (the letter game), all on the first tap, and back
  await letters.click()
  await expect(page.getByTestId('plant-practise')).toHaveAttribute(
    'href',
    '/tasks/find-letter?from=garden',
  )
  await page.getByTestId('plant-practise').click()
  await playLetters(page)
  await page.getByTestId('to-garden').click()
  await expect(page).toHaveURL(/\/mistake-garden$/)
  const grown = plant(page, 'language:letter-recognition')
  await expect(grown).toHaveAttribute('data-grew', 'true')
  // five on its own in a row: growing, but no flower without the look a day later
  await expect(grown).toHaveAttribute('data-stage', 'plant')
  expect(errors).toEqual([])
})

test('D, science: a dinosaur-quiz difficulty becomes a plant and grows with practice', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await seed(page, {}, 23)
  for (let run = 0; run < 2; run += 1) {
    await page.goto('/worlds/dino/quiz')
    await passLessonIfShown(page, 'quiz-start')
    await page.getByTestId('quiz-start').click()
    await playDinoQuiz(page, true)
  }
  await page.goto('/mistake-garden')
  const diet = plant(page, 'science:dino-diet')
  await expect(diet).toHaveAttribute('data-stage', 'seed')
  await expect(diet).toHaveAccessibleName('Dinozavrlar nima yeydi — Urug‘')
  await diet.click()
  await page.getByTestId('plant-practise').click()
  await expect(page).toHaveURL(/\/worlds\/dino\/quiz\?from=garden$/)
  await passLessonIfShown(page, 'quiz-start')
  await page.getByTestId('quiz-start').click()
  await playDinoQuiz(page, false)
  await page.getByTestId('to-garden').click()
  const grown = plant(page, 'science:dino-diet')
  await expect(grown).toHaveAttribute('data-grew', 'true')
  expect(['sprout', 'plant']).toContain(await grown.getAttribute('data-stage'))
})

test('E, F, G: a mixed garden is clear, routes are right, children stay apart, reload keeps it', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await seed(page, {
    memory: {
      'kid-a': {
        'math:add:within10': memoryOf('math:add:within10', 'seed'),
        'math:sub:within10': memoryOf('math:sub:within10', 'plant'),
        'math:count:to5': memoryOf('math:count:to5', 'bloom'),
        'language:reading-words': memoryOf('language:reading-words', 'seed'),
        'language:first-sound': memoryOf('language:first-sound', 'bloom'),
        'science:planet-order': memoryOf('science:planet-order', 'plant'),
        'science:dino-diet': memoryOf('science:dino-diet', 'seed'),
      },
      'kid-b': { 'science:sky-objects': memoryOf('science:sky-objects', 'seed') },
    },
  })
  await page.goto('/mistake-garden')
  const plants = page.getByTestId('garden-plant')
  await expect(plants).toHaveCount(7)
  // grouped by area: maths, then language, then nature
  expect(
    await plants.evaluateAll((all) => all.map((el) => el.getAttribute('data-domain'))),
  ).toEqual(['math', 'math', 'math', 'language', 'language', 'science', 'science'])
  await expect(plant(page, 'science:planet-order')).toHaveAccessibleName(
    'Sayyoralar tartibi — O‘simlik',
  )
  // each area practises in its own activity
  for (const [skill, href] of [
    ['math:add:within10', '/math-lab?practice=add%3Awithin10&from=garden'],
    ['language:reading-words', '/learn/words?from=garden'],
    ['science:planet-order', '/learn/space?from=garden'],
  ] as const) {
    await plant(page, skill).click()
    await expect(page.getByTestId('plant-practise')).toHaveAttribute('href', href)
    await page.getByRole('button', { name: 'Yopish' }).click()
  }
  // a big mixed garden offers its areas (semantic tabs)
  await page.getByRole('tab', { name: /Til/ }).click()
  await expect(plants).toHaveCount(2)
  await page.getByRole('tab', { name: /Hammasi/ }).click()
  await expect(plants).toHaveCount(7)

  // G: a reload keeps every plant and stage
  await page.reload()
  await expect(plant(page, 'language:first-sound')).toHaveAttribute('data-stage', 'bloom')
  await expect(plants).toHaveCount(7)

  // F: the other child sees only their own plant
  await page.evaluate(() => {
    const family = JSON.parse(localStorage.getItem('kiddo.family')!) as {
      state: { activeChildId: string }
    }
    family.state.activeChildId = 'kid-b'
    localStorage.setItem('kiddo.family', JSON.stringify(family))
  })
  await page.reload()
  await expect(plants).toHaveCount(1)
  await expect(plant(page, 'science:sky-objects')).toBeVisible()
  await expect(page.getByRole('tablist')).toHaveCount(0)
})

test('Russian on 320 px: long multi-area names wrap, nothing overflows', async ({ page }) => {
  await seed(page, {
    memory: {
      'kid-a': {
        'language:reading-sentences': memoryOf('language:reading-sentences', 'seed'),
        'science:sky-objects': memoryOf('science:sky-objects', 'plant'),
        'math:missing:sub': memoryOf('math:missing:sub', 'bloom'),
      },
    },
  })
  await page.addInitScript(() => {
    const raw = localStorage.getItem('kiddo.settings')
    if (raw) localStorage.setItem('kiddo.settings', raw.replace('"uz"', '"ru"'))
  })
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/mistake-garden')
  await expect(plant(page, 'science:sky-objects')).toContainText('Планета, звезда и луна')
  await expect(plant(page, 'math:missing:sub')).toContainText('Пропущенное число в вычитании')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  await plant(page, 'language:reading-sentences').click()
  await expect(page.getByTestId('plant-practise')).toBeInViewport()
})
