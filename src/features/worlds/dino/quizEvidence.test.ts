import { describe, expect, it } from 'vitest'
import { quizOutcome } from './quizEvidence'
import type { QuizQuestion } from './quiz'

const q = (kind: QuizQuestion['kind']): QuizQuestion => ({
  id: `${kind}:x`,
  kind,
  optionType: kind === 'eat' ? 'diet' : 'dino',
  options: [],
  answer: 'plant',
})

describe('dinosaur quiz → evidence', () => {
  it('folds kinds into three science skills and names a diet mix-up', () => {
    const at = '2026-10-10T09:00:00.000Z'
    expect(
      quizOutcome(q('eat'), { sessionId: 's', index: 0, misses: 1, level: 2 }, at),
    ).toMatchObject({
      skill: 'science:dino-diet',
      firstTry: false,
      errors: ['diet-mixup'],
      hint: 1,
      level: 2,
    })
    expect(
      quizOutcome(q('longer'), { sessionId: 's', index: 1, misses: 2, level: 3 }, at),
    ).toMatchObject({
      skill: 'science:dino-size',
      errors: ['wrong-choice'],
      hint: 3,
    })
    expect(
      quizOutcome(q('flew'), { sessionId: 's', index: 2, misses: 0, level: 1 }, at),
    ).toMatchObject({
      skill: 'science:dino-facts',
      firstTry: true,
      errors: [],
    })
  })
})
