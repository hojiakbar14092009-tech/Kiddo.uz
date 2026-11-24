import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { speech } from '@/services/audio/speech'
import * as synth from '@/services/audio/synth'
import { SpeechUnlock } from './SpeechUnlock'

describe('SpeechUnlock', () => {
  it('opens both the device voice and the audio context on the first touch (iOS)', () => {
    const unlockSpeech = vi.spyOn(speech, 'unlock').mockImplementation(() => undefined)
    const openAudio = vi.spyOn(synth, 'audio').mockReturnValue(null)
    render(<SpeechUnlock />)
    fireEvent.pointerDown(window)
    fireEvent.pointerDown(window)
    expect(unlockSpeech).toHaveBeenCalledTimes(1)
    expect(openAudio).toHaveBeenCalledTimes(1)
    vi.restoreAllMocks()
  })
})
