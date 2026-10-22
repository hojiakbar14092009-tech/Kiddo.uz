import { useCallback, useEffect, useRef, useState } from 'react'
import { useMascot } from '@/features/mascot/useMascot'
import { useLearnVoice } from '@/features/learn/voice'
import type { SpeakOutcome } from '@/services/audio/audioManager'

export type ReaderStatus = 'idle' | 'reading' | 'paused'

interface ReaderState {
  /** The scene this state belongs to; another scene starts idle. */
  key: string
  status: ReaderStatus
  line: number
}

/**
 * Reads a scene aloud line by line (PRO only, and only when the child presses
 * the button – never on its own). The mascot shows each line in its bubble and
 * talks while it is read. Pause keeps the line, so Continue starts again from
 * that line; Replay starts the scene over.
 */
export function useReader(
  lines: readonly string[],
  sceneKey: string,
  onProblem: (outcome: SpeakOutcome | 'off') => void,
) {
  const voice = useLearnVoice()
  const { react } = useMascot()
  const [stored, setStored] = useState<ReaderState>({ key: sceneKey, status: 'idle', line: 0 })
  const state: ReaderState =
    stored.key === sceneKey ? stored : { key: sceneKey, status: 'idle', line: 0 }
  const run = useRef(0)
  const stopVoice = voice.stop

  // a new scene (or leaving): whatever was being read stops
  useEffect(
    () => () => {
      run.current += 1
      stopVoice()
    },
    [sceneKey, stopVoice],
  )

  const readFrom = useCallback(
    async (from: number) => {
      const mine = ++run.current
      for (let index = from; index < lines.length; index += 1) {
        setStored({ key: sceneKey, status: 'reading', line: index })
        react('instruct', { text: lines[index]! }, { speak: false })
        // only recordings are played; a line that cannot be heard is said honestly, not skipped
        const outcome = await voice.speak([lines[index]!], { force: true })
        if (mine !== run.current) return
        if (outcome === 'cancelled') {
          // another voice (the mascot's reaction to a task) took over: keep the place for Continue
          setStored({ key: sceneKey, status: 'paused', line: index })
          return
        }
        if (outcome !== 'done') {
          setStored({ key: sceneKey, status: 'idle', line: 0 })
          onProblem(outcome)
          return
        }
      }
      setStored({ key: sceneKey, status: 'idle', line: 0 })
    },
    [lines, onProblem, react, sceneKey, voice],
  )

  const pause = useCallback(() => {
    run.current += 1
    stopVoice()
    setStored((current) => ({ ...current, status: 'paused' }))
  }, [stopVoice])

  return {
    status: state.status,
    /** The line being read (or where reading paused); -1 when idle. */
    line: state.status === 'idle' ? -1 : state.line,
    start: () => void readFrom(0),
    resume: () => void readFrom(state.line),
    replay: () => void readFrom(0),
    pause,
  }
}
