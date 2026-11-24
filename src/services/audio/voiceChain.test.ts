import { Howl } from 'howler'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { audioManager } from './audioManager'
import { speech } from './speech'
import { liveVoiceUrl } from './voicePaths'

vi.mock('@/config/demo', () => ({
  DEMO: { demoMode: false, publicProUIEnabled: true, demoAdminEnabled: false },
}))

type FakeHowl = { options: Record<string, unknown> & { src: string[] } }
const instances = () => (Howl as unknown as { instances: FakeHowl[] }).instances
const UNRECORDED = 'Тест без записи.'

/** Clips whose URL matches fail to load, like a 404, an outage or no network. */
function failLoading(matches: (src: string) => boolean) {
  const proto = (Howl as unknown as { prototype: { play: () => number } }).prototype
  const play = proto.play
  vi.spyOn(proto, 'play').mockImplementation(function (this: FakeHowl) {
    const src = this.options.src[0] ?? ''
    if (!matches(src)) return play.call(this)
    const onloaderror = this.options.onloaderror
    if (typeof onloaderror === 'function') queueMicrotask(() => onloaderror(1, 'failed'))
    return 1
  })
}

const played = (from: number) =>
  instances()
    .slice(from)
    .map((howl) => howl.options.src[0])

describe('the voice chain: recording → live voice → device voice → silence', () => {
  beforeEach(() => {
    useSettingsStore.setState({ volume: 0.8 })
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ children: [], activeChildId: 'ali' })
    vi.spyOn(speech, 'say').mockResolvedValue(true)
    audioManager.resetLiveVoiceForTests()
  })
  afterEach(() => {
    audioManager.stopSpeech()
    vi.restoreAllMocks()
  })

  it('builds one cacheable URL per sentence, language, voice role and voice version', () => {
    expect(liveVoiceUrl('ru', UNRECORDED)).toBe(
      `/api/tts?lang=ru&role=narrator&v=0&text=${encodeURIComponent(UNRECORDED)}`,
    )
  })

  it('a sentence without a recording plays the live voice, not the device voice', async () => {
    const before = instances().length
    expect(await audioManager.say([{ text: UNRECORDED }], { language: 'ru' })).toBe('done')
    expect(played(before)).toEqual([liveVoiceUrl('ru', UNRECORDED)])
    expect(speech.say).not.toHaveBeenCalled()
  })

  it('the device voice takes over when the live voice fails', async () => {
    failLoading((src) => src.startsWith('/api/tts'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await audioManager.say([{ text: UNRECORDED }], { language: 'ru' })).toBe('done')
    expect(speech.say).toHaveBeenCalledWith(UNRECORDED, expect.objectContaining({ language: 'ru' }))
  })

  it('a recording that fails to load falls to the live voice, then to the device voice', async () => {
    failLoading(() => true)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const before = instances().length
    expect(await audioManager.say([{ text: 'банан' }], { language: 'ru' })).toBe('done')
    const urls = played(before)
    expect(urls[0]).toMatch(/^\/audio\/voice\/ru\//)
    expect(urls[1]).toBe(liveVoiceUrl('ru', 'банан'))
    expect(speech.say).toHaveBeenCalledWith('банан', expect.objectContaining({ language: 'ru' }))
  })

  it('always resolves when every link fails (silence, the text stays on screen)', async () => {
    failLoading(() => true)
    vi.spyOn(speech, 'say').mockResolvedValue(false)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await audioManager.say([{ text: UNRECORDED }], { language: 'ru' })).toMatch(
      /^(missing|error)$/,
    )
  })

  it('after a live failure the next sentences skip it for a while (no wait per sentence)', async () => {
    failLoading((src) => src.startsWith('/api/tts'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await audioManager.say([{ text: UNRECORDED }], { language: 'ru' })
    const before = instances().length
    await audioManager.say([{ text: 'Ещё тест без записи.' }], { language: 'ru' })
    expect(played(before)).toEqual([])
  })

  it("never sends the child's name to the live voice", async () => {
    const child = { id: 'z', name: 'Zarina', gender: 'girl' } as unknown as ChildProfile
    useFamilyStore.setState({ children: [child], activeChildId: 'z' })
    const before = instances().length
    await audioManager.say([{ text: 'Молодец, Zarina, тест без записи!' }], { language: 'ru' })
    expect(played(before).every((src) => !src?.includes('Zarina'))).toBe(true)
  })

  it('clipsOnly still allows the live voice (it speaks the language), never the device one', async () => {
    failLoading((src) => src.startsWith('/api/tts'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(
      await audioManager.say([{ text: UNRECORDED }], { language: 'ru' }, { clipsOnly: true }),
    ).toBe('missing')
    expect(speech.say).not.toHaveBeenCalled()
  })

  it('prefetch warms the next sentences without a sound and never throws', async () => {
    const fetched: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      fetched.push(url)
      if (url.startsWith('/api/tts')) throw new Error('offline')
      return new Response('')
    })
    const before = instances().length
    await audioManager.prefetch(['банан', UNRECORDED], 'ru')
    expect(fetched.some((url) => url.startsWith('/audio/voice/ru/'))).toBe(true)
    expect(fetched).toContain(liveVoiceUrl('ru', UNRECORDED))
    expect(played(before)).toEqual([])
    vi.unstubAllGlobals()
  })
})
