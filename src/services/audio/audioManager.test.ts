import { Howl } from 'howler'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { audioManager } from './audioManager'
import { speech } from './speech'

// a production build: voice is PRO (the demo build makes it free, config/demo.test.tsx)
vi.mock('@/config/demo', () => ({
  DEMO: { demoMode: false, publicProUIEnabled: true, demoAdminEnabled: false },
}))

type FakeHowl = { options: { src: string[] } }
const instances = () => (Howl as unknown as { instances: FakeHowl[] }).instances

describe('audioManager', () => {
  beforeEach(() => {
    useSettingsStore.setState({ volume: 0.8 })
    useSubscriptionStore.getState().cancel()
    vi.spyOn(speech, 'say').mockResolvedValue(true)
  })

  afterEach(() => vi.restoreAllMocks())

  it('plays the click in Free', () => {
    audioManager.play('click')
    expect(instances().some((howl) => howl.options.src[0] === '/audio/ui/ui_click.mp3')).toBe(true)
  })

  it('stays silent for voice in Free', async () => {
    const spoke = await audioManager.speak([{ text: 'banan' }], { language: 'uz' })
    expect(spoke).toBe(false)
    expect(speech.say).not.toHaveBeenCalled()
  })

  it('speaks in PRO: recorded clips first, the device voice for anything else', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: 'ali' })
    const spoke = await audioManager.speak([{ text: 'банан' }, { text: 'Тест без записи.' }], {
      language: 'ru',
    })

    expect(spoke).toBe(true)
    expect(instances().some((howl) => howl.options.src[0]?.startsWith('/audio/voice/ru/'))).toBe(
      true,
    )
    expect(speech.say).toHaveBeenCalledTimes(1)
    expect(speech.say).toHaveBeenCalledWith('Тест без записи.', {
      language: 'ru',
      volume: 0.8,
      // a sentence without the child's name may also go to a cloud device voice
      remoteText: 'Тест без записи.',
    })
  })

  it('counts a sentence without a device voice as missing, never done', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: 'ali' })
    vi.spyOn(speech, 'say').mockResolvedValue(false)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(await audioManager.say([{ text: 'Тест без записи.' }], { language: 'ru' })).toBe(
      'missing',
    )
    audioManager.stopSpeech()
  })

  it('waits the pause after an item before the next one (letter, pause, word)', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: 'ali' })
    vi.useFakeTimers()
    try {
      const said: string[] = []
      vi.spyOn(speech, 'say').mockImplementation(async (text) => {
        said.push(String(text))
        return true
      })
      const done = audioManager.say(
        [{ text: 'Бэ без записи.', pauseAfterMs: 900 }, { text: 'Слово без записи.' }],
        { language: 'ru' },
      )
      await vi.advanceTimersByTimeAsync(10)
      expect(said).toEqual(['Бэ без записи.'])
      await vi.advanceTimersByTimeAsync(800)
      // still the pause: the word waits
      expect(said).toEqual(['Бэ без записи.'])
      await vi.advanceTimersByTimeAsync(200)
      expect(said).toEqual(['Бэ без записи.', 'Слово без записи.'])
      expect(await done).toBe('done')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a stop during the pause ends the speech at once', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: 'ali' })
    const said: string[] = []
    vi.spyOn(speech, 'say').mockImplementation(async (text) => {
      said.push(String(text))
      return true
    })
    const done = audioManager.say(
      [{ text: 'Бэ без записи.', pauseAfterMs: 3000 }, { text: 'Слово без записи.' }],
      { language: 'ru' },
    )
    await vi.waitFor(() => expect(said).toEqual(['Бэ без записи.']))
    audioManager.stopSpeech()
    expect(await done).toBe('cancelled')
    expect(said).toEqual(['Бэ без записи.'])
  })

  it('stays silent at zero volume', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: 'ali' })
    useSettingsStore.setState({ volume: 0 })
    await audioManager.speak([{ text: 'apple' }], { language: 'en' })
    expect(speech.say).not.toHaveBeenCalled()
  })

  it('stays silent for a guest even when the family has PRO', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: null })
    const say = vi.spyOn(speech, 'say').mockResolvedValue(true)
    expect(await audioManager.speak([{ text: 'Salom' }], { language: 'uz' })).toBe(false)
    expect(say).not.toHaveBeenCalled()
  })
})

describe('the children’s voices', () => {
  beforeEach(() => {
    useSettingsStore.setState({ volume: 0.8 })
    useSubscriptionStore.getState().setDemoPro(true)
    vi.spyOn(speech, 'say').mockResolvedValue(true)
  })

  afterEach(() => {
    useFamilyStore.setState({ children: [], activeChildId: null })
    vi.restoreAllMocks()
  })

  const lastSrc = () => instances().at(-1)?.options.src[0]

  it('a profile without a gender hears its own robot', async () => {
    const child = { id: 'old', name: 'Ali', mascot: 'boy' } as unknown as ChildProfile
    useFamilyStore.setState({ children: [child], activeChildId: 'old' })
    await audioManager.speak([{ text: 'Barakalla!' }], { language: 'uz' })
    expect(lastSrc()).toMatch(/^\/audio\/voice\/kid\/boy\/uz\//)
  })

  it('plays a recording from this device as it is, then the sentence', async () => {
    useFamilyStore.setState({ activeChildId: 'ali' })
    const before = instances().length
    const outcome = await audioManager.say(
      [{ text: '', recording: { url: 'blob:name', format: 'webm' } }, { text: 'Barakalla!' }],
      { language: 'uz' },
    )
    expect(outcome).toBe('done')
    const played = instances().slice(before)
    expect(played[0]?.options).toMatchObject({ src: ['blob:name'], format: ['webm'] })
    expect(played[1]?.options.src[0]).toMatch(/^\/audio\/voice\/kid\/girl\/uz\//)
  })
})
