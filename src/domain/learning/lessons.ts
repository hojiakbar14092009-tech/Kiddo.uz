/*
 * Learn Before Play (Phase 21): the registry of what a child is shown before
 * an activity may ask about it. One place, so every game follows the same
 * rule: nothing is tested that was not taught first.
 *
 * - The learn sections (words, math, Koinot, tales, garden, help) already teach
 *   by stages (learnStore `stages`) and test only taught stages.
 * - The world games teach with a short lesson deck the first time (and again
 *   whenever the child wants it): the ids below.
 * - The letter games meet each new letter before the first question about it
 *   (`letterLessonId`); opening a letter in the alphabet counts too.
 *
 * Seen lessons are stored per child in learnStore (`markLesson`), never in a
 * second store.
 */

export const ACTIVITY_LESSONS = {
  /** The Dino quiz and the fossil dig ask about the six animals: meet them first. */
  dinoAnimals: 'dino.animals',
  /** The map game: the labelled map, city by city. */
  uzMap: 'uz.map',
  /** The dasturxon game: what is food, fruit, and baked in the tandir. */
  uzTable: 'uz.table',
  /** The pattern game: what a repeating border is, and the motifs. */
  uzPatterns: 'uz.patterns',
  /** The Science Lab's plant experiment: what a plant needs, how it grows. */
  scienceLab: 'lab.plant',
} as const

export type ActivityLessonId = (typeof ACTIVITY_LESSONS)[keyof typeof ACTIVITY_LESSONS]

/** A letter met in a language (the letter games and the alphabet share it). */
export function letterLessonId(language: string, letterId: string): string {
  return `letter.${language}.${letterId}`
}

/** A Math Lab skill met with a worked example (e.g. `math.add:within10`). */
export function mathSkillLessonId(skill: string): string {
  return `math.${skill}`
}
