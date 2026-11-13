import { describe, expect, it } from 'vitest'
import { LETTERS } from '../../../server/letters'
import { getAlphabet } from './index'

// the server names letters in the parents' Telegram report from its own copy (server/letters.ts)
describe('the server’s letter names', () => {
  it('match the app’s alphabets letter for letter', () => {
    for (const language of ['uz', 'ru', 'en'] as const) {
      const app = Object.fromEntries(getAlphabet(language).letters.map((l) => [l.id, l.upper]))
      expect(LETTERS[language]).toEqual(app)
    }
  })
})
