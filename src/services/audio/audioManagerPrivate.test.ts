import { Howl } from 'howler'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { audioManager } from './audioManager'
import { phraseKey } from './phrases'
import { requestTts, type TtsResult } from './remoteTts'
import { speech } from './speech'
import { resolveClips, voiceMode, type ClipResolution } from './voiceSource'

// a production build: voice is PRO (the demo build makes it free, config/demo.test.tsx)
vi.mock('@/config/demo', () => ({
  DEMO: { demoMode: false, publicProUIEnabled: true, demoAdminEnabled: false },
}))

/*
 * audioManager in private voice mode (docs/architecture/audio-security.md):
 * clips come from voiceSource, the server's not_pro is `locked`, failures are
 * `error`, and still only one voice at a time.
 */

vi.mock('./voiceSource', () => ({
  voiceMode: vi.fn(() => 'private'),
  resolveClips: vi.fn(),
}))
vi.mock('./remoteTts', () => ({ requestTts: vi.fn() }))

interface FakeHowl {
  options: { src: string[]; format?: string[]; onplay?: () => void; onend?: () => void }
  playing: boolean
}
const HowlClass = Howl as unknown as {
  instances: FakeHowl[]
  prototype: { play(): number; stop(): unknown }
}
const playing = () => HowlClass.instances.filter((howl) => howl.playing)
const end = (howl: FakeHowl) => {
  howl.playing = false
  howl.options.onend?.()
}

const EN = 'Which one is Earth’s natural satellite?'
const EN_2 = 'Which planet has rings you can clearly see?'
const keyOf = (text: string) => phraseKey('en', text)
const signed = (text: string) => `https://cdn.example/en/${keyOf(text)}.mp3?token=t`

const mockedResolve = vi.mocked(resolveClips)
const mockedTts = vi.mocked(requestTts)
const mockedMode = vi.mocked(voiceMode)

function resolveSigned(): void {
  mockedResolve.mockImplementation(async (_language, keys) => ({
    status: 'ok',
    urls: Object.fromEntries(keys.map((key) => [key, `https://cdn.example/en/${key}.mp3?token=t`])),
  }))
}

describe('audioManager in private voice mode', () => {
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
        ;(this.options as { onstop?: () => void }).onstop?.()
      }
      return this
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(speech, 'say').mockResolvedValue(true)
    useSettingsStore.setState({ volume: 0.8, language: 'en' })
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: 'ali' })
    mockedMode.mockReturnValue('private')
    mockedResolve.mockReset()
    mockedTts.mockReset()
    resolveSigned()
  })

  afterEach(() => {
    audioManager.stopSpeech()
    vi.restoreAllMocks()
  })

  it('plays the signed URL and batches the request keys in one call', async () => {
    const said = audioManager.say([{ text: EN }, { text: EN_2 }], { language: 'en' })
    await vi.waitFor(() => expect(playing()).toHaveLength(1))
    expect(mockedResolve.mock.calls[0]).toEqual(['en', [keyOf(EN), keyOf(EN_2)]])
    expect(playing()[0]!.options.src).toEqual([signed(EN)])
    expect(playing()[0]!.options.format).toEqual(['mp3'])
    end(playing()[0]!)
    await vi.waitFor(() => expect(playing()).toHaveLength(1))
    expect(playing()[0]!.options.src).toEqual([signed(EN_2)])
    end(playing()[0]!)
    expect(await said).toBe('done')
    expect(audioManager.getStatus()).toBe('idle')
  })

  it('still checks PRO on the device first: no request at all on Free', async () => {
    useSubscriptionStore.getState().cancel()
    expect(await audioManager.say([{ text: EN }], { language: 'en' })).toBe('locked')
    expect(mockedResolve).not.toHaveBeenCalled()
    expect(HowlClass.instances).toHaveLength(0)
  })

  it('is locked without a sound when the server says not_pro', async () => {
    mockedResolve.mockResolvedValue({ status: 'locked' } satisfies ClipResolution)
    expect(await audioManager.say([{ text: EN }], { language: 'en' })).toBe('locked')
    expect(HowlClass.instances).toHaveLength(0)
    expect(speech.say).not.toHaveBeenCalled()
    expect(audioManager.getStatus()).toBe('idle')
  })

  it('is an error when the URLs cannot be fetched, never another voice', async () => {
    mockedResolve.mockResolvedValue({ status: 'error' })
    expect(await audioManager.say([{ text: EN }], { language: 'en' })).toBe('error')
    expect(HowlClass.instances).toHaveLength(0)
    expect(speech.say).not.toHaveBeenCalled()
    expect(audioManager.getStatus()).toBe('error')
  })

  it('counts a clip the server does not have as missing', async () => {
    mockedResolve.mockResolvedValue({ status: 'ok', urls: {} })
    expect(await audioManager.say([{ text: EN }], { language: 'en' }, { clipsOnly: true })).toBe(
      'missing',
    )
  })

  it('keeps one voice at a time: a newer request cancels one still waiting for URLs', async () => {
    let release: (value: ClipResolution) => void = () => undefined
    mockedResolve.mockImplementationOnce(
      () => new Promise<ClipResolution>((resolve) => (release = resolve)),
    )
    const first = audioManager.say([{ text: EN }], { language: 'en' })
    await vi.waitFor(() => expect(mockedResolve).toHaveBeenCalledTimes(1))
    const second = audioManager.say([{ text: EN_2 }], { language: 'en' })
    release({ status: 'ok', urls: { [keyOf(EN)]: signed(EN) } })
    expect(await first).toBe('cancelled')
    await vi.waitFor(() => expect(playing()).toHaveLength(1))
    expect(playing()[0]!.options.src).toEqual([signed(EN_2)])
    expect(HowlClass.instances.some((howl) => howl.options.src[0] === signed(EN))).toBe(false)
    end(playing()[0]!)
    expect(await second).toBe('done')
  })

  describe('a sentence without a recording', () => {
    const UNRECORDED = 'This sentence has no recording at all.'

    it('stays silent with clipsOnly (no remote voice, no device voice)', async () => {
      expect(
        await audioManager.say([{ text: UNRECORDED }], { language: 'uz' }, { clipsOnly: true }),
      ).toBe('missing')
      expect(mockedTts).not.toHaveBeenCalled()
      expect(speech.say).not.toHaveBeenCalled()
    })

    it('uses the server voice when the caller allows it', async () => {
      mockedTts.mockResolvedValue({ status: 'ok', url: 'https://cdn.example/tts.mp3?t=1' })
      const said = audioManager.say([{ text: UNRECORDED }], { language: 'en' })
      await vi.waitFor(() => expect(playing()).toHaveLength(1))
      expect(mockedTts).toHaveBeenCalledWith('en', UNRECORDED)
      expect(playing()[0]!.options.src).toEqual(['https://cdn.example/tts.mp3?t=1'])
      end(playing()[0]!)
      expect(await said).toBe('done')
      expect(speech.say).not.toHaveBeenCalled()
    })

    it('falls back to the device voice as before when the server has none (503)', async () => {
      mockedTts.mockResolvedValue({ status: 'missing' } satisfies TtsResult)
      expect(await audioManager.say([{ text: UNRECORDED }], { language: 'en' })).toBe('done')
      expect(speech.say).toHaveBeenCalledWith(UNRECORDED, {
        language: 'en',
        volume: 0.8,
        remoteText: UNRECORDED,
      })
    })

    it('is locked when the server says not_pro', async () => {
      mockedTts.mockResolvedValue({ status: 'locked' })
      expect(await audioManager.say([{ text: UNRECORDED }], { language: 'en' })).toBe('locked')
      expect(speech.say).not.toHaveBeenCalled()
    })

    it('is an error when the server fails', async () => {
      mockedTts.mockResolvedValue({ status: 'error' })
      expect(await audioManager.say([{ text: UNRECORDED }], { language: 'en' })).toBe('error')
      expect(speech.say).not.toHaveBeenCalled()
    })
  })

  describe('the child’s name never reaches the server voice', () => {
    const named = (text: string) => [{ text }]
    beforeEach(() => {
      useFamilyStore.setState({
        children: [
          { id: 'ali', name: 'Ali' } as ReturnType<
            typeof useFamilyStore.getState
          >['children'][number],
        ],
        activeChildId: 'ali',
      })
      mockedTts.mockResolvedValue({ status: 'ok', url: 'https://cdn.example/tts.mp3?t=1' })
    })
    const sentToServer = () => mockedTts.mock.calls.map((call) => call[1])

    it('sends only the sentence without the name when that is still a sentence', async () => {
      const said = audioManager.say(named('Your purple kite flew very high today, Ali!'), {
        language: 'en',
      })
      await vi.waitFor(() => expect(playing()).toHaveLength(1))
      end(playing()[0]!)
      expect(await said).toBe('done')
      expect(sentToServer()).toEqual(['Your purple kite flew very high today!'])
    })

    it('keeps a sentence that is little more than the name on the device', async () => {
      expect(await audioManager.say(named('Ali!'), { language: 'en' })).toBe('done')
      expect(await audioManager.say(named('Bravo, Ali!'), { language: 'en' })).toBe('done')
      expect(mockedTts).not.toHaveBeenCalled()
      // the device voice says the name only when it runs on the device (remoteText: null)
      expect(speech.say).toHaveBeenCalledWith('Ali!', {
        language: 'en',
        volume: 0.8,
        remoteText: null,
      })
      expect(speech.say).toHaveBeenCalledWith('Bravo, Ali!', {
        language: 'en',
        volume: 0.8,
        remoteText: null,
      })
    })

    it('is missing, not done, when such a sentence has no device voice either', async () => {
      vi.mocked(speech.say).mockResolvedValue(false)
      expect(await audioManager.say(named('Ali!'), { language: 'en' })).toBe('missing')
      expect(mockedTts).not.toHaveBeenCalled()
    })

    it('matches the name in any capitalisation', async () => {
      await audioManager.say(named('Good night, my brave little ALI.'), { language: 'en' })
      await audioManager.say(named('Wave hello to the purple ali-cat robot.'), { language: 'en' })
      expect(mockedTts).not.toHaveBeenCalled()
    })

    it('never passes the name to requestTts in a longer text', async () => {
      const said = audioManager.say(
        named('Ali, look at the moon. The orange fox naps under a tree. Sleep well, Ali.'),
        { language: 'en' },
      )
      for (let i = 0; i < 3; i += 1) {
        await vi.waitFor(() => expect(playing()).toHaveLength(1))
        end(playing()[0]!)
      }
      expect(await said).toBe('done')
      expect(sentToServer().length).toBeGreaterThan(0)
      for (const text of sentToServer()) expect(text.toLowerCase()).not.toContain('ali')
    })
  })

  it('in public mode asks nobody and plays the build paths', async () => {
    mockedMode.mockReturnValue('public')
    const said = audioManager.say([{ text: EN }], { language: 'en' })
    await vi.waitFor(() => expect(playing()).toHaveLength(1))
    expect(playing()[0]!.options.src).toEqual([`/audio/voice/en/${keyOf(EN)}.mp3`])
    expect(playing()[0]!.options.format).toBeUndefined()
    end(playing()[0]!)
    expect(await said).toBe('done')
    expect(mockedResolve).not.toHaveBeenCalled()
    expect(mockedTts).not.toHaveBeenCalled()
  })
})
