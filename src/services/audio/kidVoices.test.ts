/// <reference types="node" />
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import manifest from './kidVoiceManifest.json'
import { KID_VOICES, kidClipUrl, kidVoiceFor } from './kidVoices'
import { phraseKey } from './phrases'

/*
 * Children's voices: a girl hears the girl's recording, a boy the boy's, where
 * one exists; any other sentence keeps the standard recording; every listed
 * clip is in the build.
 */

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('./kidVoiceManifest.json')
})

describe('children voices', () => {
  it('chooses the voice by the child, and none when unknown', () => {
    expect(kidVoiceFor('girl')).toBe('girl')
    expect(kidVoiceFor('boy')).toBe('boy')
    expect(kidVoiceFor(undefined)).toBeNull()
  })

  it('plays the child voice where recorded and the standard clip elsewhere', async () => {
    const praise = 'Barakalla!'
    const key = phraseKey('uz', praise)
    vi.doMock('./kidVoiceManifest.json', () => ({
      default: { girl: { uz: [key] }, boy: {} },
    }))
    const { planSpeech } = await import('./voiceLibrary')
    const [girl] = await planSpeech('uz', praise, null, 'girl')
    expect(girl).toMatchObject({ kind: 'clip', url: kidClipUrl('girl', 'uz', key) })
    const [boy] = await planSpeech('uz', praise, null, 'boy')
    expect(boy).toMatchObject({ kind: 'clip', url: `/audio/voice/uz/${key}.mp3` })
    const [none] = await planSpeech('uz', praise)
    expect(none).toMatchObject({ kind: 'clip', url: `/audio/voice/uz/${key}.mp3` })
  })

  it('lists only clips that are in the build', () => {
    for (const voice of KID_VOICES)
      for (const [language, keys] of Object.entries(manifest[voice]))
        for (const key of keys as string[])
          expect(
            fs.existsSync(
              path.resolve('public', kidClipUrl(voice, language as 'uz', key).slice(1)),
            ),
            `${voice}/${language}/${key}`,
          ).toBe(true)
  })
})
