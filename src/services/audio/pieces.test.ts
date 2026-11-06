import { afterEach, describe, expect, it, vi } from 'vitest'
import { phraseKey } from './phrases'
import { numberWords, PIECE_PAUSE_MS, piecesOf, templatePieces } from './pieces'

/*
 * Numbers, signs and lists are said from recorded pieces ("uch" + "minus" + "bir" +
 * "teng" + "ikki"), and the recorder lists exactly the pieces that are looked up.
 */

const anything = () => true

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('./kidVoiceManifest.json')
})

describe('the maths signs', () => {
  it('keep their minus in the clip key ("3 − 1 = 2" is not "3 1 = 2")', () => {
    expect(phraseKey('uz', '3 − 1 = 2')).not.toBe(phraseKey('uz', '3 1 = 2'))
    expect(phraseKey('uz', '3 − 1 = 2')).not.toBe(phraseKey('uz', '3 + 1 = 2'))
  })

  it('are said as words in every language', () => {
    expect(piecesOf('3 − 1 = 2', 'uz', anything)).toEqual(['uch', 'minus', 'bir', 'teng', 'ikki'])
    expect(piecesOf('3 − 1 = 2', 'ru', anything)).toEqual(['три', 'минус', 'один', 'равно', 'два'])
    expect(piecesOf('3 − 1 = 2', 'en', anything)).toEqual([
      'three',
      'minus',
      'one',
      'equals',
      'two',
    ])
    expect(piecesOf('3 + 1 = 4', 'uz', anything)).toEqual([
      'uch',
      'qo‘shish',
      'bir',
      'teng',
      'toʻrt',
    ])
    // a plain hyphen between numbers is a minus too
    expect(piecesOf('5 - 2 = 3', 'en', anything)).toEqual([
      'five',
      'minus',
      'two',
      'equals',
      'three',
    ])
  })
})

describe('numbers', () => {
  it('are said with their words, one piece each', () => {
    expect(numberWords(35, 'uz')).toEqual(['oʻttiz', 'besh'])
    expect(numberWords(100, 'uz')).toEqual(['yuz'])
    expect(numberWords(214, 'ru')).toEqual(['двести', 'четырнадцать'])
    expect(numberWords(17, 'en')).toEqual(['seventeen'])
    expect(numberWords(0, 'en')).toEqual(['zero'])
    expect(numberWords(1000, 'uz')).toBeNull()
  })

  it('a counter’s "+5" is just "five"', () => {
    expect(piecesOf('Yong‘oqlar: +5', 'uz', anything)).toEqual(['yong‘oqlar', 'besh'])
  })
})

describe('sentences from pieces', () => {
  const recorded = new Set(['savatda', 'ta', 'olma', 'bor edi', 'uch'])
  const has = (piece: string) => recorded.has(piece)

  it('finds the fewest recorded pieces, and nothing when one is missing', () => {
    expect(piecesOf('Savatda 3 ta olma bor edi.', 'uz', has)).toEqual([
      'savatda',
      'uch',
      'ta',
      'olma',
      'bor edi',
    ])
    expect(piecesOf('Savatda 3 ta nok bor edi.', 'uz', has)).toBeNull()
  })

  it('the recorder lists exactly the pieces a filled sentence is said with', () => {
    const template = 'Savatda {{a}} ta {{noun}} bor edi.'
    const values = [3, 4, 'olma', 'nok']
    const listed = new Set(templatePieces(template, values, 'uz'))
    for (const sentence of ['Savatda 3 ta olma bor edi.', 'Savatda 4 ta nok bor edi.']) {
      expect(piecesOf(sentence, 'uz', (piece) => listed.has(piece))).not.toBeNull()
    }
  })

  it('a list is said item by item, with its joining word', () => {
    const template = 'Dasturxonga {{list}} qo‘y!'
    const listed = new Set(templatePieces(template, ['osh, non va choy'], 'uz'))
    expect([...listed].sort()).toEqual(['choy', 'dasturxonga', 'non', 'osh', 'qo‘y', 'va'])
    expect(piecesOf('Dasturxonga non va osh qo‘y!', 'uz', (piece) => listed.has(piece))).toEqual([
      'dasturxonga',
      'non',
      'va',
      'osh',
      'qo‘y',
    ])
  })
})

describe('speaking from pieces', () => {
  it('plays the child’s voice piece by piece, with a short quiet between them', async () => {
    const keys = ['uch', 'minus', 'bir', 'teng', 'ikki'].map((piece) => phraseKey('uz', piece))
    vi.doMock('./kidVoiceManifest.json', () => ({ default: { girl: { uz: keys }, boy: {} } }))
    const { planSpeech } = await import('./voiceLibrary')
    const parts = await planSpeech('uz', '3 − 1 = 2', null, 'girl')
    expect(parts.map((part) => (part.kind === 'clip' ? part.key : part.text))).toEqual(keys)
    expect(parts.slice(0, -1).every((part) => 'pauseAfterMs' in part)).toBe(true)
    expect(parts[0]).toMatchObject({ pauseAfterMs: PIECE_PAUSE_MS })
    expect(parts.at(-1)).not.toHaveProperty('pauseAfterMs')
  })
})
