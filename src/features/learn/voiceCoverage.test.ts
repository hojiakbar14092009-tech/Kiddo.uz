import { describe, expect, it } from 'vitest'
import { childPhrases } from '@/services/audio/childPhrases'
import { hasNumbers, piecesOf } from '@/services/audio/pieces'
import { planSpeech } from '@/services/audio/voiceLibrary'
import { LEARN_SPOKEN } from './spoken'

/*
 * Every sentence the new sections can read aloud has a recording. PRO voice
 * plays recordings only (never the device voice), so a missing clip would be
 * silence: run scripts/voices/collect.ts and generate.py after changing texts.
 * A line with numbers or signs ("3 − 1 = 2") is said from pieces (pieces.ts):
 * every piece it needs is on the recording list.
 */
describe('voice recordings for the new sections', () => {
  const phrases = childPhrases()
  for (const language of ['uz', 'ru', 'en'] as const) {
    it(`every ${language} line is recorded`, async () => {
      const listed = new Set(phrases[language])
      const missing: string[] = []
      for (const line of LEARN_SPOKEN[language]) {
        const parts = await planSpeech(language, line)
        if (parts.every((part) => part.kind === 'clip')) continue
        const pieced = hasNumbers(line) && piecesOf(line, language, (piece) => listed.has(piece))
        if (!pieced) missing.push(line)
      }
      expect(missing).toEqual([])
    })
  }
})
