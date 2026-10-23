import type { QuizQuestion } from './quiz'
import { fill, type DinoText } from './text'

/** The words of a quiz question and its hint in the current language. */
export function promptOf(text: DinoText, q: QuizQuestion): string {
  switch (q.kind) {
    case 'eat':
      return fill(text.quiz.eat, { name: q.subject ? text.dinos[q.subject].name : '' })
    case 'feature':
      return q.feature ? text.quiz.feature[q.feature] : ''
    default:
      return text.quiz[q.kind]
  }
}

export function hintOf(text: DinoText, q: QuizQuestion): string {
  if (q.kind === 'whoMeat' || q.kind === 'whoPlant') return text.quiz.hints.who
  return text.quiz.hints[q.kind]
}
