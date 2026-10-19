import { describe, expect, it } from 'vitest'
import { planSpeech } from '@/services/audio/voiceLibrary'
import { LEARN_SPOKEN } from './spoken'

/*
 * Every sentence the new sections can read aloud has a recording. PRO voice
 * plays recordings only (never the device voice), so a missing clip would be
 * silence: run scripts/voices/collect.ts and generate.py after changing texts.
 */
describe('voice recordings for the new sections', () => {
  for (const language of ['uz', 'ru', 'en'] as const) {
    it(`every ${language} line is recorded`, async () => {
      const missing: string[] = []
      for (const line of LEARN_SPOKEN[language]) {
        const parts = await planSpeech(language, line)
        if (parts.some((part) => part.kind !== 'clip')) missing.push(line)
      }
      expect(missing).toEqual([])
    })
  }
})
