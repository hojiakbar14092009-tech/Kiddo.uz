import { useCallback, useEffect, useRef, useState } from 'react'
import { canUse, useCanUse } from '@/domain/entitlements'
import { speakLines } from '@/features/learn/voice'
import { audioManager, type SpeakOutcome } from '@/services/audio/audioManager'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * Why the last page could not be heard: 'missing' (no recording of this
 * page in this language), 'error', 'muted' or 'locked' (no PRO).
 */
export type NarrationProblem = Exclude<SpeakOutcome, 'done' | 'cancelled'>

export type NarrationState = 'off' | 'reading' | 'done' | 'problem'

/** How long the finished page stays before an automatic page turn (not a time limit). */
export const AUTO_TURN_MS = 1500

/**
 * "Read to me" (PRO): while it is on, each page is read from its recordings
 * only (`clipsOnly`: never the device's or a remote speech voice), one voice
 * at a time. The Uzbek recordings are, for now, synthesised by a Kazakh Piper
 * model reading transliterated Uzbek (a temporary synthetic voice, said
 * openly next to the button and on the PRO screen) until a real Uzbek voice
 * replaces them (docs/architecture/audio-security.md). Turning the page or leaving stops the voice at once. A
 * page without a recording is reported honestly ('missing'), never faked.
 * With `autoTurn`, the page turns by itself – but only after its narration
 * actually played to the end.
 */
export function useNarration({
  lines,
  pageKey,
  canTurn,
  onTurn,
}: {
  lines: readonly string[]
  /** Changes with every page shown (a new page reads again). */
  pageKey: string
  /** The page has a plain "next" (not a choice or the ending). */
  canTurn: boolean
  onTurn: () => void
}) {
  const allowed = useCanUse('audio')
  const [on, setOn] = useState(false)
  const [autoTurn, setAutoTurn] = useState(false)
  const [result, setResult] = useState<{
    key: string
    state: NarrationState
    problem?: NarrationProblem
  }>({ key: '', state: 'off' })
  const run = useRef(0)
  // read at the moment the narration ends, so changing them never restarts the reading
  const later = useRef({ onTurn, canTurn, autoTurn })
  useEffect(() => {
    later.current = { onTurn, canTurn, autoTurn }
  })
  const linesKey = lines.join('\n')

  // read the page while "Read to me" is on; a new page (or leaving) stops the old voice
  useEffect(() => {
    if (!on) return undefined
    const mine = ++run.current
    let timer: ReturnType<typeof setTimeout> | undefined
    // speakLines checks canUse('audio') right before any sound (and audioManager once more)
    const language = useSettingsStore.getState().language ?? 'uz'
    void speakLines(linesKey.split('\n'), language).then((outcome) => {
      if (mine !== run.current) return
      if (outcome === 'cancelled') {
        setResult({ key: pageKey, state: 'off' })
        return
      }
      if (outcome !== 'done') {
        setResult({ key: pageKey, state: 'problem', problem: outcome })
        return
      }
      setResult({ key: pageKey, state: 'done' })
      if (later.current.autoTurn && later.current.canTurn) {
        timer = setTimeout(() => later.current.onTurn(), AUTO_TURN_MS)
      }
    })
    return () => {
      run.current += 1
      clearTimeout(timer)
      audioManager.stopSpeech()
    }
  }, [linesKey, on, pageKey])

  // the reader goes away: no voice keeps talking
  useEffect(
    () => () => {
      run.current += 1
      audioManager.stopSpeech()
    },
    [],
  )

  const toggle = useCallback(() => {
    if (!canUse('audio')) {
      setOn(false)
      setResult({ key: pageKey, state: 'problem', problem: 'locked' })
      return
    }
    setOn((value) => !value)
  }, [pageKey])

  // this page's outcome; before it arrives the page is being read (or narration is off)
  const current =
    result.key === pageKey
      ? result
      : { key: pageKey, state: on && allowed ? ('reading' as const) : ('off' as const) }
  const state: NarrationState =
    current.state === 'problem' || (on && allowed) ? current.state : 'off'
  return {
    allowed,
    on: on && allowed,
    state,
    problem: current.state === 'problem' ? current.problem : undefined,
    toggle,
    autoTurn,
    setAutoTurn,
  }
}
