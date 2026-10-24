import { Howl } from 'howler'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { useFamilyStore } from '@/store/familyStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { audioManager } from './audioManager'
import { speech } from './speech'

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
