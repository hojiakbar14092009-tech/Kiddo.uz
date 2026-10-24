/*
 * The Science Lab's first experiment: what a plant needs and how it grows.
 * Four picture questions, one right answer each. Pure data; the order of
 * the answers is fixed per question but never the same position twice in a row.
 */

export type ThingId =
  | 'droplet'
  | 'milk'
  | 'candy'
  | 'sun'
  | 'snowflake'
  | 'rock'
  | 'sunflower'
  | 'ball'
  | 'seedling'
  | 'blossom'

export interface LabQuestion {
  id: 'water' | 'light' | 'seed' | 'first'
  options: readonly ThingId[]
  answer: ThingId
}

export const PLANT_EXPERIMENT: readonly LabQuestion[] = [
  { id: 'water', options: ['milk', 'droplet', 'candy'], answer: 'droplet' },
  { id: 'light', options: ['snowflake', 'rock', 'sun'], answer: 'sun' },
  { id: 'seed', options: ['sunflower', 'ball', 'rock'], answer: 'sunflower' },
  { id: 'first', options: ['blossom', 'seedling'], answer: 'seedling' },
]

export const EXPERIMENT_ACTIVITY = 'science-lab:plants'

/** The universe's run for a finished experiment (strand science). */
export function experimentRun(
  id: string,
  childKey: string,
  firstTry: number,
): {
  id: string
  childKey: string
  activity: string
  strand: 'science'
  correct: number
  total: number
  independent: number
} {
  const total = PLANT_EXPERIMENT.length
  return {
    id,
    childKey,
    activity: EXPERIMENT_ACTIVITY,
    strand: 'science',
    correct: total,
    total,
    independent: Math.max(0, Math.min(total, firstTry)),
  }
}
