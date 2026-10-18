import { useEffect } from 'react'
import { speech } from '@/services/audio/speech'

/** Unlocks speech on the first touch so later, automatic speech works on iPad and iPhone. */
export function SpeechUnlock() {
  useEffect(() => {
    const unlock = () => speech.unlock()
    window.addEventListener('pointerdown', unlock, { once: true, capture: true })
    return () => window.removeEventListener('pointerdown', unlock, { capture: true })
  }, [])

  return null
}
