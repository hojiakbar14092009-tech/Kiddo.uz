import { Howl } from 'howler'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsStore } from '@/store/settingsStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { audioManager } from './audioManager'
import { speech } from './speech'

type FakeHowl = { options: { src: string[] } }
const instances = () => (Howl as unknown as { instances: FakeHowl[] }).instances

describe('audioManager', () => {
  beforeEach(() => {
    useSettingsStore.setState({ volume: 0.8 })
    useSubscriptionStore.getState().cancel()
    vi.spyOn(speech, 'say').mockResolvedValue()
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

  it('speaks in PRO with the chosen volume', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    const spoke = await audioManager.speak([{ text: 'Б' }, { text: 'банан' }], { language: 'ru' })

    expect(spoke).toBe(true)
    expect(speech.say).toHaveBeenNthCalledWith(1, 'Б', { language: 'ru', volume: 0.8 })
    expect(speech.say).toHaveBeenNthCalledWith(2, 'банан', { language: 'ru', volume: 0.8 })
  })

  it('stays silent at zero volume', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    useSettingsStore.setState({ volume: 0 })
    await audioManager.speak([{ text: 'apple' }], { language: 'en' })
    expect(speech.say).not.toHaveBeenCalled()
  })
})
