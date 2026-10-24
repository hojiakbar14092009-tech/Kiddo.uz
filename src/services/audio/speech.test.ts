import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { speech } from './speech'

class FakeUtterance {
  text: string
  voice: SpeechSynthesisVoice | null = null
  lang = ''
  pitch = 1
  rate = 1
  volume = 1
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(text: string) {
    this.text = text
  }
}

function installSynth(voices: Array<Pick<SpeechSynthesisVoice, 'lang' | 'localService'>>) {
  const spoken: FakeUtterance[] = []
  const synth = {
    getVoices: () => voices as SpeechSynthesisVoice[],
    speak: vi.fn((utterance: FakeUtterance) => {
      spoken.push(utterance)
      utterance.onend?.()
    }),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  return { synth, spoken }
}

describe('speech', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('speaks each phrase with a matching voice', async () => {
    const { spoken } = installSynth([
      { lang: 'en-US', localService: true },
      { lang: 'ru-RU', localService: true },
    ])

    expect(await speech.say(['Б', 'банан'], { language: 'ru' })).toBe(true)

    expect(spoken.map((u) => u.text)).toEqual(['Б', 'банан'])
    expect(spoken.every((u) => u.lang === 'ru-RU')).toBe(true)
  })

  it('stays silent when no voice exists for the language', async () => {
    const { synth } = installSynth([{ lang: 'en-US', localService: true }])

    expect(await speech.say('banan', { language: 'uz' })).toBe(false)

    expect(synth.speak).not.toHaveBeenCalled()
    expect(await speech.hasVoice('uz')).toBe(false)
  })

  it('reports false without a speech engine', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    const original = Object.getOwnPropertyDescriptor(window, 'speechSynthesis')
    // jsdom: make `'speechSynthesis' in window` false
    delete (window as { speechSynthesis?: unknown }).speechSynthesis
    expect(await speech.say('banan', { language: 'uz' })).toBe(false)
    if (original) Object.defineProperty(window, 'speechSynthesis', original)
  })

  it('can borrow another locale, e.g. for the mascot’s “Yahoooo!”', async () => {
    const { spoken } = installSynth([{ lang: 'en-GB', localService: true }])

    await speech.say('Yahoooo!', { language: 'uz', locale: 'en-US' })

    expect(spoken[0]?.lang).toBe('en-GB')
  })

  it('a voice on the device hears the child’s name', async () => {
    const { spoken } = installSynth([{ lang: 'ru-RU', localService: true }])
    await speech.say('Молодец, Азиз!', { language: 'ru', remoteText: 'Молодец!' })
    expect(spoken.map((u) => u.text)).toEqual(['Молодец, Азиз!'])
  })

  it('a cloud voice never gets the name: the sentence without it, or silence', async () => {
    const { spoken } = installSynth([{ lang: 'ru-RU', localService: false }])
    expect(await speech.say('Молодец, Азиз!', { language: 'ru', remoteText: 'Молодец!' })).toBe(
      true,
    )
    expect(spoken.map((u) => u.text)).toEqual(['Молодец!'])
    expect(await speech.say('Азиз', { language: 'ru', remoteText: null })).toBe(false)
    expect(spoken).toHaveLength(1)
  })
})
