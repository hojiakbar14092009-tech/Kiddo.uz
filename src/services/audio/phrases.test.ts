import { describe, expect, it } from 'vitest'
import { phraseKey, remoteSafeText, splitSentences, tidyPhrase, withoutName } from './phrases'

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

  it('gives remote TTS only sentences without the child’s name', () => {
    expect(remoteSafeText('Bugun nima o‘rganamiz?', 'Ali')).toBe('Bugun nima o‘rganamiz?')
    expect(remoteSafeText('Salom!', null)).toBe('Salom!')
    expect(remoteSafeText('Bugun juda yaxshi o‘ynading, Ali!', 'Ali')).toBe(
      'Bugun juda yaxshi o‘ynading!',
    )
    expect(remoteSafeText('Ali!', 'Ali')).toBeNull()
    expect(remoteSafeText('Salom, Ali!', 'Ali')).toBeNull()
    expect(remoteSafeText('Salom, ALI, qalaysan?', 'Ali')).toBeNull()
    expect(remoteSafeText('Ali va Ali do‘st.', ' Ali ')).toBe('va do‘st.')
  })
})
