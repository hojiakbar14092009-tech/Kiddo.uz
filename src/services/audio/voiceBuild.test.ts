import { afterEach, describe, expect, it, vi } from 'vitest'
import { isVoicePrivateBuild, VOICE_GLOB_IGNORES, voiceRuntimeCaching } from './voiceBuild'
import { dropPublicVoiceCache, PUBLIC_VOICE_CACHE } from './voicePaths'

describe('voice build settings', () => {
  it('keeps voice public by default', () => {
    expect(isVoicePrivateBuild({})).toBe(false)
    expect(isVoicePrivateBuild({ VITE_VOICE_PRIVATE: 'false' })).toBe(false)
    expect(isVoicePrivateBuild({ VITE_VOICE_PRIVATE: '1' })).toBe(false)
    expect(isVoicePrivateBuild({ VITE_VOICE_PRIVATE: 'true' })).toBe(true)
  })

  it('caches public clips at runtime, but never precaches them', () => {
    const [rule] = voiceRuntimeCaching(false)
    expect(rule?.handler).toBe('CacheFirst')
    expect(rule?.urlPattern({ url: new URL('https://kiddo.uz/audio/voice/uz/000cef41.mp3') })).toBe(
      true,
    )
    expect(rule?.urlPattern({ url: new URL('https://kiddo.uz/audio/ui/ui_click.mp3') })).toBe(false)
    expect(VOICE_GLOB_IGNORES).toContain('audio/voice/**')
  })

  it('has no service worker cache for voice in private mode', () => {
    expect(voiceRuntimeCaching(true)).toEqual([])
  })

  describe('the old public clip cache in a private build', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('is deleted on startup only when the private flag is on', async () => {
      const remove = vi.fn(async () => true)
      vi.stubGlobal('caches', { delete: remove })
      expect(voiceRuntimeCaching(false)[0]?.options.cacheName).toBe(PUBLIC_VOICE_CACHE)
      expect(await dropPublicVoiceCache(false)).toBe(false)
      expect(remove).not.toHaveBeenCalled()
      expect(await dropPublicVoiceCache(true)).toBe(true)
      expect(remove).toHaveBeenCalledWith('kiddo-voice')
    })

    it('never throws (no Cache Storage, or it fails)', async () => {
      vi.stubGlobal('caches', undefined)
      expect(await dropPublicVoiceCache(true)).toBe(false)
      vi.stubGlobal('caches', { delete: () => Promise.reject(new Error('SecurityError')) })
      expect(await dropPublicVoiceCache(true)).toBe(false)
    })
  })
})
