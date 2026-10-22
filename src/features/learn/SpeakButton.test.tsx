import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Howl } from 'howler'
import { useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/i18n'
import type { Language } from '@/content/languages'
import { TEXT } from '@/features/space/content'
import { useMascotStore } from '@/features/mascot/mascotStore'
import { audioManager } from '@/services/audio/audioManager'
import { phraseKey } from '@/services/audio/phrases'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { LearnShell } from './LearnShell'
import { useSpeakable } from './speakable'
import { setLearnVoiceOn } from './voice'

/*
 * The speaker button of the learning screens, with the real Koinot questions:
 * it reads the question on screen now, in the language chosen now, one voice
 * at a time, and never on Free. Clips here do not end on their own.
 */

interface FakeHowl {
  options: { src: string[]; onplay?: () => void; onend?: () => void; onstop?: () => void }
  playing: boolean
  play(): number
  stop(): FakeHowl
}
const HowlClass = Howl as unknown as { instances: FakeHowl[]; prototype: FakeHowl }
const voiceHowls = () =>
  HowlClass.instances.filter((howl) => howl.options.src[0]?.startsWith('/audio/voice/'))
const playing = () => voiceHowls().filter((howl) => howl.playing)
const url = (language: Language, text: string) =>
  `/audio/voice/${language}/${phraseKey(language, text)}.mp3`

const moon = (language: Language) => TEXT[language].say.whichMoon
const rings = (language: Language) => TEXT[language].objects.saturn.feature!

/** A quiz screen like Koinot's: the question is on screen and registered for the speaker. */
function Quiz() {
  const language = useSettingsStore((state) => state.language) ?? 'uz'
  const [index, setIndex] = useState(0)
  const question = index === 0 ? moon(language) : rings(language)
  useSpeakable([question])
  return (
    <>
      <p data-testid="question">{question}</p>
      <button type="button" onClick={() => setIndex(1)}>
        next question
      </button>
    </>
  )
}

function Screen({ show = true }: { show?: boolean }) {
  return (
    <MemoryRouter>
      {show ? (
        <LearnShell title="Koinot">
          <Quiz />
        </LearnShell>
      ) : (
        <p>home</p>
      )}
    </MemoryRouter>
  )
}

const speaker = () => screen.getByTestId('learn-speak')
const mascotMood = () => screen.getByTestId('mascot').getAttribute('data-mood')
const press = () => act(() => fireEvent.click(speaker()))
const endCurrent = () =>
  act(() => {
    const howl = playing()[0]!
    howl.playing = false
    howl.options.onend?.()
  })

async function setLanguage(language: Language) {
  await act(async () => {
    useSettingsStore.setState({ language })
    await i18n.changeLanguage(language)
  })
}

describe('speaker button on a learning screen', () => {
  beforeEach(async () => {
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
    useSettingsStore.setState({ volume: 0.8 })
    useFamilyStore.setState({ activeChildId: 'ali' })
    useSubscriptionStore.getState().setDemoPro(true)
    useMascotStore.getState().reset()
    setLearnVoiceOn(false)
    await setLanguage('en')
  })

  afterEach(() => {
    audioManager.stopSpeech()
    vi.restoreAllMocks()
  })

  it.each(['en', 'uz', 'ru'] as const)(
    'PRO (%s): reads the current question in that language; Kiddo talks, then rests',
    async (language) => {
      await setLanguage(language)
      render(<Screen />)
      expect(screen.getByTestId('question').textContent).toBe(moon(language))
      expect(mascotMood()).not.toBe('talk')

      await press()
      await waitFor(() => expect(playing()).toHaveLength(1))
      expect(playing()[0]!.options.src[0]).toBe(url(language, moon(language)))
      expect(speaker().dataset.status).toBe('speaking')
      expect(mascotMood()).toBe('talk')

      await endCurrent()
      await waitFor(() => expect(speaker().dataset.status).toBe('idle'))
      expect(mascotMood()).not.toBe('talk')
    },
  )

  it('after the next question appears, reads the new one and never the old one', async () => {
    render(<Screen />)
    await press()
    await waitFor(() => expect(playing()).toHaveLength(1))

    // the next question stops the old one at once
    await act(() => fireEvent.click(screen.getByText('next question')))
    expect(playing()).toHaveLength(0)
    expect(speaker().dataset.status).toBe('idle')

    await press()
    await waitFor(() => expect(playing()).toHaveLength(1))
    expect(playing()[0]!.options.src[0]).toBe(url('en', rings('en')))
    const oldOnes = voiceHowls().filter((howl) => howl.options.src[0] === url('en', moon('en')))
    expect(oldOnes).toHaveLength(1) // only the first press, never replayed
  })

  it('pressed many times quickly: one voice, restarted cleanly', async () => {
    render(<Screen />)
    for (let i = 0; i < 5; i += 1) {
      await press()
      expect(playing().length).toBeLessThanOrEqual(1)
    }
    await waitFor(() => expect(playing()).toHaveLength(1))
    expect(playing()[0]!.options.src[0]).toBe(url('en', moon('en')))
    expect(voiceHowls().filter((howl) => howl.playing)).toHaveLength(1)
  })

  it('leaving the screen stops the voice and the talking', async () => {
    const view = render(<Screen />)
    await press()
    await waitFor(() => expect(playing()).toHaveLength(1))
    view.rerender(<Screen show={false} />)
    expect(playing()).toHaveLength(0)
    expect(audioManager.getStatus()).toBe('idle')
  })

  it('a language change stops English at once; the next press reads Uzbek', async () => {
    render(<Screen />)
    await press()
    await waitFor(() => expect(playing()).toHaveLength(1))
    await setLanguage('uz')
    expect(playing()).toHaveLength(0)
    expect(screen.getByTestId('question').textContent).toBe(moon('uz'))

    await press()
    await waitFor(() => expect(playing()).toHaveLength(1))
    expect(playing()[0]!.options.src[0]).toBe(url('uz', moon('uz')))
  })

  it('a reaction that started after the reading is not cut off when the question changes', async () => {
    render(<Screen />)
    await press()
    await waitFor(() => expect(playing()).toHaveLength(1))
    // the child answers: the mascot's praise replaces the reading
    const praise = TEXT.en.say.correct[0]!
    void audioManager.say([{ text: praise }], { language: 'en' }, { clipsOnly: true })
    await waitFor(() => expect(playing()[0]?.options.src[0]).not.toBe(url('en', moon('en'))))
    const praiseClip = playing()[0]!.options.src[0]
    // the next question appears while the praise plays
    await act(() => fireEvent.click(screen.getByText('next question')))
    expect(playing()).toHaveLength(1)
    expect(playing()[0]!.options.src[0]).toBe(praiseClip)
  })

  it('a question board inside the page wins over the page’s own text', async () => {
    render(
      <MemoryRouter>
        <LearnShell title="Koinot" speak={[TEXT.en.say.hello]}>
          <Quiz />
        </LearnShell>
      </MemoryRouter>,
    )
    await press()
    await waitFor(() => expect(playing()).toHaveLength(1))
    expect(playing()[0]!.options.src[0]).toBe(url('en', moon('en')))
  })

  it('Free: no sound at all, a calm PRO note for parents in the bubble', async () => {
    useSubscriptionStore.getState().cancel()
    await setLanguage('uz')
    render(<Screen />)
    expect(speaker().dataset.status).toBe('locked')
    await press()
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)))
    expect(voiceHowls()).toHaveLength(0)
    expect(useMascotStore.getState().message?.text).toBe(i18n.t('learn.voiceLocked'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Free cannot get around the lock by calling the voice directly', async () => {
    useSubscriptionStore.getState().cancel()
    expect(
      await audioManager.say([{ text: moon('en') }], { language: 'en' }, { requirePro: true }),
    ).toBe('locked')
    expect(voiceHowls()).toHaveLength(0)
  })
})
