import { useEffect } from 'react'
import { speech } from '@/services/audio/speech'
import { audio } from '@/services/audio/synth'

/**
 * Unlocks speech on the first touch so later, automatic speech works on iPad and iPhone: the
 * device voice, and the one audio context (Howler's) that plays recorded and live voice.
 */
export function SpeechUnlock() {
  useEffect(() => {
    const unlock = () => {
      speech.unlock()
      audio()
    }
    window.addEventListener('pointerdown', unlock, { once: true, capture: true })
    return () => window.removeEventListener('pointerdown', unlock, { capture: true })
  }, [])

  return null
}
