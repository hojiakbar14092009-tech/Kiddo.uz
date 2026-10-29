import { Howl } from 'howler'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { audioManager, type SpeechStatus } from './audioManager'
import { phraseKey } from './phrases'

// a production build: voice is PRO (the demo build makes it free, config/demo.test.tsx)
vi.mock('@/config/demo', () => ({
  DEMO: { demoMode: false, publicProUIEnabled: true, demoAdminEnabled: false },
}))

/*
 * The shared speech control: one voice at a time, a status every speaker
 * button and the mascot can follow, and honest outcomes (nothing fails silently).
 * Here clips do not end on their own, so a test decides when each one ends.
 */

interface FakeHowl {
  options: {
    src: string[]
    onplay?: () => void
    onend?: () => void
    onstop?: () => void
    onloaderror?: (id: number, error: unknown) => void
  }
  playing: boolean
  play(): number
  stop(): FakeHowl
}

const HowlClass = Howl as unknown as { instances: FakeHowl[]; prototype: FakeHowl }
const voiceHowls = () =>
  HowlClass.instances.filter((howl) => howl.options.src[0]?.startsWith('/audio/voice/'))
const playing = () => voiceHowls().filter((howl) => howl.playing)
const clipUrl = (language: string, text: string) =>
  `/audio/voice/${language}/${phraseKey(language, text)}.mp3`
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const EN = 'Which one is Earth’s natural satellite?'
const EN_2 = 'Which planet has rings you can clearly see?'

describe('speech control', () => {
  let statuses: SpeechStatus[] = []
  let unsubscribe = () => {}

  beforeEach(() => {
    HowlClass.instances.length = 0
    vi.spyOn(HowlClass.prototype, 'play').mockImplementation(function (this: FakeHowl) {
      this.playing = true
      this.options.onplay?.()
      return 1
    })
    vi.spyOn(HowlClass.prototype, 'stop').mockImplementation(function (this: FakeHowl) {
      if (this.playing) {
        this.playing = false
        this.options.onstop?.()
      }
      return this
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    useSettingsStore.setState({ volume: 0.8, language: 'en' })
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: 'ali' })
    statuses = []
    unsubscribe = audioManager.subscribe((status) => statuses.push(status))
  })

  afterEach(() => {
    audioManager.stopSpeech()
    unsubscribe()
    vi.restoreAllMocks()
  })

  const end = (howl: FakeHowl) => {
    howl.playing = false
    howl.options.onend?.()
  }

  it('reads the recording of exactly that sentence: loading → speaking → idle', async () => {
    const said = audioManager.say([{ text: EN }], { language: 'en' }, { clipsOnly: true })
    await vi.waitFor(() => expect(playing()).toHaveLength(1))
    expect(playing()[0]!.options.src[0]).toBe(clipUrl('en', EN))
    expect(audioManager.getStatus()).toBe('speaking')
    end(playing()[0]!)
    expect(await said).toBe('done')
    expect(statuses).toEqual(['loading', 'speaking', 'idle'])
  })

  it('never lets two voices overlap: pressing again stops the first and starts over', async () => {
    const first = audioManager.say([{ text: EN }], { language: 'en' }, { clipsOnly: true })
    await vi.waitFor(() => expect(playing()).toHaveLength(1))
    const second = audioManager.say([{ text: EN }], { language: 'en' }, { clipsOnly: true })
    const third = audioManager.say([{ text: EN_2 }], { language: 'en' }, { clipsOnly: true })
    await vi.waitFor(() => expect(playing()[0]?.options.src[0]).toBe(clipUrl('en', EN_2)))
    expect(playing()).toHaveLength(1)
    expect(await first).toBe('cancelled')
    expect(await second).toBe('cancelled')
    end(playing()[0]!)
    expect(await third).toBe('done')
    expect(audioManager.getStatus()).toBe('idle')
  })

  it('stops at once when the language or the child changes', async () => {
    const said = audioManager.say([{ text: EN }], { language: 'en' }, { clipsOnly: true })
    await vi.waitFor(() => expect(playing()).toHaveLength(1))
    useSettingsStore.setState({ language: 'uz' })
    expect(playing()).toHaveLength(0)
    expect(await said).toBe('cancelled')
    expect(audioManager.getStatus()).toBe('idle')

    const again = audioManager.say([{ text: EN }], { language: 'en' }, { clipsOnly: true })
    await vi.waitFor(() => expect(playing()).toHaveLength(1))
    useFamilyStore.setState({ activeChildId: 'lola' })
    expect(playing()).toHaveLength(0)
    expect(await again).toBe('cancelled')
  })

  it('says so when a sentence has no recording, instead of failing silently', async () => {
    const said = await audioManager.say(
      [{ text: 'A sentence nobody recorded.' }],
      { language: 'en' },
      { clipsOnly: true },
    )
    expect(said).toBe('missing')
    expect(audioManager.getStatus()).toBe('error')
    expect(voiceHowls()).toHaveLength(0)
  })

  it('reports a clip that cannot load as an error, then returns to idle', async () => {
    vi.useFakeTimers()
    try {
      const said = audioManager.say([{ text: EN }], { language: 'en' }, { clipsOnly: true })
      await vi.waitFor(() => expect(voiceHowls()).toHaveLength(1))
      voiceHowls()[0]!.options.onloaderror?.(1, 'network')
      expect(await said).toBe('error')
      expect(audioManager.getStatus()).toBe('error')
      vi.advanceTimersByTime(3000)
      expect(audioManager.getStatus()).toBe('idle')
    } finally {
      vi.useRealTimers()
    }
  })

  it('makes no sound at all without PRO, or for a guest', async () => {
    useSubscriptionStore.getState().cancel()
    expect(await audioManager.say([{ text: EN }], { language: 'en' })).toBe('locked')
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: null })
    expect(await audioManager.say([{ text: EN }], { language: 'en' })).toBe('locked')
    await settle()
    expect(voiceHowls()).toHaveLength(0)
    expect(statuses).toEqual([])
  })

  it('tells the caller when the sound is turned off', async () => {
    useSettingsStore.setState({ volume: 0 })
    expect(await audioManager.say([{ text: EN }], { language: 'en' })).toBe('muted')
    expect(voiceHowls()).toHaveLength(0)
  })
})
