import { describe, expect, it } from 'vitest'
import { phraseKey, splitSentences, tidyPhrase, withoutName } from './phrases'

describe('voice phrases', () => {
  it('names clips exactly like the recorder (scripts/voices/generate.py)', () => {
    expect(phraseKey('uz', 'Salom!')).toBe('b8daaed9')
    expect(phraseKey('ru', 'Бэ')).toBe('a90a64f1')
    expect(phraseKey('en', 'Find the letter A!')).toBe('faf45e38')
    expect(phraseKey('uz', 'Yana  urinib ko‘ramiz! ⭐')).toBe('68aaa526')
  })

  it('splits texts into sentences and leaves the child’s name out', () => {
    expect(splitSentences('Salom, Ali! Bugun nima o‘rganamiz?')).toEqual([
      'Salom, Ali!',
      'Bugun nima o‘rganamiz?',
    ])
    expect(withoutName('Salom, Ali!', 'Ali')).toBe('Salom!')
    expect(withoutName('Salom!', 'Ali')).toBeNull()
    expect(tidyPhrase(' olamizmi?')).toBe('olamizmi?')
  })
})
