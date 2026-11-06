import { describe, expect, it } from 'vitest'
import { childPhrases, CONTENT_PARTS, phrasesOfParts } from './childPhrases'

/*
 * Lines built at run time from pieces (a city, a dinosaur, a noun, a number)
 * are listed filled in with every real value, so the recorder records them.
 */
describe('every filled-in sentence is listed for the recorder', () => {
  const uz = new Set(childPhrases().uz)

  it('fills the templates with real values and leaves no placeholder', () => {
    for (const sentence of [
      // feelings: a scene's own name, the scene, a face to find
      'Sardor o‘zini qanday his qilyapti?',
      'Sardor do‘stlari bilan hovlida to‘p o‘ynayapti.',
      'Xursand yuzni top!',
      // the dinosaur world: the dinosaur's name, not the child's
      'Tiranozavr haqida hammasini topding!',
      // the map of Uzbekistan
      'Bu – Samarqand.',
      // Math Lab: a noun prompt
      'Nechta olma bor?',
    ])
      expect(uz, sentence).toContain(sentence)
    expect(uz).not.toContain('haqida hammasini topding!')
    for (const phrases of Object.values(childPhrases()))
      expect(phrases.filter((sentence) => sentence.includes('{{'))).toEqual([])
  })

  it('gives the same sentences part by part, content parts by name', () => {
    expect(phrasesOfParts(['feelings']).uz).toContain('Sardor o‘zini qanday his qilyapti?')
    expect(phrasesOfParts(['uzbekistan.map']).uz).toContain('Bu – Toshkent.')
    expect(phrasesOfParts(['content.feelings']).uz).toContain('Xursand yuzni top!')
    expect(phrasesOfParts(['content.dino']).uz).not.toContain('Xursand yuzni top!')
    // "content" names every content part
    expect(phrasesOfParts(['content']).uz.length).toBeGreaterThan(
      phrasesOfParts(['content.feelings']).uz.length,
    )
    for (const name of Object.keys(CONTENT_PARTS)) expect(name).toMatch(/^content\./)
  })
})
