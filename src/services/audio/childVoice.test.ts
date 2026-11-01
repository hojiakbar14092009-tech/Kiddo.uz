import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { childPhrases, childTemplates, leaves, SPOKEN_PARTS, type Tree } from './childPhrases'
import pending from './pendingRecordings.json'
import { splitSentences } from './phrases'
import { planSpeech } from './voiceLibrary'

/*
 * Voice first (Phase 41): every sentence Kiddo can say to a child has a
 * recording, so the voice never falls silent or into the device voice.
 * pendingRecordings.json lists the sentences still waiting for the recorder
 * (new texts since the last recording; scripts/voices: collect.ts, then
 * generate.py). A new sentence without a recording fails here until it is
 * recorded or, knowingly, added to that list; a recorded one must leave it.
 * UPDATE_PENDING=1 npx vitest run childVoice rewrites the list.
 */

const PENDING = pending as unknown as Record<'uz' | 'ru' | 'en', string[]> & {
  templates: Record<'uz' | 'ru' | 'en', string[]>
}

async function unrecorded(language: 'uz' | 'ru' | 'en', phrases: readonly string[]) {
  const missing: string[] = []
  for (const phrase of phrases) {
    const parts = await planSpeech(language, phrase)
    if (parts.some((part) => part.kind !== 'clip')) missing.push(phrase)
  }
  return missing
}

describe('every child sentence has a recording', () => {
  const all = childPhrases()

  if (process.env.UPDATE_PENDING === '1') {
    it('rewrites the pending list', async () => {
      const out: Record<string, string[]> = {}
      for (const language of ['uz', 'ru', 'en'] as const) {
        out[language] = (await unrecorded(language, all[language])).sort()
      }
      const withTemplates = { ...out, templates: childTemplates() }
      writeFileSync(
        join(__dirname, 'pendingRecordings.json'),
        `${JSON.stringify(withTemplates, null, 2)}\n`,
      )
    })
    return
  }

  for (const language of ['uz', 'ru', 'en'] as const) {
    it(`${language}: nothing new is unvoiced, and nothing recorded stays on the list`, async () => {
      const missing = await unrecorded(language, all[language])
      const known = new Set(PENDING[language])
      expect(missing.filter((phrase) => !known.has(phrase))).toEqual([])
      const now = new Set(missing)
      expect(PENDING[language].filter((phrase) => !now.has(phrase))).toEqual([])
    })
  }

  it('lines filled in at run time are listed as templates for the recorder', () => {
    // a new template (a placeholder from the screen) must be listed knowingly
    expect(childTemplates()).toEqual(PENDING.templates)
  })
})

/** Sentences (and clauses after a colon or a dash) of a text, in words. */
function clauses(text: string): string[][] {
  return text
    .replace(/\{\{[^}]+\}\}/g, 'X')
    .split(/[.!?…:;—–]+/)
    .map((part) => part.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)))
}

/** Is this (template-free) sentence recorded already? */
async function recorded(language: 'uz' | 'ru' | 'en', sentence: string): Promise<boolean> {
  if (/\{\{/.test(sentence)) return false
  const parts = await planSpeech(language, sentence)
  return parts.every((part) => part.kind === 'clip')
}

/*
 * A sentence said to a child has at most 8 words (a clause after a colon or a
 * dash counts on its own). Lines recorded before Phase 41 keep their wording
 * until the next recording (re-wording them now would only make them silent);
 * every new or changed line must be short.
 */
describe('what the robot says to a child is short', () => {
  // parent-facing lines inside the spoken parts are not said to the child
  const PARENT = ['learn.parent.', 'learn.voiceLocked', 'tutor.parent']
  for (const [language, tree] of [
    ['uz', uz],
    ['ru', ru],
    ['en', en],
  ] as const) {
    it(`${language}: at most 8 words a sentence in every new line`, async () => {
      const long: string[] = []
      for (const [key, text] of leaves(tree as unknown as Tree)) {
        if (!SPOKEN_PARTS.some((part) => key === part || key.startsWith(`${part}.`))) continue
        if (PARENT.some((prefix) => key.startsWith(prefix))) continue
        // sentence by sentence: a recorded long sentence keeps its wording
        for (const sentence of splitSentences(text)) {
          if (!clauses(sentence).some((words) => words.length > 8)) continue
          if (await recorded(language, sentence)) continue
          long.push(`${key}: ${sentence}`)
        }
      }
      expect(long).toEqual([])
    })
  }
})
