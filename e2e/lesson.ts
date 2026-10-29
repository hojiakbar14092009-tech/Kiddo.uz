import { expect, type Page } from '@playwright/test'

/*
 * Learn Before Play (Phase 21): a game shows its lesson first, and a letter
 * game introduces a letter the child has not met. These helpers go through
 * them like a child would.
 */

/** Goes through a lesson deck to its "let's play" button. */
export async function passLesson(page: Page) {
  await expect(page.getByTestId('lesson-deck')).toBeVisible()
  const next = page.getByTestId('lesson-next')
  while (await next.isVisible()) await next.click()
  await page.getByTestId('lesson-start').click()
  await expect(page.getByTestId('lesson-deck')).toHaveCount(0)
}

/** Passes the lesson if the game shows one (it was not seen yet). */
export async function passLessonIfShown(page: Page, ready: string) {
  await expect(page.getByTestId('lesson-deck').or(page.getByTestId(ready))).toBeVisible()
  if (await page.getByTestId('lesson-deck').isVisible()) await passLesson(page)
}

/** A letter game: meets a new letter when it is introduced, then the options are there. */
export async function meetNewLetter(page: Page) {
  const intro = page.getByTestId('letter-intro')
  await expect(intro.or(page.getByTestId('task-options'))).toBeVisible()
  if (await intro.isVisible()) await page.getByTestId('letter-intro-go').click()
  await expect(page.getByTestId('task-options')).toBeVisible()
}

/**
 * The Math Lab: a skill met for the first time shows a worked example first.
 * With `step`, waits for that question (or its example) rather than the one
 * still on screen during the praise of the last answer.
 */
export async function passMathExample(page: Page, step?: number) {
  const intro = page.getByTestId('lab-intro')
  const question =
    step === undefined
      ? page.getByTestId('lab-question')
      : page.locator(`[data-testid="lab-question"][data-step="${step}"]`)
  await expect(intro.or(question)).toBeVisible()
  if (await intro.isVisible()) {
    await page.getByTestId('lab-intro-go').click()
    await expect(question).toBeVisible()
  }
}
