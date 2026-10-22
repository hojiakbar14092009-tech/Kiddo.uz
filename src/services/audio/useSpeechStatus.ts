import { useSyncExternalStore } from 'react'
import { audioManager, type SpeechStatus } from './audioManager'

/** idle → loading → speaking → idle (or a short error): one status for the whole app. */
export function useSpeechStatus(): SpeechStatus {
  return useSyncExternalStore(
    (listener) => audioManager.subscribe(listener),
    () => audioManager.getStatus(),
    () => 'idle',
  )
}
